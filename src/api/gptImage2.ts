import { apiFetch } from './client'

const API_BASE = import.meta.env.DEV ? '/api/grsai' : 'https://grsai.dakka.com.cn'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

// #region debug-point A:report-helper
function reportDebugEvent(
  hypothesisId: string,
  location: string,
  msg: string,
  data: Record<string, unknown>
) {
  globalThis.fetch?.('http://127.0.0.1:7777/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'gptimage-running-url',
      runId: 'pre-fix',
      hypothesisId,
      location,
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {})
}
// #endregion

function isNetworkError(err: Error): boolean {
  const msg = err.message || ''
  return (
    msg.includes('超时') ||
    msg.includes('连接') ||
    msg.includes('TIMED_OUT') ||
    msg.includes('CONNECTION') ||
    msg.includes('DNS') ||
    msg.includes('NAME_NOT_RESOLVED') ||
    msg.includes('ERR_')
  )
}

async function fetchWithRetry(
  url: string,
  options: Parameters<typeof apiFetch>[1] & { retries?: number; retryDelay?: number }
): ReturnType<typeof apiFetch> {
  const maxRetries = options.retries ?? MAX_RETRIES
  const delay = options.retryDelay ?? RETRY_DELAY_MS
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiFetch(url, options)
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < maxRetries - 1 && isNetworkError(lastError)) {
        console.log(`[GPTImage] 网络错误，${(attempt + 1) * delay / 1000}秒后重试 (${attempt + 1}/${maxRetries - 1}): ${lastError.message}`)
        await new Promise(r => setTimeout(r, (attempt + 1) * delay))
        continue
      }
      throw lastError
    }
  }
  throw lastError!
}

export interface GPTImageOptions {
  prompt: string
  model?: string
  aspectRatio?: string
  images?: string[]
  apiKey?: string
  endpoint?: string
  replyType?: 'json' | 'stream' | 'async'
}

export interface GPTImageResult {
  id: string
  url: string
  progress: number
  status: string
  failureReason?: string
  results?: Array<{ url: string }>
  raw?: any
}

export function sanitizeUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  let s = value.trim()
  s = s.replace(/^`+/, '').replace(/`+$/, '').trim()
  s = s.replace(/^"+/, '').replace(/"+$/, '').trim()
  return s
}

function pickUrl(...candidates: unknown[]): string {
  for (const c of candidates) {
    const u = sanitizeUrl(c)
    if (u) return u
  }
  return ''
}

const GPT_IMAGE_SUPPORTED_PIXEL_SIZES = [
  '1024x1024',
  '2048x2048',
  '2880x2880',
  '1774x887',
  '2048x1152',
  '3840x2160',
  '887x1774',
  '1152x2048',
  '2160x3840',
  '1536x1024',
  '2048x1360',
  '3504x2336',
  '1024x1536',
  '1360x2048',
  '2336x3504',
  '2048x880',
  '3840x1648',
  '880x2048',
  '1648x3840',
  '688x2048',
  '1280x3840',
  '2048x688',
  '3840x1280',
  '2048x1024',
  '3840x1920',
  '1024x2048',
  '1920x3840',
] as const

function normalizeGPTImageAspectRatio(value?: string): string | undefined {
  const raw = sanitizeUrl(value)
  if (!raw) return undefined
  if (!/^\d+x\d+$/i.test(raw)) return raw
  if (GPT_IMAGE_SUPPORTED_PIXEL_SIZES.includes(raw as typeof GPT_IMAGE_SUPPORTED_PIXEL_SIZES[number])) {
    return raw
  }

  const [width, height] = raw.toLowerCase().split('x').map(Number)
  if (!width || !height) return raw

  const targetRatio = width / height
  const targetArea = width * height
  const candidates = GPT_IMAGE_SUPPORTED_PIXEL_SIZES
    .map((size) => {
      const [w, h] = size.split('x').map(Number)
      return {
        size,
        ratioDiff: Math.abs((w / h) - targetRatio),
        areaDiff: Math.abs((w * h) - targetArea),
      }
    })
    .sort((a, b) => {
      if (a.ratioDiff !== b.ratioDiff) return a.ratioDiff - b.ratioDiff
      return a.areaDiff - b.areaDiff
    })

  const best = candidates[0]
  if (best && best.ratioDiff <= 0.01) {
    return best.size
  }

  return raw
}

