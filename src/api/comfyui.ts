import { apiFetch } from './client'

const API_BASE = import.meta.env.DEV ? '/api/comfyui' : 'http://localhost:8188'

interface ComfyUIOptions {
  workflow: Record<string, unknown>
  apiKey?: string
  endpoint?: string
}

export async function queryComfyUIQueue(endpoint?: string): Promise<{ queueRemaining: number }> {
  const url = endpoint || API_BASE
  const res = await apiFetch(`${url}/queue`)
  const data = JSON.parse(res.body)
  return { queueRemaining: (data.queue_running?.length || 0) + (data.queue_pending?.length || 0) }
}

export async function submitComfyUIWorkflow(options: ComfyUIOptions): Promise<string> {
  const url = options.endpoint || API_BASE
  const res = await apiFetch(`${url}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: options.workflow, client_id: `nbc-${Date.now()}` }),
  })
  return JSON.parse(res.body).prompt_id
}

export async function pollComfyUIResult(
  promptId: string,
  onProgress?: (info: string) => void,
  endpoint?: string,
  signal?: AbortSignal
): Promise<{ images: string[] }> {
  const url = endpoint || API_BASE
  while (true) {
    if (signal?.aborted) throw new Error('AbortError')
    const res = await apiFetch(`${url}/history/${promptId}`)
    if (signal?.aborted) throw new Error('AbortError')
    const history = JSON.parse(res.body)
    const entry = history[promptId]
    if (entry?.outputs) {
      const images: string[] = []
      for (const [, out] of Object.entries(entry.outputs as Record<string, any>)) {
        if (out.images) for (const img of out.images) images.push(img.filename)
      }
      if (images.length > 0) { onProgress?.('完成'); return { images } }
    }
    await new Promise((r) => setTimeout(r, 2000))
    onProgress?.('等待中...')
  }
}
