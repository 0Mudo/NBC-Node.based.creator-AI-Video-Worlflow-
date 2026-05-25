import { app, BrowserWindow, ipcMain, dialog, net, protocol, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import OSS from 'ali-oss'
import { runFeishuSync, type FeishuSyncConfig } from './feishuSync'

let mainWindow: BrowserWindow | null = null
let pendingDeepLink: string | null = null

function sendDeepLink(url: string) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('deep-link', url)
  } else {
    pendingDeepLink = url
  }
}

// --- MUST be before app.whenReady ---
protocol.registerSchemesAsPrivileged([
  { scheme: 'nbc', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
])

function serveFile(filePath: string): Response {
  const ext = path.extname(filePath).toLowerCase()
  const mimeMap: Record<string, string> = {
    '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
    '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
  }
  try {
    const content = fs.readFileSync(filePath)
    return new Response(content, { headers: { 'Content-Type': mimeMap[ext] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' } })
  } catch {
    return new Response('Not Found', { status: 404 })
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1000, minHeight: 600,
    title: 'NBC · 节点式素材创作器',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    backgroundColor: '#1a1a2e',
  })

  mainWindow.once('ready-to-show', () => {
    if (pendingDeepLink) {
      mainWindow?.webContents.send('deep-link', pendingDeepLink)
      pendingDeepLink = null
    }
  })

  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingDeepLink) {
      mainWindow?.webContents.send('deep-link', pendingDeepLink)
      pendingDeepLink = null
    }
  })

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    mainWindow.loadURL(devUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadURL('nbc://-/index.html')
  }

  // Intercept close to notify renderer for auto-save
  mainWindow.on('close', (e) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Send IPC message to renderer
      mainWindow.webContents.send('app-closing')
      // Prevent immediate close
      e.preventDefault()
      
      // Force close after 2 seconds if renderer is stuck
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.destroy()
        }
      }, 2000)
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// Parse nbc:// deep links
// nbc://import?url=https://oss.example.com/workflow.nbc.json
// nbc://template?id=character-scene-basic
function parseDeepLink(url: string): { action: string; params: Record<string, string> } {
  try {
    const u = new URL(url)
    const action = u.hostname || u.pathname.replace(/^\//, '')
    const params: Record<string, string> = {}
    u.searchParams.forEach((v, k) => { params[k] = v })
    return { action, params }
  } catch {
    return { action: '', params: {} }
  }
}

// Handle nbc:// protocol on macOS/Linux
function handleArgv(argv: string[]) {
  const nbcUrl = argv.find((arg) => arg.startsWith('nbc://'))
  if (nbcUrl) sendDeepLink(nbcUrl)
}

// --- Single Instance Lock ---
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
    handleArgv(argv)
  })
}

app.whenReady().then(() => {
  const distDir = path.join(__dirname, '../dist')

  // Handle nbc:// protocol to serve local files with proper MIME + CORS
  protocol.handle('nbc', (request) => {
    const url = request.url

    // Deep link: nbc://import?url=xxx or nbc://template?id=xxx
    if (url.includes('import') || url.includes('template')) {
      sendDeepLink(url)
      // Return a simple response to avoid error
      return new Response('OK', { headers: { 'Content-Type': 'text/plain' } })
    }

    let u = new URL(url)

    // Handle local asset serving via nbc://assets/...
    if (u.hostname === 'assets') {
      const targetPath = u.searchParams.get('path')
      if (targetPath && fs.existsSync(targetPath)) {
        return serveFile(targetPath)
      }
    }

    // Local file serving for the dist directory
    let urlPath = u.pathname

    
    // Fallback for nbc://assets/index.js -> hostname is 'assets'
    if (u.hostname && u.hostname !== '-' && u.hostname !== 'localhost') {
      urlPath = '/' + u.hostname + urlPath
    }
    
    if (urlPath === '/' || urlPath === '') urlPath = '/index.html'
    return serveFile(path.join(distDir, urlPath))
  })

  createWindow()
  handleArgv(process.argv)
})

// --- IPC: Deep Link ---
ipcMain.on('deep-link:register', () => {
  if (pendingDeepLink) {
    mainWindow?.webContents.send('deep-link', pendingDeepLink)
    pendingDeepLink = null
  }
})

