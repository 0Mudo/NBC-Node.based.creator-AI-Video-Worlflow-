/**
 * NBC 飞书多维表格同步核心逻辑
 * 由主进程 IPC handler 和独立脚本 scripts/feishu-sync.js 共用
 */
import fs from 'fs'
import path from 'path'
import os from 'os'

export interface FeishuSyncConfig {
  feishuAppId: string
  feishuAppSecret: string
  bitableAppToken: string
  bitableTableId: string
  nbcDir?: string
  allowedActions?: string[]
  fieldNames?: Record<string, string>
  batchSize?: number
}

export interface SyncResult {
  synced: number
  skipped: number
  error?: string
  cursorLine: number
}

const DEFAULT_FIELD_NAMES = {
  primary: '文本',
  eventType: '事件类型',
  nodeName: '节点名称',
  status: '状态',
  details: '详细信息',
  operator: '操作人',
}

async function getTenantAccessToken(appId: string, appSecret: string): Promise<string> {
  const url = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal'
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  })
  const data = await res.json() as any
  if (data.code !== 0) {
    throw new Error(`获取 Token 失败: ${data.msg} (错误码: ${data.code})`)
  }
  return data.tenant_access_token
}

async function batchInsertRecords(
  token: string,
  bitableAppToken: string,
  bitableTableId: string,
  records: any[],
): Promise<any> {
  if (records.length === 0) return
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${bitableAppToken}/tables/${bitableTableId}/records/batch_create`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ records }),
  })
  const data = await res.json() as any
  if (data.code !== 0) {
    throw new Error(`批量插入记录失败: ${data.msg} (错误码: ${data.code})`)
  }
  return data.data
}

function getCursor(cursorFile: string): number {
  if (!fs.existsSync(cursorFile)) return 0
  const content = fs.readFileSync(cursorFile, 'utf-8').trim()
  return parseInt(content, 10) || 0
}

function setCursor(cursorFile: string, lineNum: number): void {
  fs.writeFileSync(cursorFile, lineNum.toString(), 'utf-8')
}

function mapEventToRecord(event: any, fieldNames: Record<string, string>): any {
  const F = fieldNames

  let details = event.details?.summary || ''
  if (event.action === 'generation:complete' && event.details?.resultFile) {
    details += `\n文件: ${event.details.resultFile}`
  }
  if (event.action === 'generation:fail' && event.details?.error) {
    details += `\n错误: ${event.details.error}`
  }
  if (event.details?.generationParams) {
    details += `\n参数: ${JSON.stringify(event.details.generationParams)}`
  }

  const operator = event.operatorName || '未知'
  details += `\n操作人: ${operator}`

  let status = 'info'
  if (event.action.includes('complete')) status = 'success'
  if (event.action.includes('fail')) status = 'error'
  if (event.action.includes('start')) status = 'running'

  return {
    fields: {
      [F.primary]: `[${new Date(event.timestamp).toLocaleString()}] ${event.projectName || '全局'}`,
      [F.eventType]: event.action,
      [F.nodeName]: event.details?.nodeLabel || '-',
      [F.status]: status,
      [F.details]: details.trim(),
      [F.operator]: operator,
    },
  }
}

export async function runFeishuSync(config: FeishuSyncConfig): Promise<SyncResult> {
  const nbcDir = config.nbcDir || path.join(os.homedir(), 'Documents', 'NBC素材')
  const eventFile = path.join(nbcDir, 'nbc_events.jsonl')
  const cursorFile = path.join(nbcDir, 'nbc_events.cursor')
  const allowedActions = config.allowedActions || [
    'project:create', 'generation:start', 'generation:complete', 'generation:fail',
  ]
  const fieldNames = { ...DEFAULT_FIELD_NAMES, ...(config.fieldNames || {}) }
  const batchSize = config.batchSize || 100

  if (!fs.existsSync(eventFile)) {
    return { synced: 0, skipped: 0, cursorLine: 0 }
  }

  const cursor = getCursor(cursorFile)
  const newRecords: any[] = []
  let skippedCount = 0
  let currentLineNum = 0

  const content = fs.readFileSync(eventFile, 'utf-8')
  const lines = content.split(/\r?\n/)

  for (const line of lines) {
    currentLineNum++
    if (currentLineNum <= cursor) continue

    try {
      if (!line.trim()) continue
      const event = JSON.parse(line)
      if (!allowedActions.includes(event.action)) { skippedCount++; continue }
      newRecords.push(mapEventToRecord(event, fieldNames))
    } catch (e: any) {
      console.warn(`feishu-sync: 解析第 ${currentLineNum} 行失败: ${e.message}`)
    }
  }

  if (newRecords.length === 0) {
    return { synced: 0, skipped: skippedCount, cursorLine: currentLineNum }
  }

  const token = await getTenantAccessToken(config.feishuAppId, config.feishuAppSecret)

  for (let i = 0; i < newRecords.length; i += batchSize) {
    const batch = newRecords.slice(i, i + batchSize)
    await batchInsertRecords(token, config.bitableAppToken, config.bitableTableId, batch)
  }

  setCursor(cursorFile, currentLineNum)

  return { synced: newRecords.length, skipped: skippedCount, cursorLine: currentLineNum }
}
