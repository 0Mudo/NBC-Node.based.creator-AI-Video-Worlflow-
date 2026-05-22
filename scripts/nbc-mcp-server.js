/**
 * NBC MCP Server — 将 NBC 节点式素材创作器包装为 MCP 协议服务器
 *
 * 让 Trae-Solo / OpenClaw / Claude Desktop 可以通过标准 MCP 协议：
 *   - 从自然语言生成 .nbc.json 工作流文件
 *   - 读取 NBC 事件日志 (nbc_events.jsonl)
 *   - 列出素材库中的媒体文件
 *   - 分析现有工作流并给出优化建议
 *   - 查询画风/运镜/导演预设
 *
 * 用法:
 *   node scripts/nbc-mcp-server.js
 *
 *   然后在 Trae-Solo 的 MCP 配置中添加此脚本。
 *
 * 环境变量（可选）:
 *   NBC_LLM_API_KEY   — LLM API Key（不设则从 NBC ProviderStore 读取）
 *   NBC_LLM_ENDPOINT  — LLM 端点 URL
 *   NBC_LLM_MODEL     — 模型名 (默认: deepseek-chat)
 *   NBC_EVENTS_PATH   — 事件 JSONL 路径 (默认: ~/Documents/NBC素材/nbc_events.jsonl)
 *   NBC_ASSETS_PATH   — 素材库路径 (默认: H:\素材库)
 */

'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const https = require('https')
const http = require('http')
const { spawn } = require('child_process')

// ── Config ──────────────────────────────────────────────────

const CONFIG = {
  llmApiKey:   process.env.NBC_LLM_API_KEY   || '',
  llmEndpoint: process.env.NBC_LLM_ENDPOINT  || 'https://api.deepseek.com/v1/chat/completions',
  llmModel:    process.env.NBC_LLM_MODEL     || 'deepseek-chat',
  eventsPath:  process.env.NBC_EVENTS_PATH   || path.join(os.homedir(), 'Documents', 'NBC素材', 'nbc_events.jsonl'),
  assetsPaths: (process.env.NBC_ASSETS_PATH || 'H:\\素材库').split(';'),
}

// ── MCP Protocol Utilities ───────────────────────────────────

function logStderr(msg) {
  process.stderr.write(`[NBC-MCP] ${msg}\n`)
}

function sendJSON(obj) {
  const line = JSON.stringify(obj)
  process.stdout.write(line + '\n')
}

function readLine() {
  return new Promise((resolve) => {
    let buffer = ''
    const onData = (chunk) => {
      buffer += chunk.toString()
      const nl = buffer.indexOf('\n')
      if (nl >= 0) {
        process.stdin.removeListener('data', onData)
        resolve(buffer.slice(0, nl))
      }
    }
    process.stdin.on('data', onData)
    process.stdin.resume()
  })
}

function parseJSON(str) {
  try { return JSON.parse(str) } catch { return null }
}

let requestIdCounter = 0
function makeId() { return `nbc_${++requestIdCounter}` }

// ── LLM Client ───────────────────────────────────────────────

function llmChat(messages, signal) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: CONFIG.llmModel,
      messages,
      temperature: 0.3,
      max_tokens: 4096,
      stream: false,
    })

    const url = CONFIG.llmEndpoint
    const isHttps = url.startsWith('https')
    const transport = isHttps ? https : http

    const parsed = new URL(url)
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.llmApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    }

    const req = transport.request(options, (res) => {
      let data = ''
      res.on('data', (c) => { data += c })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.error) return reject(new Error(json.error.message || 'LLM error'))
          const content = json.choices?.[0]?.message?.content?.trim()
          if (!content) return reject(new Error('LLM returned empty content'))
          resolve(content)
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('LLM timeout')) })
    req.write(body)
    req.end()
  })
}

// ── NBC Knowledge Base ───────────────────────────────────────