function normalizeParsedResults(results: GPTImageResult[]): GPTImageResult[] {
  if (!results.length) return results
  const withUrl = [...results].reverse().find((result) => !!result.url)
  if (withUrl) return [withUrl]
  const succeeded = [...results].reverse().find((result) => result.status === 'succeeded')
  if (succeeded) return [succeeded]
  return [results[results.length - 1]]
}

function parseResponse(rawBody: string): GPTImageResult[] {
  // Try SSE format first (data: {...}\ndata: {...})
  const hasDataPrefix = rawBody.includes('data:')
  if (hasDataPrefix) {
    const lines = rawBody.split('\n').filter((l) => l.trim().startsWith('data:'))
    const results: GPTImageResult[] = []
    for (const line of lines) {
      const jsonStr = line.slice(line.indexOf('{')).trim()
      if (!jsonStr.startsWith('{')) continue
      try {
        const json = JSON.parse(jsonStr)
        results.push({
          id: json.id || json.task_id || json.data?.id || '',
          url: pickUrl(json.url, json.results?.[0]?.url, json.data?.[0]?.url, json.data?.url),
          progress: json.progress ?? 0,
          status: json.status || 'running',
          failureReason: json.failure_reason,
          results: json.results || json.data,
          raw: json
        })
      } catch { continue }
    }
    if (results.length > 0) return results
  }

  // Try direct JSON (some APIs return a single JSON object)
  try {
    const json = JSON.parse(rawBody)
    // Check for error response
    if (json.error) throw new Error(`API错误: ${json.error.message || json.error}`)
    if (json.code && json.code !== 0) throw new Error(`API错误: code=${json.code} msg=${json.msg}`)
    
    const extractedUrl = pickUrl(
      json.url,
      json.results?.[0]?.url,
      json.data?.[0]?.url,
      json.data?.url,
      json.data?.image_url,
      json.data?.results?.[0]?.url
    )
    
    return [{
      id: json.id || json.task_id || json.data?.id || '',
      url: extractedUrl,
      progress: json.progress ?? 100,
      status: json.status || 'succeeded',
      failureReason: json.failure_reason,
      results: json.results || json.data,
      raw: json // keep raw for debugging
    }]
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('API错误')) throw e
  }

  // Nothing worked - show what we got
  const preview = rawBody.slice(0, 500).trim()
  
  // Try OpenAI standard response
  try {
    const json = JSON.parse(rawBody)
    if (json.data && Array.isArray(json.data) && json.data[0].url) {
      return json.data.map((item: any) => ({
        id: json.created ? String(json.created) : '',
        url: sanitizeUrl(item.url),
        progress: 100,
        status: 'succeeded',
      }))
    }
  } catch {}

  throw new Error(`无法解析API响应 (${rawBody.length}字节)\n${preview ? '响应预览:\n' + preview : '空响应'}`)
}

export function buildResultEndpoint(requestUrl: string): string {
  let resultEndpoint = requestUrl
  try {
    const base = 'http://localhost'
    const u = new URL(requestUrl, base)
    u.pathname = u.pathname
      .replace(/\/v1\/draw\/completions\/?$/, '/v1/api/result')
      .replace(/\/v1\/draw\/result\/?$/, '/v1/api/result')
      .replace(/\/api\/generate\/?$/, '/api/result')
      .replace(/\/v1\/api\/generate\/?$/, '/v1/api/result')

    resultEndpoint = requestUrl.startsWith('http') ? u.toString() : `${u.pathname}${u.search}`
  } catch {}
  return resultEndpoint
}