// --- IPC: File System ---
ipcMain.handle('dialog:openDirectory', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('fs:scanDirectory', async (_, dirPath: string) => {
  try {
    return fs.readdirSync(dirPath).filter(f => ['.png','.jpg','.jpeg','.gif','.webp','.mp4','.webm','.mov','.avi'].includes(path.extname(f).toLowerCase())).map(f => {
      const fp = path.join(dirPath, f); const st = fs.statSync(fp)
      const ext = path.extname(f).toLowerCase(); const isV = ['.mp4','.webm','.mov','.avi'].includes(ext)
      const isImage = ['.png','.jpg','.jpeg','.gif','.webp'].includes(ext)
      const fileUrl = `nbc://assets/${encodeURIComponent(f)}?path=${encodeURIComponent(fp)}`
      return {
        id: fp, name: f,
        type: (f.toLowerCase().includes('pano')||f.toLowerCase().includes('360'))?'panorama':isV?'video':'image',
        path: fileUrl,
        thumbnailPath: isImage ? fileUrl : undefined,
        size: st.size, createdAt: st.birthtime.toISOString(), tags: ['本地']
      }
    })
  } catch { return [] }
})

ipcMain.handle('fs:readFile', async (_, filePath: string) => {
  try {
    const d = fs.readFileSync(filePath); const m: Record<string,string>={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime','.avi':'video/x-msvideo'}
    return { data: d.toString('base64'), mimeType: m[path.extname(filePath).toLowerCase()]||'application/octet-stream' }
  } catch { return null }
})

// --- IPC: API Proxy ---
ipcMain.handle('api:fetch', async (_, req: { url: string; method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number }) => {
  return new Promise((resolve, reject) => {
    const r = net.request({ method: req.method||'GET', url: req.url })
    if (req.headers) for (const [k,v] of Object.entries(req.headers)) r.setHeader(k,v)
    const timeoutMs = req.timeoutMs || 120000
    const t = setTimeout(()=>{r.abort();reject(new Error(`请求超时 (${Math.round(timeoutMs/1000)}秒)，服务器未响应`))}, timeoutMs)
    r.on('response', resp => { clearTimeout(t); const c: Buffer[]=[]; resp.on('data',chunk=>c.push(chunk as Buffer)); resp.on('end',()=>resolve({status:resp.statusCode,statusText:resp.statusMessage,headers:resp.headers,body:Buffer.concat(c).toString('utf-8')})) })
    r.on('error',e=>{
      clearTimeout(t)
      let msg = e.message || String(e)
      if (msg.includes('ERR_TIMED_OUT') || msg.includes('ERR_CONNECTION_TIMED_OUT')) {
        msg = `网络连接超时：无法连接到服务器\n请检查：\n1. 网络连接是否正常\n2. API 服务地址是否正确: ${req.url}\n3. 是否需要配置代理/VPN`
      } else if (msg.includes('ERR_NAME_NOT_RESOLVED')) {
        msg = `DNS 解析失败：无法找到服务器\n请检查 API 服务地址是否正确: ${req.url}`
      } else if (msg.includes('ERR_CONNECTION_REFUSED')) {
        msg = `连接被拒绝：服务器拒绝连接\n请检查 API 服务是否正在运行: ${req.url}`
      } else if (msg.includes('ERR_CERT') || msg.includes('ERR_SSL')) {
        msg = `SSL 证书验证失败\n请检查：1. 系统时间是否正确\n2. 证书是否有效\n原始错误: ${msg}`
      }
      reject(new Error(msg))
    })
    if (req.body) r.write(req.body); r.end()
  })
})

ipcMain.handle('api:downloadBase64', async (_, url: string) => {
  return new Promise((resolve, reject) => {
    const r = net.request(url)
    r.on('response', resp => {
      // 301 or 302 redirect
      if (resp.statusCode && resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        let redirectUrl = resp.headers.location as string;
        if (Array.isArray(redirectUrl)) {
          redirectUrl = redirectUrl[0];
        }
        
        const redirectReq = net.request(redirectUrl);
        redirectReq.on('response', redirectResp => {
          if (redirectResp.statusCode !== 200) return reject(new Error(`Failed to download after redirect: ${redirectResp.statusCode}`))
          const chunks: Buffer[] = []
          redirectResp.on('data', chunk => chunks.push(chunk as Buffer))
          redirectResp.on('end', () => resolve(Buffer.concat(chunks).toString('base64')))
        })
        redirectReq.on('error', reject)
        redirectReq.end()
        return
      }

      if (resp.statusCode !== 200) return reject(new Error(`Failed to download: ${resp.statusCode}`))
      const chunks: Buffer[] = []
      resp.on('data', chunk => chunks.push(chunk as Buffer))
      resp.on('end', () => resolve(Buffer.concat(chunks).toString('base64')))
    })
    r.on('error', reject)
    r.end()
  })
})

// --- IPC: Chat (deprecated, kept for compatibility) ---
ipcMain.handle('chat:send', async (_, message: string) => {
  try {
    return await new Promise<string>((resolve, reject) => {
      const r = net.request({ method:'POST', url:'http://127.0.0.1:18789/api/chat' })
      r.setHeader('Content-Type','application/json')
      const c: Buffer[]=[]
      r.on('response', resp => { resp.on('data',chunk=>c.push(chunk as Buffer)); resp.on('end',()=>resolve(Buffer.concat(c).toString('utf-8'))) })
      r.on('error', reject)
      r.write(JSON.stringify({ message, channel:'webchat' }))
      r.end()
      setTimeout(()=>reject(new Error('Chat timeout')), 30000)
    })
  } catch(e: any) { return JSON.stringify({ error: e.message }) }
})

// --- IPC: App Lifecycle ---
ipcMain.on('app-close-confirmed', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy()
  }
})