// Inline knowledge — mirrors src/data/*.ts
const ART_STYLES = [
  { key: 'cartoon_3d', name: '卡通3D', desc: '高品质3D卡通动画' },
  { key: 'cg', name: 'CG动画', desc: '次世代PBR渲染，史诗场景' },
  { key: 'realistic', name: '写实', desc: '好莱坞电影级写实摄影' },
  { key: 'anime_jp', name: '日漫', desc: '赛璐璐涂装，2D日式动画' },
  { key: 'anime_cn', name: '国漫', desc: '新国风水墨+数字插画' },
  { key: 'comic_us', name: '美漫', desc: '美式漫画+波普色彩' },
  { key: 'cyberpunk', name: '赛博朋克', desc: '霓虹灯光，高科技低生活' },
  { key: 'noir', name: '黑色电影', desc: '高对比度，Venetian blinds' },
  { key: 'wong_kar_wai', name: '王家卫', desc: 'step-printing，霓虹色彩' },
  { key: 'miyazaki', name: '宫崎骏', desc: '手绘温暖质感，蓝天白云' },
  { key: 'nolan', name: '诺兰史诗', desc: 'IMAX构图，精密几何对称' },
  { key: 'zhang_yimou', name: '张艺谋', desc: '浓郁中国色彩，大型调度' },
]

const SHOT_SIZES    = ['大远景','远景','全景','中景','近景','特写','大特写']
const CAMERA_ANGLES = ['平视','俯拍','仰拍','鸟瞰','荷兰角']
const CAMERA_MOVES  = ['固定','推轨前进','推轨后退','横摇','纵摇','跟拍','手持','斯坦尼康','环绕','摇臂','无人机','POV','快速甩镜','缓慢推进']
const LIGHTING      = ['黄金时刻','蓝调时刻','硬对比','柔漫射','霓虹','烛光','轮廓逆光','伦勃朗光','剪影','体积光','单一光源','阴天漫射']

const DIRECTORS = [
  { key: 'nolan',           name: '诺兰',     genres: ['动作','科幻','惊悚'] },
  { key: 'wong_kar_wai',    name: '王家卫',   genres: ['爱情','文艺'] },
  { key: 'zhang_yimou',     name: '张艺谋',   genres: ['动作','古装','武侠'] },
  { key: 'miyazaki',        name: '宫崎骏',   genres: ['动画','奇幻'] },
  { key: 'spielberg',       name: '斯皮尔伯格', genres: ['动作','科幻','冒险'] },
  { key: 'hitchcock',       name: '希区柯克', genres: ['惊悚','悬疑','心理'] },
  { key: 'villeneuve',      name: '维伦纽瓦', genres: ['科幻','惊悚'] },
  { key: 'tarantino',       name: '塔伦蒂诺', genres: ['动作','犯罪'] },
]

const CHARACTERS = ['蜂医','威龙','疾风','露娜','老太']
const SCENES     = ['巴别塔','潮汐监狱','航天基地','沙漠废墟','都市废墟','冰原基地']

const NODE_TYPES = [
  { type: 'characterCard',  label: '角色卡', needs: ['characterName'] },
  { type: 'sceneCard',      label: '场景卡', needs: ['sceneName'] },
  { type: 'itemCard',       label: '物品卡', needs: ['itemName'] },
  { type: 'prompt',         label: '提示词', needs: ['promptText'] },
  { type: 'script',         label: '剧本',   needs: ['scriptText'] },
  { type: 'storyboard',     label: '分镜',   needs: ['storyboardShotDescription'] },
  { type: 'gptImage2',      label: 'GPT图像', needs: [] },
  { type: 'seedance',       label: 'Seedance', needs: [] },
  { type: 'banana',         label: 'Banana',  needs: [] },
  { type: 'output',         label: '输出',    needs: [] },
  { type: 'assetInput',     label: '素材输入', needs: ['assetId'] },
]

// ── Core Tools ───────────────────────────────────────────────