export async function generateGPTImageStream(
  options: GPTImageOptions,
  onProgress?: (result: GPTImageResult) => void,
  signal?: AbortSignal
): Promise<GPTImageResult[]> {
  if (signal?.aborted) throw new Error('AbortError')
  const apiKey = options.apiKey || ''
  const endpoint = options.endpoint || `${API_BASE}/v1/api/generate`

  if (!apiKey) {
    throw new Error('未设置 GPT Image 2 API Key\n请在设置面板(⚙️)中填入 Key')
  }

  let requestUrl = sanitizeUrl(endpoint)
  const normalizedAspectRatio = normalizeGPTImageAspectRatio(options.aspectRatio)
  const isOpenAIFormat = requestUrl.endsWith('/images/generations')
  // #region debug-point A:entry
  reportDebugEvent('A', 'src/api/gptImage2.ts:generateGPTImageStream:entry', 'enter generateGPTImageStream', {
    endpoint,
    requestUrl,
    isOpenAIFormat,
    model: options.model || 'gpt-image-2',
    aspectRatio: normalizedAspectRatio,
    rawAspectRatio: options.aspectRatio,
    imageCount: options.images?.length || 0,
    replyType: options.replyType || 'json',
  })
  // #endregion

  // 1. 如果是兼容 OpenAI 的 /images/generations 接口
  if (isOpenAIFormat) {
    const body: Record<string, unknown> = {
      model: options.model || 'gpt-image-2',
      prompt: options.prompt,
      size: normalizedAspectRatio || '1024x1024',
    }
    // 注意：官方兼容接口参考图参数为 image
    if (options.images?.length) body.image = options.images

    const res = await fetchWithRetry(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      timeoutMs: 300000,
    })

    const rawBody = res.body || ''
    if (res.status >= 400) {
      try {
        const errorJson = JSON.parse(rawBody)
        if (errorJson.error) throw new Error(errorJson.error.message || JSON.stringify(errorJson.error))
      } catch {}
      throw new Error(`请求失败: ${res.status}\n${rawBody.slice(0, 200)}`)
    }

    try {
      const json = JSON.parse(rawBody)
      if (json.error) throw new Error(`API错误: ${json.error.message || JSON.stringify(json.error)}`)
      if (json.data && Array.isArray(json.data) && json.data[0].url) {
        return json.data.map((item: any) => ({
          id: json.created ? String(json.created) : `evt_${Date.now()}`,
          url: item.url,
          progress: 100,
          status: 'succeeded',
        }))
      }
      throw new Error('未找到图片 URL')
    } catch (e: any) {
      if (e.message === '未找到图片 URL' || e.message.startsWith('API错误')) throw e
      throw new Error(`无法解析 API 响应: ${e.message}\n${rawBody.slice(0, 200)}`)
    }
  }

  // 2. GrsAI /v1/api/generate 接口（官方 gpt-image-2 规范）
  // Auto-migrate legacy /api/jimeng/generate → /v1/api/generate
  if (requestUrl.includes('/api/jimeng/')) {
    console.warn('[GPTImage] legacy /api/jimeng/ endpoint detected, migrating to /v1/api/generate')
    requestUrl = requestUrl.replace(/\/api\/jimeng\/generate\/?$/, '/v1/api/generate')
  }
  if (requestUrl.includes('/v1/draw/completions')) {
    console.warn('[GPTImage] legacy /v1/draw/completions endpoint detected, migrating to /v1/api/generate')
    requestUrl = requestUrl.replace(/\/v1\/draw\/completions\/?$/, '/v1/api/generate')
  }
  const hasFullPath = requestUrl.includes('/v1/api/generate') || requestUrl.endsWith('/generate')
  if (hasFullPath) {
    // /v1/api/generate 是完整端点，不追加路径
  } else if (!requestUrl.endsWith('/draw/completions') && requestUrl.endsWith('/v1')) {
    requestUrl = requestUrl + '/draw/completions'
  } else if (!requestUrl.includes('/draw/') && !requestUrl.includes('/images/') && !requestUrl.includes('/generate')) {
    requestUrl = requestUrl.replace(/\/+$/, '') + '/v1/draw/completions'
  }

  const body: Record<string, unknown> = {
    model: options.model || 'gpt-image-2-vip',
    prompt: options.prompt,
  }
  
  if (normalizedAspectRatio) body.aspectRatio = normalizedAspectRatio
  if (options.images?.length) body.images = options.images
  body.replyType = options.replyType || 'json'
  // #region debug-point E:submit-request-summary
  reportDebugEvent('E', 'src/api/gptImage2.ts:generateGPTImageStream:submit-request-summary', 'prepared submit request body', {
    requestUrl,
    imageCount: options.images?.length || 0,
    imageKinds: (options.images || []).map((value) =>
      value.startsWith('https://') ? 'https' :
      value.startsWith('http://') ? 'http' :
      value.startsWith('data:') ? `data:${value.slice(5, 20)}` :
      'other'
    ),
    aspectRatio: normalizedAspectRatio,
    rawAspectRatio: options.aspectRatio,
    replyType: body.replyType,
  })
  // #endregion

  let res
  try {
    res = await fetchWithRetry(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      timeoutMs: 300000,
    })
  } catch (error: any) {
    // #region debug-point E:submit-request-failed
    reportDebugEvent('E', 'src/api/gptImage2.ts:generateGPTImageStream:submit-request-failed', 'submit request failed before response parsing', {
      requestUrl,
      message: error instanceof Error ? error.message : String(error),
      imageCount: options.images?.length || 0,
    })
    // #endregion
    throw error
  }

  // Log raw response for debugging
  console.log('GPT Image 2 Status:', res.status)
  console.log('GPT Image 2 Response body:', res.body?.slice(0, 500) || '(empty)')
  // #region debug-point A:submit-response
  reportDebugEvent('A', 'src/api/gptImage2.ts:generateGPTImageStream:submit-response', 'received submit response', {
    requestUrl,
    status: res.status,
    bodyPreview: res.body?.slice(0, 300) || '',
  })
  // #endregion

  // Quick path: try parse as direct JSON with optional {code, data} wrapper
  try {
    const json = JSON.parse(res.body)
    // Handle { code: 0, data: { id, status, results } } wrapper
    const payload = json.code !== undefined ? (json.data || json) : json
    const extractedUrl = pickUrl(
      payload.url,
      payload.results?.[0]?.url,
      payload.data?.[0]?.url,
      payload.data?.url,
      payload.data?.image_url,
      payload.data?.results?.[0]?.url,
      payload.result?.url,
      payload.output_url,
    )

    // Async mode: status=running with a task ID → start polling
    if ((payload.status === 'running' || payload.status === 'pending') && !extractedUrl && payload.id) {
      console.log('[GPTImage] async task detected, starting poll for:', payload.id)
      const resultEndpoint = buildResultEndpoint(requestUrl)
      // #region debug-point A:running-branch
      reportDebugEvent('A', 'src/api/gptImage2.ts:generateGPTImageStream:running-branch', 'submit response entered async polling branch', {
        payloadId: payload.id,
        payloadStatus: payload.status,
        extractedUrl,
        requestUrl,
        resultEndpoint,
      })
      // #endregion
      return await pollGPTImageResult(payload.id, apiKey, resultEndpoint, onProgress, signal)
    }

    // Sync success or explicit failure
    if (payload.status === 'succeeded' || payload.status === 'failed') {
      if (payload.status === 'failed') {
        throw new Error(`生成失败: ${payload.failure_reason || payload.error || '未知原因'}`)
      }
      if (extractedUrl) {
        // #region debug-point C:sync-success
        reportDebugEvent('C', 'src/api/gptImage2.ts:generateGPTImageStream:sync-success', 'submit response returned sync url', {
          payloadId: payload.id,
          payloadStatus: payload.status,
          extractedUrl,
        })
        // #endregion
        onProgress?.({ id: payload.id, url: extractedUrl, progress: 100, status: 'succeeded' })
        return [{ id: payload.id, url: extractedUrl, progress: 100, status: 'succeeded', results: payload.results }]
      }
      console.warn('[GPTImage] parsed response but URL empty, payload:', JSON.stringify(payload).slice(0, 300))
    }
  } catch (e) {
    if (e instanceof Error && (e.message.startsWith('生成失败') || e.message.startsWith('API错误'))) throw e
  }

  // Fallback: try the full parseResponse flow for SSE or other formats
  let preliminaryResults: GPTImageResult[] | null = null
  try {
    const results = parseResponse(res.body)
    preliminaryResults = results
    // #region debug-point A:parse-response-summary
    reportDebugEvent('A', 'src/api/gptImage2.ts:generateGPTImageStream:parse-response-summary', 'parsed preliminary response summary', {
      resultsLength: results.length,
      firstId: results[0]?.id || '',
      firstStatus: results[0]?.status || '',
      firstUrl: results[0]?.url || '',
    })
    // #endregion
    // If it successfully returned an array of results with URL, we're done
    if (results.length > 0 && results[0].url) {
      for (const result of results) {
        onProgress?.(result)
        if (result.status === 'failed') {
          throw new Error(`生成失败: ${result.failureReason || '未知原因'}`)
        }
      }
      return results
    }
  } catch (e) {
    // If it fails to parse as a final result, we'll try to check if it returned a task ID
  }

  if (preliminaryResults?.length) {
    // #region debug-point A:preliminary-branch-entry
    reportDebugEvent('A', 'src/api/gptImage2.ts:generateGPTImageStream:preliminary-branch-entry', 'entered preliminary results branch', {
      resultsLength: preliminaryResults.length,
      lastId: preliminaryResults[preliminaryResults.length - 1]?.id || '',
      lastStatus: preliminaryResults[preliminaryResults.length - 1]?.status || '',
      lastUrl: preliminaryResults[preliminaryResults.length - 1]?.url || '',
    })
    // #endregion
    for (const result of preliminaryResults) {
      onProgress?.(result)
      if (result.status === 'failed') {
        throw new Error(`生成失败: ${result.failureReason || '未知原因'}`)
      }
    }

    const last = preliminaryResults[preliminaryResults.length - 1]
    const normalized = normalizeParsedResults(preliminaryResults)
    if (normalized[0]?.status === 'succeeded' && normalized[0]?.url) {
      onProgress?.(normalized[0])
      return normalized
    }
    if (last.id && (last.status === 'running' || last.status === 'pending') && !last.url) {
      const resultEndpoint = buildResultEndpoint(requestUrl)
      // #region debug-point A:fallback-running-branch
      reportDebugEvent('A', 'src/api/gptImage2.ts:generateGPTImageStream:fallback-running-branch', 'fallback parser entered async polling branch', {
        taskId: last.id,
        status: last.status,
        requestUrl,
        resultEndpoint,
      })
      // #endregion
      return await pollGPTImageResult(last.id, apiKey, resultEndpoint, onProgress, signal)
    }
  }

  // Check if it's an async task submission returning an ID
  try {
    const json = JSON.parse(res.body)
    
    // Some APIs wrap in data.id with code === 0, some return flat {id: "...", status: "running"}
    let taskId = ''
    if (json.code === 0 && json.data?.id) {
      taskId = json.data.id
    } else if (json.id && json.status === 'running') {
      taskId = json.id
    } else if (json.data?.id && (json.data?.status === 'running' || json.data?.status === 'pending')) {
      taskId = json.data.id
    }

    if (taskId) {
      console.log('Got task ID, starting polling:', taskId)
      
      const resultEndpoint = buildResultEndpoint(requestUrl)
      // #region debug-point A:taskid-branch
      reportDebugEvent('A', 'src/api/gptImage2.ts:generateGPTImageStream:taskid-branch', 'task id branch entered async polling', {
        taskId,
        requestUrl,
        resultEndpoint,
        jsonStatus: json.status || json.data?.status,
      })
      // #endregion
      
      return await pollGPTImageResult(taskId, apiKey, resultEndpoint, onProgress, signal)
    }
    
    // If we get here and it has an error code
    if (json.code && json.code !== 0) throw new Error(`API错误: code=${json.code} msg=${json.msg}`)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('API错误')) throw e
  }

  // If all parsing fails, throw original error
  // #region debug-point A:final-fallback-return
  reportDebugEvent('A', 'src/api/gptImage2.ts:generateGPTImageStream:final-fallback-return', 'fell through to final parseResponse return', {
    requestUrl,
    bodyPreview: res.body?.slice(0, 300) || '',
  })
  // #endregion
  return normalizeParsedResults(parseResponse(res.body))
}