// --- IPC: Event Logging for Agent Sync ---
ipcMain.handle('event:log', async (_, eventJson: string) => {
  try {
    const queueDir = path.join(app.getPath('documents'), 'NBC素材')
    if (!fs.existsSync(queueDir)) fs.mkdirSync(queueDir, { recursive: true })
    const eventFile = path.join(queueDir, 'nbc_events.jsonl')
    // Validate JSON before writing
    const event = JSON.parse(eventJson)
    if (!event.id || !event.action || !event.timestamp) {
      return 'invalid'
    }
    const line = JSON.stringify(event) + String.fromCharCode(10)
    fs.appendFileSync(eventFile, line)
    return 'logged'
  } catch (e: any) {
    console.error('event:log error:', e.message)
    return null
  }
})

// --- IPC: Save ---
ipcMain.handle('save:local', async (_, filename: string, base64Data: string, dir?: string) => {
  try {
    const outDir = dir || 'H:\\素材库'
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
    const filePath = path.join(outDir, filename)
    const base64 = base64Data.replace(/^data:.*?;base64,/, '')
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'))
    return filePath
  } catch (e: any) { return null }
})

ipcMain.handle('save:oss', async (_, config: any, filename: string, base64Data: string) => {
  try {
    const stagingDir = path.join(app.getPath('documents'), 'NBC素材', 'staging')
    if (!fs.existsSync(stagingDir)) fs.mkdirSync(stagingDir, { recursive: true })
    const filePath = path.join(stagingDir, filename)
    const buffer = Buffer.from(base64Data, 'base64')
    fs.writeFileSync(filePath, buffer)
    const datePrefix = new Date().toISOString().slice(0, 10)
    const ossKey = `generated/${datePrefix}/${filename}`

    if (!config?.accessKeyId || !config?.accessKeySecret || !config?.bucket) {
      return JSON.stringify({ error: '未配置 OSS AccessKey/Bucket，请在设置中填写', staging: filePath })
    }

    const ext = path.extname(filename).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.gif': 'image/gif', '.webp': 'image/webp', '.mp4': 'video/mp4',
      '.webm': 'video/webm', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
    }
    const mime = mimeMap[ext] || 'application/octet-stream'

    const client = new OSS({
      endpoint: config.region
        ? `https://${config.region}.aliyuncs.com`
        : 'https://oss-cn-shenzhen.aliyuncs.com',
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      bucket: config.bucket,
      secure: true,
    })

    const result = await client.put(ossKey, filePath, { mime })
    return JSON.stringify({ staging: filePath, expectedUrl: result.url, ossKey })
  } catch (e: any) {
    console.error('OSS upload error:', e)
    return JSON.stringify({ error: e.message || 'OSS 上传失败', code: e.code, staging: '' })
  }
})