async function createWorkflow(args) {
  const { intent, format = 'nbc_json', outputPath } = args
  if (!intent) throw new Error('缺少 intent 参数')

  const systemPrompt = buildWorkflowSystemPrompt()

  const reply = await llmChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: intent },
  ])

  const specMatch = reply.match(/<spec>([\s\S]*?)<\/spec>/)
  if (!specMatch) {
    const jsonMatch = reply.match(/\{[\s\S]*"nodes"[\s\S]*"edges"[\s\S]*\}/)
    if (!jsonMatch) throw new Error('LLM did not return a valid workflow spec: ' + reply.slice(0, 300))
    return JSON.parse(jsonMatch[0])
  }

  const spec = JSON.parse(specMatch[1].trim())
  if (!spec.nodes) throw new Error('Workflow spec missing nodes')

  // Assemble full NBC file
  const nbcFile = {
    version: '1.0.0',
    projectName: spec.name || 'AI生成工作流',
    nodes: spec.nodes.map((n, i) => ({
      id: n.id || `node_${i}`,
      type: n.type,
      position: n.position || { x: 100 + i * 320, y: 200 },
      data: {
        label: n.data?.label || n.type,
        ...n.data,
      },
    })),
    edges: spec.edges.map((e, i) => ({
      id: e.id || `edge_${i}`,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || null,
      targetHandle: e.targetHandle || null,
    })),
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodeCount: spec.nodes.length,
      appVersion: '1.0.3-beta.2',
    },
  }

  // Write to file if path specified
  let savedPath = null
  if (outputPath) {
    const outDir = path.dirname(outputPath)
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(outputPath, JSON.stringify(nbcFile, null, 2), 'utf-8')
    savedPath = outputPath
    logStderr(`Workflow written to ${outputPath}`)
  }

  return {
    nbcFile,
    savedPath,
    summary: `生成了「${nbcFile.projectName}」工作流：${spec.nodes.length} 节点, ${spec.edges.length} 连线`,
    nodes: spec.nodes.map(n => `  - ${n.data?.label || n.type} (${n.type})`).join('\n'),
    edges: spec.edges.map(e => `  - ${e.source} → ${e.target}`).join('\n'),
  }
}

async function readEvents(args) {
  const { limit = 20, filter, since } = args

  if (!fs.existsSync(CONFIG.eventsPath)) {
    return { events: [], count: 0, message: '事件文件不存在（NBC 可能尚未启动）' }
  }

  const content = fs.readFileSync(CONFIG.eventsPath, 'utf-8')
  const lines = content.trim().split('\n').filter(Boolean)
  let events = lines.map(parseJSON).filter(Boolean)

  // Filter by action type
  if (filter) {
    events = events.filter(e => e.action && e.action.includes(filter))
  }

  // Filter by timestamp
  if (since) {
    events = events.filter(e => e.timestamp >= since)
  }

  // Take last N
  events = events.slice(-limit)

  return {
    events,
    count: events.length,
    totalLines: lines.length,
    lastEvent: events[events.length - 1] || null,
    summary: events.map(e =>
      `[${e.timestamp?.slice(0,19)||'?'}] ${e.action}: ${e.details?.summary || ''}`
    ).join('\n'),
  }
}

async function listAssets(args) {
  const { path: scanPath, extensions } = args

  const dirs = scanPath ? [scanPath] : CONFIG.assetsPaths
  const exts = (extensions || '.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.mov,.avi').split(',').map(e => e.trim().toLowerCase())

  const results = []
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile() && exts.includes(path.extname(entry.name).toLowerCase())) {
          const fullPath = path.join(dir, entry.name)
          const stat = fs.statSync(fullPath)
          results.push({
            name: entry.name,
            path: fullPath,
            size: stat.size,
            type: ['.mp4','.webm','.mov','.avi'].includes(path.extname(entry.name).toLowerCase()) ? 'video' : 'image',
            createdAt: stat.birthtime.toISOString(),
          })
        }
      }
    } catch (e) {
      results.push({ error: `Cannot read ${dir}: ${e.message}` })
    }
  }

  return {
    assets: results.slice(0, 200),
    count: results.length,
    summary: results.slice(0, 20).map(a => `  - ${a.name} (${a.type || 'unknown'})`).join('\n'),
  }
}

