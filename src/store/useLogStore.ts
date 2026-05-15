import { create } from 'zustand'
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/utils/safeStorage'

export interface FailureReport {
  id: string
  timestamp: string
  nodeType: string
  nodeLabel: string
  prompt?: string
  error: string
  details?: string
}

interface LogStore {
  reports: FailureReport[]
  addReport: (report: Omit<FailureReport, 'id' | 'timestamp'>) => void
  clearAll: () => void
  exportLogs: () => string
}

const STORAGE_KEY = 'nbc_failure_reports'

function loadStored(): FailureReport[] {
  try { return JSON.parse(safeGetItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveStored(reports: FailureReport[]) {
  safeSetItem(STORAGE_KEY, JSON.stringify(reports.slice(-50)))
}

export const useLogStore = create<LogStore>((set, get) => ({
  reports: loadStored(),

  addReport: (report) => {
    const entry: FailureReport = {
      ...report,
      id: `fail_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    }
    const reports = [entry, ...get().reports]
    set({ reports })
    saveStored(reports)
  },

  clearAll: () => { set({ reports: [] }); safeRemoveItem(STORAGE_KEY) },

  exportLogs: () => {
    const reports = get().reports
    const text = reports.map(r =>
      `[${new Date(r.timestamp).toLocaleString()}] ${r.nodeType} "${r.nodeLabel}"\n  错误: ${r.error}\n  提示词: ${r.prompt || '(无)'}\n${r.details ? `  详情: ${r.details}\n` : ''}---`
    ).join('\n')
    return text
  },
}))