function createOSSClient(config: any) {
  return new OSS({
    endpoint: config.region
      ? `https://${config.region}.aliyuncs.com`
      : 'https://oss-cn-shenzhen.aliyuncs.com',
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    bucket: config.bucket,
    secure: true,
  })
}

ipcMain.handle('oss:list', async (_, config: any, prefix: string) => {
  try {
    if (!config?.accessKeyId || !config?.accessKeySecret || !config?.bucket) return []
    const client = createOSSClient(config)
    const result = await client.list({ prefix, 'max-keys': 100 }, {})
    return (result.objects || []).map((obj: any) => ({
      name: path.basename(obj.name),
      url: client.signatureUrl(obj.name, { expires: 3600 }),
      size: obj.size,
      lastModified: obj.lastModified,
      key: obj.name
    }))
  } catch (e: any) {
    console.error('OSS list error:', e)
    return []
  }
})

ipcMain.handle('oss:delete', async (_, config: any, key: string) => {
  try {
    if (!key.startsWith('generated/')) {
      return JSON.stringify({ success: false, error: '安全限制：仅允许删除 generated/ 目录下的文件' })
    }
    if (!config?.accessKeyId || !config?.accessKeySecret || !config?.bucket) {
      return JSON.stringify({ success: false, error: '未配置 OSS AccessKey/Bucket' })
    }
    const client = createOSSClient(config)
    await client.delete(key)
    return JSON.stringify({ success: true })
  } catch (e: any) {
    console.error('OSS delete error:', e)
    return JSON.stringify({ success: false, error: e.message || 'OSS 删除失败' })
  }
})

ipcMain.handle('oss:deleteMulti', async (_, config: any, keys: string[]) => {
  try {
    const invalid = keys.filter(k => !k.startsWith('generated/'))
    if (invalid.length > 0) {
      return JSON.stringify({ success: false, error: `安全限制：以下 key 不在 generated/ 目录下: ${invalid.slice(0, 3).join(', ')}` })
    }
    if (!config?.accessKeyId || !config?.accessKeySecret || !config?.bucket) {
      return JSON.stringify({ success: false, error: '未配置 OSS AccessKey/Bucket' })
    }
    const client = createOSSClient(config)
    const result = await client.deleteMulti(keys, { quiet: false })
    const deleted = (result.deleted || []).map((d: any) => d.Key || d.key)
    return JSON.stringify({ success: true, deleted })
  } catch (e: any) {
    console.error('OSS deleteMulti error:', e)
    return JSON.stringify({ success: false, error: e.message || 'OSS 批量删除失败' })
  }
})

ipcMain.handle('oss:setMeta', async (_, config: any, key: string, meta: Record<string, string>) => {
  try {
    if (!config?.accessKeyId || !config?.accessKeySecret || !config?.bucket) {
      return JSON.stringify({ success: false, error: '未配置 OSS AccessKey/Bucket' })
    }
    const client = createOSSClient(config)
    const headers: Record<string, string> = {}
    for (const [k, v] of Object.entries(meta)) {
      headers[`x-oss-meta-${k}`] = v
    }
    await client.copy(key, key, { headers })
    return JSON.stringify({ success: true })
  } catch (e: any) {
    console.error('OSS setMeta error:', e)
    return JSON.stringify({ success: false, error: e.message || 'OSS 元数据更新失败' })
  }
})

// --- OSS: list prefixes (directory tree) ---
ipcMain.handle('oss:listPrefixes', async (_, config: any, prefix: string) => {
  try {
    if (!config?.accessKeyId || !config?.accessKeySecret || !config?.bucket) return []
    const client = createOSSClient(config)
    const result = await client.list({ prefix: prefix || '', delimiter: '/', 'max-keys': 1000 }, {})
    const prefixes: string[] = []
    if (result.prefixes) {
      for (const p of result.prefixes) {
        if (p !== prefix) prefixes.push(p)
      }
    }
    return prefixes
  } catch (e: any) {
    console.error('OSS listPrefixes error:', e)
    return []
  }
})