async function analyzeWorkflow(args) {
  const { filePath, nbcJson } = args

  let workflow
  if (filePath && fs.existsSync(filePath)) {
    workflow = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } else if (nbcJson) {
    workflow = typeof nbcJson === 'string' ? JSON.parse(nbcJson) : nbcJson
  } else {
    throw new Error('需要提供 filePath 或 nbcJson')
  }

  const { nodes, edges } = workflow
  const issues = []
  const suggestions = []

  // Check for unconnected nodes
  const connected = new Set()
  edges.forEach(e => { connected.add(e.source); connected.add(e.target) })
  nodes.forEach(n => {
    if (!connected.has(n.id)) issues.push(`未连接节点: ${n.data?.label || n.id} (${n.type})`)
  })

  // Check for missing output nodes
  const genTypes = ['gptImage2', 'seedance', 'banana']
  const hasGen = nodes.some(n => genTypes.includes(n.type))
  const hasOutput = nodes.some(n => n.type === 'output')
  if (hasGen && !hasOutput) issues.push('有生成节点但没有输出节点（结果不会自动保存）')

  // Check for prompt nodes without connections
  const prompts = nodes.filter(n => n.type === 'prompt')
  const promptConnected = prompts.filter(p => edges.some(e => e.target === p.id || e.source === p.id))
  if (promptConnected.length < prompts.length) {
    issues.push(`${prompts.length - promptConnected.length} 个提示词节点未连线`)
  }

  // Suggestions
  if (nodes.length >= 3 && !nodes.some(n => n.type === 'output')) {
    suggestions.push('建议添加 output 节点以实现自动保存')
  }
  if (nodes.some(n => n.type === 'characterCard') && nodes.some(n => n.type === 'sceneCard') && !nodes.some(n => n.type === 'prompt')) {
    suggestions.push('角色卡+场景卡已就绪，建议添加 prompt 节点进行组合')
  }
  if (!nodes.some(n => n.type === 'seedance') && !nodes.some(n => n.type === 'gptImage2') && nodes.length >= 3) {
    suggestions.push('工作流看起来只有数据节点，缺少生成节点（gptImage2/seedance）')
  }

  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodeTypes: [...new Set(nodes.map(n => n.type))],
    issues,
    suggestions,
    score: Math.max(0, 100 - issues.length * 15 - suggestions.length * 5),
    summary: [
      `节点: ${nodes.length} | 连线: ${edges.length}`,
      `类型: ${[...new Set(nodes.map(n => n.type))].join(', ')}`,
      ...(issues.length ? ['\n⚠️ 问题:'] : []),
      ...issues.map(i => `  - ${i}`),
      ...(suggestions.length ? ['\n💡 建议:'] : []),
      ...suggestions.map(s => `  - ${s}`),
    ].join('\n'),
  }
}

function getStylePresets() {
  return {
    artStyles: ART_STYLES,
    shotSizes: SHOT_SIZES,
    cameraAngles: CAMERA_ANGLES,
    cameraMoves: CAMERA_MOVES,
    lighting: LIGHTING,
    directors: DIRECTORS,
    characters: CHARACTERS,
    scenes: SCENES,
    nodeTypes: NODE_TYPES.map(t => ({ type: t.type, label: t.label, needs: t.needs })),
  }
}

// ── Workflow System Prompt ───────────────────────────────────

