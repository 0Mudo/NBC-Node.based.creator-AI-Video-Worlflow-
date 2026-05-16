import { apiFetch } from './client'

const API_BASE = import.meta.env.DEV ? '/api/ark' : 'https://ark.cn-beijing.volces.com'

export interface SeedanceOptions {
  modelId?: string
  mode: 'text-to-video' | 'image-to-video-first' | 'image-to-video-firstlast' | 'multi-modal' | 'video-edit' | 'video-extend'
  prompt: string
  resolution?: '480p' | '720p' | '1080p'
  ratio?: '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16'
  duration?: number
  generateAudio?: boolean
  returnLastFrame?: boolean
  serviceTier?: 'default' | 'flex'
  webSearch?: boolean
  referenceImages?: Array<{ url: string; role?: string }>
  referenceVideos?: Array<{ url: string; role?: string }>
  referenceAudios?: Array<{ url: string; role?: string }>
  apiKey?: string
  endpoint?: string
}

interface SeedanceTaskResult {
  id: string
  status: 'running' | 'succeeded' | 'failed'
  videoUrl?: string
}

export async function submitSeedanceTask(options: SeedanceOptions): Promise<string> {
  const apiKey = options.apiKey || ''
  const endpoint = options.endpoint || `${API_BASE}/api/v3`
  const modelId = options.modelId || 'doubao-seedance-2-0-260128'

  const content: Array<Record<string, unknown>> = [
    { type: 'text', text: options.prompt },
  ]

  // Add reference images
  if (options.referenceImages) {
    for (const img of options.referenceImages) {
      content.push({
        type: 'image_url',
        image_url: { url: img.url },
        role: img.role || 'reference_image',
      })
    }
  }

  // Add reference videos
  if (options.referenceVideos) {
    for (const vid of options.referenceVideos) {
      content.push({
        type: 'video_url',
        video_url: { url: vid.url },
        role: vid.role || 'reference_video',
      })
    }
  }

  // Add reference audios
  if (options.referenceAudios) {
    for (const aud of options.referenceAudios) {
      content.push({
        type: 'audio_url',
        audio_url: { url: aud.url },
        role: aud.role || 'reference_audio',
      })
    }
  }

  const body: Record<string, unknown> = {
    model: modelId,
    content,
    parameters: {
      resolution: options.resolution || '720p',
      ratio: options.ratio || '16:9',
      duration: options.duration || 5,
      generate_audio: options.generateAudio ?? false,
      return_last_frame: options.returnLastFrame ?? false,
    },
  }

  if (options.serviceTier === 'flex') {
    body.parameters = { ...(body.parameters as object), service_tier: 'flex' }
  }

  if (options.webSearch) {
    ;(body.parameters as Record<string, unknown>).tools = [{ type: 'web_search' }]
  }

  const res = await apiFetch(`${endpoint}/contents/generations/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    timeoutMs: 300000,
  })

  let data
  try {
    data = JSON.parse(res.body)
  } catch (e) {
    throw new Error(`Seedance API 返回了无效的 JSON 格式 (${res.status}): ${res.body}`)
  }

  if (res.status >= 400 || data.error) {
    const errorMsg = data.error?.message || data.error || res.body
    throw new Error(`Seedance API error (${res.status}): ${errorMsg}`)
  }

  return data.id || data.task_id || data.data?.id || data.data?.task_id
}

export async function pollSeedanceTask(
  taskId: string,
  apiKey?: string,
  onProgress?: (result: SeedanceTaskResult) => void,
  endpoint?: string,
  signal?: AbortSignal
): Promise<SeedanceTaskResult> {
  const key = apiKey || ''
  const resolvedEndpoint = endpoint || `${API_BASE}/api/v3`

  while (true) {
    if (signal?.aborted) throw new Error('AbortError')
    const res = await apiFetch(`${resolvedEndpoint}/contents/generations/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (signal?.aborted) throw new Error('AbortError')
    
    let data
    try {
      data = JSON.parse(res.body)
    } catch (e) {
      throw new Error(`Seedance poll 返回了无效的 JSON (${res.status}): ${res.body}`)
    }

    if (res.status >= 400 || data.error) {
       const errorMsg = data.error?.message || data.error || res.body
       throw new Error(`Seedance poll error (${res.status}): ${errorMsg}`)
    }
    
    // Support nested data format if API returns { code: 0, data: { status: ... } }
    const actualData = data.data || data
    
    const status = actualData.status || actualData.output?.status || actualData.content?.status || 'running'
    let vUrl = actualData.content?.video_url || actualData.output?.video_url || actualData.video_url
    if (typeof vUrl === 'object' && vUrl !== null) vUrl = vUrl.url
    
    const result: SeedanceTaskResult = {
      id: taskId,
      status,
      videoUrl: vUrl,
    }
    onProgress?.(result)
    if (status === 'succeeded') return result
    if (status === 'failed') throw new Error(actualData.error?.message || actualData.error || actualData.failure_reason || 'Seedance generation failed')
    await new Promise((r) => setTimeout(r, 3000))
  }
}
