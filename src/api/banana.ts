import { apiFetch } from './client'

const API_BASE = import.meta.env.DEV ? '/api/grsai' : 'https://grsai.dakka.com.cn'

export interface BananaImageOptions {
  prompt: string
  model?: string
  aspectRatio?: string
  imageSize?: '1K' | '2K' | '4K'
  images?: string[]
  replyType?: 'json' | 'stream' | 'async'
  apiKey?: string
  endpoint?: string
}

export interface BananaImageResult {
  id: string
  status: string
  progress: number
  results?: Array<{ url: string }>
  error?: string
}

export async function generateBananaImage(
  options: BananaImageOptions,
  onProgress?: (result: BananaImageResult) => void,
  signal?: AbortSignal
): Promise<BananaImageResult> {
  if (signal?.aborted) throw new Error('AbortError')
  const apiKey = options.apiKey || ''
  const endpoint = options.endpoint || `${API_BASE}/v1/api/generate`

  if (!apiKey) {
    throw new Error('未设置 API Key\n请在设置面板(⚙️)中填入 Key')
  }

  const body: Record<string, unknown> = {
    model: options.model || 'nano-banana-2',
    prompt: options.prompt,
    replyType: options.replyType || 'json',
  }
  
  if (options.aspectRatio) body.aspectRatio = options.aspectRatio
  if (options.imageSize) body.imageSize = options.imageSize
  if (options.images?.length) body.images = options.images

  const res = await apiFetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    timeoutMs: 300000,
  })

  if (signal?.aborted) throw new Error('AbortError')

  const rawBody = res.body || ''
  if (res.status >= 400) {
    try {
      const errorJson = JSON.parse(rawBody)
      if (errorJson.error) throw new Error(typeof errorJson.error === 'string' ? errorJson.error : errorJson.error.message || JSON.stringify(errorJson.error))
    } catch {}
    throw new Error(`请求失败: ${res.status}\n${rawBody.slice(0, 200)}`)
  }

  try {
    const json = JSON.parse(rawBody)
    if (json.error) throw new Error(`API错误: ${typeof json.error === 'string' ? json.error : json.error.message || JSON.stringify(json.error)}`)
    
    // If we used json replyType and it returned results directly
    if (json.status === 'succeeded' && json.results && json.results.length > 0) {
      return {
        id: json.id,
        status: json.status,
        progress: 100,
        results: json.results
      }
    }

    // If it's async or still running, we need to poll
    if (json.id) {
      const taskId = json.id
      console.log('Got Banana task ID, starting polling:', taskId)
      
      // The polling endpoint is GET /v1/api/result?id=xxx
      const baseUrl = endpoint.substring(0, endpoint.indexOf('/v1/api/generate')) || API_BASE
      const pollEndpoint = `${baseUrl}/v1/api/result`
      
      return await pollBananaImageResult(taskId, apiKey, pollEndpoint, onProgress, signal)
    }

    throw new Error('未找到任务 ID 或图片 URL')
  } catch (e: any) {
    if (e.message === '未找到任务 ID 或图片 URL' || e.message.startsWith('API错误') || e.message === 'AbortError') throw e
    throw new Error(`无法解析 API 响应: ${e.message}\n${rawBody.slice(0, 200)}`)
  }
}

export async function pollBananaImageResult(
  taskId: string,
  apiKey: string,
  endpoint: string,
  onProgress?: (result: BananaImageResult) => void,
  signal?: AbortSignal
): Promise<BananaImageResult> {
  while (true) {
    if (signal?.aborted) throw new Error('AbortError')
    
    // URL with query param
    const pollUrl = `${endpoint}?id=${taskId}`
    
    const res = await apiFetch(pollUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      timeoutMs: 30000,
    })
    
    if (signal?.aborted) throw new Error('AbortError')

    if (res.status >= 400) {
      try {
        const errorJson = JSON.parse(res.body)
        if (errorJson.error) throw new Error(typeof errorJson.error === 'string' ? errorJson.error : errorJson.error.message || JSON.stringify(errorJson.error))
      } catch {}
      throw new Error(`轮询请求失败: ${res.status}`)
    }

    const json = JSON.parse(res.body)
    
    if (json.error) {
      throw new Error(`API错误: ${typeof json.error === 'string' ? json.error : json.error.message || JSON.stringify(json.error)}`)
    }

    const result: BananaImageResult = {
      id: json.id || taskId,
      status: json.status || 'running',
      progress: json.progress ?? (json.status === 'succeeded' ? 100 : 50),
      results: json.results,
      error: json.error,
    }

    onProgress?.(result)

    if (result.status === 'succeeded' && result.results && result.results.length > 0) {
      return result
    }
    
    if (result.status === 'failed' || result.status === 'violation' || result.error) {
      throw new Error(`生成失败: ${result.error || result.status}`)
    }

    // Wait before next poll
    await new Promise(r => setTimeout(r, 3000))
  }
}
