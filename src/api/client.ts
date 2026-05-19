/**
 * Universal API fetcher.
 * In Electron: uses IPC to main process (bypasses CORS).
 * In Browser: uses fetch() directly (needs Vite proxy or CORS headers).
 */

interface FetchRequest {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
  timeoutMs?: number
}

interface FetchResponse {
  status: number
  statusText: string
  headers: Record<string, string[]>
  body: string
}

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.apiFetch
}

export async function apiFetch(url: string, options: {
  method?: string
  headers?: Record<string, string>
  body?: string | object
  timeoutMs?: number
} = {}): Promise<{ status: number; body: string; headers: Record<string, string[]> }> {
  const bodyStr = typeof options.body === 'string' ? options.body : options.body ? JSON.stringify(options.body) : undefined

  if (isElectron()) {
    const res = await window.electronAPI!.apiFetch({
      url,
      method: options.method || 'GET',
      headers: { ...options.headers, ...(bodyStr ? { 'Content-Type': 'application/json' } : {}) },
      body: bodyStr,
      timeoutMs: options.timeoutMs || 120000,
    })
    if (res.status >= 400) throw new Error(`HTTP ${res.status}: ${res.body.slice(0, 200)}`)
    return res
  } else {
    // Browser mode - works via Vite proxy
    const timeoutMs = options.timeoutMs || 120000
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const resp = await fetch(url, {
        method: options.method || 'GET',
        headers: { ...options.headers, ...(bodyStr ? { 'Content-Type': 'application/json' } : {}) },
        body: bodyStr,
        signal: controller.signal,
      })
      if (!resp.ok) {
        const text = await resp.text()
        throw new Error(`HTTP ${resp.status}: ${text.slice(0, 200)}`)
      }
      return { status: resp.status, body: await resp.text(), headers: {} }
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