export async function pollGPTImageResult(
  taskId: string,
  apiKey: string,
  endpoint: string,
  onProgress?: (result: GPTImageResult) => void,
  signal?: AbortSignal
): Promise<GPTImageResult[]> {
  console.log(`[GPTImage] polling task ${taskId} at ${endpoint}`)
  // #region debug-point B:poll-entry
  reportDebugEvent('B', 'src/api/gptImage2.ts:pollGPTImageResult:entry', 'entered polling loop', {
    taskId,
    endpoint,
  })
  // #endregion
  const maxAttempts = 60 // 3 min at 3s intervals
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) throw new Error('AbortError')
    
    // GRS AI docs say GET /v1/api/result?id=taskId
    const isGrsApi = endpoint.includes('/api/result')
    const pollUrl = isGrsApi ? `${endpoint}?id=${taskId}` : endpoint
    
    const fetchOptions: any = {
      method: isGrsApi ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      timeoutMs: 30000,
    }
    
    if (!isGrsApi) {
      fetchOptions.body = JSON.stringify({ id: taskId })
    }

    const res = await fetchWithRetry(pollUrl, fetchOptions)
    if (signal?.aborted) throw new Error('AbortError')

    const json = JSON.parse(res.body)
    if (json.code && json.code !== 0) {
      if (json.code === -22) throw new Error('任务不存在')
      throw new Error(`API错误: code=${json.code} msg=${json.msg}`)
    }

    // API may return {code:0, data:{...}} or flat {...}
    const data = (json.code === 0 ? json.data : null) || json
    if (!data || (Object.keys(data).length === 0)) throw new Error('获取结果失败，返回数据为空')

    const extractedUrl = pickUrl(
      data.url,
      data.results?.[0]?.url,
      data.image_url,
      data.result?.url,
      data.output_url,
      data[0]?.url,
    )
    
    console.log(`[GPTImage] poll #${attempt + 1} status=${data.status} progress=${data.progress} hasUrl=${!!extractedUrl}`)
    // #region debug-point B:poll-response
    reportDebugEvent('B', 'src/api/gptImage2.ts:pollGPTImageResult:poll-response', 'received polling response', {
      attempt: attempt + 1,
      taskId,
      pollUrl,
      method: fetchOptions.method,
      status: data.status,
      progress: data.progress,
      hasUrl: !!extractedUrl,
      resultsCount: Array.isArray(data.results) ? data.results.length : 0,
      bodyPreview: res.body?.slice(0, 300) || '',
    })
    // #endregion

    const result: GPTImageResult = {
      id: data.id || taskId,
      url: extractedUrl,
      progress: data.progress ?? 0,
      status: data.status || 'running',
      failureReason: data.failure_reason || data.error,
      results: data.results,
      raw: data
    }

    onProgress?.(result)

    if (result.status === 'succeeded') {
      if (extractedUrl) return [result]
      // #region debug-point C:poll-succeeded-no-url
      reportDebugEvent('C', 'src/api/gptImage2.ts:pollGPTImageResult:poll-succeeded-no-url', 'polling reached succeeded without url', {
        taskId,
        attempt: attempt + 1,
        raw: JSON.stringify(data).slice(0, 300),
      })
      // #endregion
      throw new Error(`任务已完成，但未找到图片URL。\n返回数据: ${JSON.stringify(data).substring(0, 200)}`)
    }
    
    if (result.status === 'failed' || result.failureReason) {
      // #region debug-point C:poll-failed
      reportDebugEvent('C', 'src/api/gptImage2.ts:pollGPTImageResult:poll-failed', 'polling returned failed status', {
        taskId,
        attempt: attempt + 1,
        status: result.status,
        failureReason: result.failureReason || '',
      })
      // #endregion
      throw new Error(`生成失败: ${result.failureReason || '未知原因'}`)
    }

    // Wait before next poll
    await new Promise(r => setTimeout(r, 3000))
  }
  
  throw new Error(`轮询超时（${maxAttempts}次），任务未完成`)
}