// --- OSS: upload file from local path ---
ipcMain.handle('oss:uploadFile', async (_, config: any, localPath: string, ossKey: string) => {
  try {
    if (!config?.accessKeyId || !config?.accessKeySecret || !config?.bucket) {
      return JSON.stringify({ error: '未配置 OSS AccessKey/Bucket' })
    }
    if (!fs.existsSync(localPath)) {
      return JSON.stringify({ error: '本地文件不存在' })
    }
    const ext = path.extname(localPath).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.gif': 'image/gif', '.webp': 'image/webp', '.mp4': 'video/mp4',
      '.webm': 'video/webm', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
    }
    const client = createOSSClient(config)
    const result = await client.put(ossKey, localPath, { mime: mimeMap[ext] || 'application/octet-stream' })
    return JSON.stringify({ url: result.url, key: ossKey })
  } catch (e: any) {
    console.error('OSS uploadFile error:', e)
    return JSON.stringify({ error: e.message || 'OSS 上传失败' })
  }
})

// --- OSS: delete any key (no generated/ restriction) ---
ipcMain.handle('oss:deleteAny', async (_, config: any, key: string) => {
  try {
    if (!config?.accessKeyId || !config?.accessKeySecret || !config?.bucket) {
      return JSON.stringify({ success: false, error: '未配置 OSS AccessKey/Bucket' })
    }
    const client = createOSSClient(config)
    await client.delete(key)
    return JSON.stringify({ success: true })
  } catch (e: any) {
    console.error('OSS deleteAny error:', e)
    return JSON.stringify({ success: false, error: e.message || 'OSS 删除失败' })
  }
})

// --- OSS: batch delete any keys ---
ipcMain.handle('oss:deleteMultiAny', async (_, config: any, keys: string[]) => {
  try {
    if (!config?.accessKeyId || !config?.accessKeySecret || !config?.bucket) {
      return JSON.stringify({ success: false, error: '未配置 OSS AccessKey/Bucket' })
    }
    const client = createOSSClient(config)
    const result = await client.deleteMulti(keys, { quiet: false })
    const deleted = (result.deleted || []).map((d: any) => d.Key || d.key)
    return JSON.stringify({ success: true, deleted })
  } catch (e: any) {
    console.error('OSS deleteMultiAny error:', e)
    return JSON.stringify({ success: false, error: e.message || 'OSS 批量删除失败' })
  }
})

// --- Shell: move to trash ---
ipcMain.handle('shell:trash', async (_, filePath: string) => {
  try {
    await shell.trashItem(filePath)
    return JSON.stringify({ success: true })
  } catch (e: any) {
    return JSON.stringify({ success: false, error: e.message || '无法放入回收站' })
  }
})

