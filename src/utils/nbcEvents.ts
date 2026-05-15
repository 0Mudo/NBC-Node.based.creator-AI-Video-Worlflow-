/**
 * NBC 事件发射器
 * 
 * 用法：
 *   import { emitNBCEvent } from '@/utils/nbcEvents'
 *   emitNBCEvent('project:create', '项目创建', { summary: '创建了新项目「测试」' })
 * 
 * 自动检测运行环境：
 *   - Electron: IPC → 主进程 → nbc_events.jsonl
 *   - 浏览器: localStorage 队列 (dev fallback)
 * 
 * 防抖：相同项目+相同 action 在 2 秒内只记录一次
 */
import type { NBCEvent, NBCEventAction, NBCEventDetails } from '@/types/events'
import { useProjectStore } from '@/store/useProjectStore'

const DEBOUNCE_MS = 2000
const BROWSER_QUEUE_KEY = 'nbc_event_queue'

// 防抖追踪: key = "projectId:action", value = last emit timestamp
const debounceTracker = new Map<string, number>()

export function emitNBCEvent(
  action: NBCEventAction,
  projectId: string | undefined,
  details: NBCEventDetails,
  debounce = true
) {
  const project = projectId
    ? useProjectStore.getState().projects.find((p) => p.id === projectId)
    : null

  const operatorName = localStorage.getItem('nbc_operator_name') || '未知'

  // 防抖检查
  if (debounce) {
    const key = `${projectId || 'global'}:${action}`
    const last = debounceTracker.get(key)
    if (last && Date.now() - last < DEBOUNCE_MS) return
    debounceTracker.set(key, Date.now())
  }

  const event: NBCEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    action,
    operatorName,
    projectId,
    projectName: project?.name,
    details,
    synced: false,
  }

  // Electron 模式：通过 IPC 发送给主进程写入文件
  if (window.electronAPI?.logEvent) {
    window.electronAPI.logEvent(JSON.stringify(event))
  } else {
    // 浏览器模式：localStorage 队列（dev fallback）
    fallbackBrowserLog(event)
  }
}

function fallbackBrowserLog(event: NBCEvent) {
  try {
    const raw = localStorage.getItem(BROWSER_QUEUE_KEY) || '[]'
    const queue: NBCEvent[] = JSON.parse(raw)
    queue.push(event)
    // 只保留最近 500 条避免爆 localStorage
    if (queue.length > 500) queue.splice(0, queue.length - 500)
    localStorage.setItem(BROWSER_QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // localStorage 满了就清掉重来
    try { localStorage.setItem(BROWSER_QUEUE_KEY, JSON.stringify([event])) } catch {}
  }
}

/**
 * 获取浏览器模式下的所有未同步事件（仅供 Agent 在 dev 模式使用）
 */
export function getBrowserEvents(): NBCEvent[] {
  try {
    return JSON.parse(localStorage.getItem(BROWSER_QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

/**
 * 标记浏览器事件为已同步
 */
export function markBrowserEventsSynced(ids: string[]) {
  try {
    const raw = localStorage.getItem(BROWSER_QUEUE_KEY) || '[]'
    const queue: NBCEvent[] = JSON.parse(raw)
    const updated = queue.map((e) => ids.includes(e.id) ? { ...e, synced: true } : e)
    // 清理已同步的旧事件（保留最近 50 条已同步的，用于调试）
    const unsynced = updated.filter((e) => !e.synced)
    const synced = updated.filter((e) => e.synced).slice(-50)
    localStorage.setItem(BROWSER_QUEUE_KEY, JSON.stringify([...unsynced, ...synced]))
  } catch {}
}