function buildWorkflowSystemPrompt() {
  return `你是 NBC（节点式素材创作器）的 AI 编排器。你根据用户意图生成 JSON 工作流规格。

## 可用节点类型
${NODE_TYPES.map(t => `- **${t.type}** (${t.label}): ${t.needs.length ? '需要 ' + t.needs.join(', ') : '无必需参数'}`).join('\n')}

## 可用角色
${CHARACTERS.join('、')}

## 可用场景
${SCENES.join('、')}

## 可用画风
${ART_STYLES.map(s => `- **${s.name}** (${s.key}): ${s.desc}`).join('\n')}

## 连线规则
- 生成节点(gptImage2/seedance/banana)的输出必须连到 output
- characterCard/sceneCard/itemCard 输出到 prompt 或直接到生成节点
- prompt 输出到生成节点
- script 输出到 storyboard 或 prompt
- output 是终点，必须连接所有生成节点

## 典型工作流
1. 角色图生成: characterCard → prompt → gptImage2 → output
2. 场景图生成: sceneCard → prompt → gptImage2 → output
3. 角色+场景合成: characterCard + sceneCard → prompt → gptImage2 → output
4. 视频生成: script → prompt → seedance → output
5. 完整管线: characterCard+sceneCard → prompt → seedance → output

## 输出格式
返回 JSON 放在 <spec></spec> 标签中：
<spec>
{
  "name": "工作流名称",
  "description": "简短描述",
  "nodes": [
    { "id": "node_1", "type": "characterCard", "position": {"x":100,"y":200},
      "data": { "label": "角色名", "characterName": "角色名" } },
    { "id": "node_2", "type": "prompt", "position": {"x":400,"y":200},
      "data": { "label": "提示词", "promptText": "生成一张..." } },
    { "id": "node_3", "type": "gptImage2", "position": {"x":700,"y":200},
      "data": { "label": "GPT图像生成" } },
    { "id": "node_4", "type": "output", "position": {"x":1000,"y":200},
      "data": { "label": "输出" } }
  ],
  "edges": [
    { "id": "edge_1", "source": "node_1", "target": "node_2" },
    { "id": "edge_2", "source": "node_2", "target": "node_3" },
    { "id": "edge_3", "source": "node_3", "target": "node_4" }
  ]
}
</spec>

## 规则
- 所有生成节点的输出都要连接到 output
- position.x 从左到右排列，间隔约 300px
- position.y 从上到下排列，间隔约 180px
- promptText 使用 {{节点label}} 引用上游节点
- 角色名从可用角色列表中选取
- 场景名从可用场景列表中选取
- 如果用户提到了画风，在节点的 data 中添加 artStyleKey 字段
- 只返回 <spec>...</spec>，不要有其他内容`
}

// ── Tool Dispatch ────────────────────────────────────────────

const TOOLS = [
  {
    name: 'nbc_create_workflow',
    description: '根据自然语言描述生成 NBC 节点工作流。用户说"帮我生成XX角色在XX场景的视频"时使用。返回可导入 .nbc.json 文件和摘要。',
    inputSchema: {
      type: 'object',
      properties: {
        intent:        { type: 'string', description: '用户的自然语言意图描述' },
        format:        { type: 'string', description: '输出格式 (nbc_json)' },
        outputPath:    { type: 'string', description: '输出文件路径（可选），如 H:\\素材库\\workflows\\战斗场景.nbc.json' },
      },
      required: ['intent'],
    },
    execute: createWorkflow,
  },
  {
    name: 'nbc_read_events',
    description: '读取 NBC 操作事件日志。用于监控生成进度、检查工作流状态。',
    inputSchema: {
      type: 'object',
      properties: {
        limit:  { type: 'number', description: '返回最近 N 条事件（默认 20）' },
        filter: { type: 'string', description: '按事件类型过滤，如 generation:complete' },
        since:  { type: 'string', description: '只返回此时间之后的事件（ISO 8601）' },
      },
    },
    execute: readEvents,
  },
  {
    name: 'nbc_list_assets',
    description: '列出素材库中的媒体文件。用于了解当前有哪些可用素材。',
    inputSchema: {
      type: 'object',
      properties: {
        path:       { type: 'string', description: '素材目录路径（默认从配置读取）' },
        extensions: { type: 'string', description: '文件扩展名过滤，逗号分隔（默认图片+视频）' },
      },
    },
    execute: listAssets,
  },
  {
    name: 'nbc_analyze_workflow',
    description: '分析现有工作流 (.nbc.json)，找出问题和优化建议。',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: '.nbc.json 文件路径' },
        nbcJson:  { type: 'object', description: '直接提供 JSON 内容（不读文件）' },
      },
    },
    execute: analyzeWorkflow,
  },
  {
    name: 'nbc_get_style_presets',
    description: '获取 NBC 中可用的画风预设、摄影技法、导演风格、角色和场景列表。',
    inputSchema: { type: 'object', properties: {} },
    execute: getStylePresets,
  },
]