// --- TTS:generate ---
ipcMain.handle('tts:generate', async (_, config: any, text: string, voiceId: string, speed: number, pitch: number) => {
  try {
    const ttsDir = path.join(app.getPath('documents'), 'NBC素材', 'tts')
    if (!fs.existsSync(ttsDir)) fs.mkdirSync(ttsDir, { recursive: true })
    const filename = `tts_${Date.now()}.wav`
    const filePath = path.join(ttsDir, filename)

    if (config?.apiKey && config?.endpoint) {
      const response = await fetch(`${config.endpoint}/api/v3/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          app: { appid: config.appId || '' },
          user: { uid: 'nbc_user' },
          audio: {
            voice_type: voiceId || 'zh_male_qingse',
            encoding: 'wav',
            speed_ratio: speed || 1.0,
            pitch_ratio: pitch || 0,
          },
          request: { text, text_type: 'plain' },
        }),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.audio) {
          fs.writeFileSync(filePath, Buffer.from(data.audio, 'base64'))
          return JSON.stringify({ success: true, filePath, filename })
        }
      }
    }

    const textFile = filePath.replace('.wav', '.txt')
    fs.writeFileSync(textFile, text, 'utf-8')
    return JSON.stringify({ success: false, error: 'TTS API 调用失败，已保存文本文件供外部处理', filePath: textFile })
  } catch (e: any) {
    return JSON.stringify({ success: false, error: e.message || 'TTS 生成失败' })
  }
})

// --- export:video ---
ipcMain.handle('export:video', async (_, options: {
  clips: Array<{ sourceUrl: string; duration: number; startTime: number }>
  outputPath?: string
  resolution?: string
  fps?: number
  burnSubtitles?: boolean
  subtitleText?: string
}) => {
  try {
    const exportDir = options.outputPath || path.join(app.getPath('documents'), 'NBC素材', 'exports')
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true })
    const outFile = path.join(exportDir, `nbc_export_${Date.now()}.mp4`)

    const listFile = path.join(exportDir, 'concat_list.txt')
    const lines: string[] = []
    for (const clip of options.clips) {
      if (clip.sourceUrl && fs.existsSync(clip.sourceUrl)) {
        lines.push(`file '${clip.sourceUrl.replace(/'/g, "'\\''")}'`)
        lines.push(`duration ${clip.duration || 5}`)
      }
    }

    if (lines.length === 0) {
      return JSON.stringify({ success: false, error: '没有可拼接的本地文件', outputPath: outFile })
    }

    fs.writeFileSync(listFile, lines.join('\n'), 'utf-8')

    const { execSync } = require('child_process')
    try {
      execSync(`ffmpeg -f concat -safe 0 -i "${listFile}" -c copy "${outFile}" -y`, { timeout: 300000 })
      return JSON.stringify({ success: true, outputPath: outFile, clipCount: options.clips.length })
    } catch {
      return JSON.stringify({ success: false, error: 'ffmpeg 不可用，已生成拼接列表文件', outputPath: listFile, clipCount: options.clips.length })
    }
  } catch (e: any) {
    return JSON.stringify({ success: false, error: e.message || '视频导出失败' })
  }
})

// --- Feishu Drive IPC ---
async function getFeishuToken(appId: string, appSecret: string): Promise<string> {
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret })
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.msg || '获取 Token 失败');
  return data.tenant_access_token;
}

ipcMain.handle('feishu:list', async (_, config: any) => {
  try {
    if (!config?.appId || !config?.appSecret || !config?.folderToken) throw new Error('缺少配置');
    const token = await getFeishuToken(config.appId, config.appSecret);
    const res = await fetch(`https://open.feishu.cn/open-apis/drive/v1/files?folder_token=${config.folderToken}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.code !== 0) {
      throw new Error(`Feishu API Error [${data.code}]: ${data.msg}`);
    }
    
    const files = data.data.files || [];
    const cacheDir = path.join('H:\\素材库', '生成素材', '飞书云盘');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    // Download files that are not cached yet
    const results = [];
    for (const file of files) {
      if (file.type !== 'file' && file.type !== 'mp4') {
         // Some Feishu types are bitable, doc, etc. We only care about media files.
         // file.type might be 'file', 'docx', etc. Let's just try to sync 'file'.
      }
      
      const localPath = path.join(cacheDir, file.name);
      let stat;
      try { stat = fs.statSync(localPath); } catch {}
      
      // Basic check: if file doesn't exist, download it
      if (!stat) {
        try {
          const dlRes = await fetch(`https://open.feishu.cn/open-apis/drive/v1/files/${file.token}/download`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (dlRes.ok) {
            const arrayBuffer = await dlRes.arrayBuffer();
            fs.writeFileSync(localPath, Buffer.from(arrayBuffer));
            stat = fs.statSync(localPath);
          } else {
            console.error(`Feishu DL failed: ${file.name}, status: ${dlRes.status}`);
          }
        } catch (e) { console.error(`Feishu DL failed: ${file.name}`, e) }
      }
      
      if (stat) {
        const ext = path.extname(file.name).toLowerCase();
        const isV = ['.mp4','.webm','.mov','.avi'].includes(ext);
        const fileUrl = `nbc://assets/${encodeURIComponent(file.name)}?path=${encodeURIComponent(localPath)}`;
        results.push({
          id: file.token,
          name: file.name,
          type: (file.name.toLowerCase().includes('pano')||file.name.toLowerCase().includes('360')) ? 'panorama' : isV ? 'video' : 'image',
          path: fileUrl,
          size: stat.size,
          createdAt: stat.birthtime.toISOString(),
          tags: ['飞书云盘']
        });
      }
    }
    return results;
  } catch (e: any) {
    console.error('Feishu list error:', e);
    throw e;
  }
})

