import { apiFetch } from './client'

const API_BASE = import.meta.env.DEV ? '/api/grsai' : 'https://grsai.dakka.com.cn'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

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
  const isOpenAIFormat = requestUrl.endsWith('/images/generations')

  // 1. 如果是兼容 OpenAI 的 /images/generations 接口
  if (isOpenAIFormat) {
    const body: Record<string, unknown> = {
      model: options.model || 'gpt-image-2',
      prompt: options.prompt,
      size: options.aspectRatio || '1024x1024',
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
  
  if (options.aspectRatio) body.aspectRatio = options.aspectRatio
  if (options.images?.length) body.images = options.images
  body.replyType = options.replyType || 'json'

  const res = await fetchWithRetry(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    timeoutMs: 300000,
  })

  // Log raw response for debugging
  console.log('GPT Image 2 Status:', res.status)
  console.log('GPT Image 2 Response body:', res.body?.slice(0, 500) || '(empty)')

  // Quick path: try parse as direct JSON with optional {code, data} wrapper
  let directResult: GPTImageResult[] | null = null
  try {
    const json = JSON.parse(res.body)
    // Handle { code: 0, data: { id, status, results } } wrapper
    const payload = json.code !== undefined ? (json.data || json) : json
    if (payload.status === 'succeeded' || payload.status === 'failed') {
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
      directResult = [{
        id: payload.id || json.id || '',
        url: extractedUrl,
        progress: payload.progress ?? 100,
        status: payload.status,
        failureReason: payload.failure_reason || payload.error,
        results: payload.results || payload.data,
        raw: payload,
      }]
      if (payload.status === 'failed') {
        throw new Error(`生成失败: ${payload.failure_reason || payload.error || '未知原因'}`)
      }
      if (extractedUrl) {
        onProgress?.(directResult[0])
        return directResult
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
    for (const result of preliminaryResults) {
      onProgress?.(result)
      if (result.status === 'failed') {
        throw new Error(`生成失败: ${result.failureReason || '未知原因'}`)
      }
    }

    const last = preliminaryResults[preliminaryResults.length - 1]
    if (last.id && (last.status === 'running' || last.status === 'pending') && !last.url) {
      const resultEndpoint = buildResultEndpoint(requestUrl)
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
      
      return await pollGPTImageResult(taskId, apiKey, resultEndpoint, onProgress, signal)
    }
    
    // If we get here and it has an error code
    if (json.code && json.code !== 0) throw new Error(`API错误: code=${json.code} msg=${json.msg}`)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('API错误')) throw e
  }

  // If all parsing fails, throw original error
  return parseResponse(res.body)
}

export async function pollGPTImageResult(
  taskId: string,
  apiKey: string,
  endpoint: string,
  onProgress?: (result: GPTImageResult) => void,
  signal?: AbortSignal
): Promise<GPTImageResult[]> {
  while (true) {
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

    // GRS AI result API can return flat structure or nested in data
    const data = json.data || json
    if (!data || (Object.keys(data).length === 0)) throw new Error('获取结果失败，返回数据为空')

    // Depending on GRS API format, it could be `data.results[0].url` or flat `data.url`
    const extractedUrl = pickUrl(
      data.url,
      data.results?.[0]?.url,
      data.image_url,
      data.result?.url,
      data.output_url,
      data[0]?.url
    )
    
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
      if (extractedUrl) {
        return [result]
      } else {
        throw new Error(`任务已完成，但未找到图片URL。\n返回数据: ${JSON.stringify(data).substring(0, 200)}`)
      }
    }
    
    if (result.status === 'failed' || result.failureReason) {
      throw new Error(`生成失败: ${result.failureReason || '未知原因'}`)
    }

    // Wait before next poll
    await new Promise(r => setTimeout(r, 3000))
  }
}