async function handleToolCall(id, name, args) {
  const tool = TOOLS.find(t => t.name === name)
  if (!tool) throw new Error(`Unknown tool: ${name}`)
  try {
    const result = await tool.execute(args || {})
    const text = typeof result === 'string' ? result
      : result.summary ? `${result.summary}\n\n${JSON.stringify(result, null, 2)}`
      : JSON.stringify(result, null, 2)
    return {
      content: [{ type: 'text', text }],
    }
  } catch (e) {
    return {
      content: [{ type: 'text', text: `❌ Error: ${e.message}` }],
      isError: true,
    }
  }
}

// ── MCP Protocol Handler ─────────────────────────────────────

async function handleRequest(request) {
  const { jsonrpc, id, method, params } = request

  try {
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0', id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'nbc-mcp-server', version: '1.0.0' },
          },
        }

      case 'notifications/initialized':
        return null // no response for notifications

      case 'tools/list':
        return {
          jsonrpc: '2.0', id,
          result: { tools: TOOLS.map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          }))},
        }

      case 'tools/call':
        const callResult = await handleToolCall(id, params.name, params.arguments)
        return { jsonrpc: '2.0', id, result: callResult }

      case 'ping':
        return { jsonrpc: '2.0', id, result: {} }

      default:
        return {
          jsonrpc: '2.0', id,
          error: { code: -32601, message: `Method not found: ${method}` },
        }
    }
  } catch (e) {
    return {
      jsonrpc: '2.0', id,
      error: { code: -32603, message: e.message },
    }
  }
}

// ── Main Loop ─────────────────────────────────────────────────

async function main() {
  logStderr('NBC MCP Server starting...')
  logStderr(`Events path: ${CONFIG.eventsPath}`)
  logStderr(`Assets paths: ${CONFIG.assetsPaths.join(', ')}`)

  if (CONFIG.llmApiKey) {
    logStderr(`LLM: ${CONFIG.llmModel} @ ${CONFIG.llmEndpoint}`)
  } else {
    logStderr('WARNING: NBC_LLM_API_KEY not set. Workflow creation will fail.')
  }

  let buffer = ''
  process.stdin.setEncoding('utf-8')

  process.stdin.on('data', async (chunk) => {
    buffer += chunk
    while (true) {
      const nl = buffer.indexOf('\n')
      if (nl < 0) break
      const line = buffer.slice(0, nl)
      buffer = buffer.slice(nl + 1)

      if (!line.trim()) continue
      const request = parseJSON(line)
      if (!request) { logStderr(`Invalid JSON: ${line.slice(0, 100)}`); continue }

      const response = await handleRequest(request)
      if (response !== null) sendJSON(response)
    }
  })

  process.stdin.on('end', () => {
    logStderr('stdin closed, exiting')
    process.exit(0)
  })

  process.on('SIGTERM', () => process.exit(0))
  process.on('SIGINT', () => process.exit(0))
}

main().catch(e => {
  logStderr(`Fatal: ${e.message}`)
  process.exit(1)
})
