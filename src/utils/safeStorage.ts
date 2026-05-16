type OnQuotaExceeded = (key: string) => void

let onQuotaExceeded: OnQuotaExceeded | null = null

export function setQuotaExceededHandler(handler: OnQuotaExceeded) {
  onQuotaExceeded = handler
}

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (e: any) {
    if (e.name === 'QuotaExceededError' || e.toString().includes('quota')) {
      onQuotaExceeded?.(key)
      attemptCleanup(key)
      try {
        localStorage.setItem(key, value)
        return true
      } catch {
        console.error(`[safeStorage] Failed to write ${key} even after cleanup`)
      }
    }
    return false
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {}
}

function attemptCleanup(excludeKey: string) {
  const keys = ['nbc_failure_reports', 'nbc_inspiration_store']
  for (const k of keys) {
    if (k !== excludeKey) {
      try {
        const raw = localStorage.getItem(k)
        if (raw && raw.length > 50000) {
          const trimmed = raw.substring(0, 50000)
          localStorage.setItem(k, trimmed)
        }
      } catch {}
    }
  }
}