ipcMain.handle('feishu:upload', async (_, config: any, filename: string, base64Data: string) => {
  try {
    if (!config?.appId || !config?.appSecret || !config?.folderToken) return null
    const token = await getFeishuToken(config.appId, config.appSecret);
    const buffer = Buffer.from(base64Data, 'base64');
    
    const formData = new FormData();
    formData.append('file_name', filename);
    formData.append('parent_type', 'explorer');
    formData.append('parent_node', config.folderToken);
    formData.append('size', buffer.length.toString());
    formData.append('file', new Blob([buffer]));

    const res = await fetch('https://open.feishu.cn/open-apis/drive/v1/files/upload_all', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (data.code !== 0) throw new Error(data.msg);
    
    return data.data.file_token;
  } catch (e: any) {
    console.error('Feishu upload error:', e);
    return null;
  }
})

ipcMain.handle('save:feishu', async (_, msg: string) => {
  try {
    const queueDir = path.join(app.getPath('documents'), 'NBC素材')
    if (!fs.existsSync(queueDir)) fs.mkdirSync(queueDir, { recursive: true })
    const queueFile = path.join(queueDir, 'feishu_queue.jsonl')
    const line = JSON.stringify({ timestamp: new Date().toISOString(), message: msg }) + String.fromCharCode(10)
    fs.appendFileSync(queueFile, line)
    return 'queued'
  } catch (e: any) { return null }
})

// Return the NBC events JSONL file path for agent reading
ipcMain.handle('event:getPath', async () => {
  return path.join(app.getPath('documents'), 'NBC素材', 'nbc_events.jsonl')
})

// --- IPC: 飞书多维表格同步（内置功能） ---
ipcMain.handle('feishu:sync:run', async (_, config: FeishuSyncConfig) => {
  try {
    const result = await runFeishuSync(config)
    return { success: true, ...result }
  } catch (e: any) {
    return { success: false, error: e.message, synced: 0, skipped: 0, cursorLine: 0 }
  }
})

// --- IPC: Project File Save/Load ---
ipcMain.handle('project:saveToFile', async (_, workflowData: string, defaultFilename?: string) => {
  if (!mainWindow) return { filePath: null, success: false }
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '保存工作流文件',
    defaultPath: defaultFilename ? `${defaultFilename}.nbc.json` : 'workflow.nbc.json',
    filters: [
      { name: 'NBC 工作流文件', extensions: ['nbc.json'] },
      { name: 'JSON 文件', extensions: ['json'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  })
  if (result.canceled || !result.filePath) return { filePath: null, success: false }
  try {
    fs.writeFileSync(result.filePath, workflowData, 'utf-8')
    return { filePath: result.filePath, success: true }
  } catch { return { filePath: result.filePath, success: false } }
})

ipcMain.handle('project:loadFromFile', async () => {
  if (!mainWindow) return { data: null, filePath: '' }
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '打开工作流文件',
    filters: [
      { name: 'NBC 工作流文件', extensions: ['nbc.json'] },
      { name: 'JSON 文件', extensions: ['json'] },
      { name: '所有文件', extensions: ['*'] },
    ],
    properties: ['openFile'],
  })
  if (result.canceled || result.filePaths.length === 0) return { data: null, filePath: '' }
  try {
    const filePath = result.filePaths[0]
    const data = fs.readFileSync(filePath, 'utf-8')
    return { data, filePath }
  } catch { return { data: null, filePath: '' } }
})

// --- IPC: System Shell ---
ipcMain.handle('shell:open', async (_, target: string) => {
  try {
    if (target.startsWith('http://') || target.startsWith('https://')) {
      await shell.openExternal(target)
    } else {
      await shell.openPath(target)
    }
    return true
  } catch (e) {
    console.error('Failed to open shell target:', e)
    return false
  }
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
