import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface GenLogEntry {
  id: string
  timestamp: string
  model: string
  type: 'image' | 'video'
  status: 'success' | 'failure'
  prompt: string
  negativePrompt?: string
  error?: string
  resultUrl?: string
  source: 'node_editor' | 'inspiration_editor'
  nodeLabel?: string
  aspectRatio?: string
  imageSize?: string
}

interface GenLogStore {
  entries: GenLogEntry[]
  addEntry: (entry: Omit<GenLogEntry, 'id' | 'timestamp'>) => void
  clearAll: () => void
}

let counter = 0

export const useGenLogStore = create<GenLogStore>()(
  persist(
    (set) => ({
      entries: [],

      addEntry: (entry) =>
        set((s) => ({
          entries: [
            {
              ...entry,
              id: `genlog_${++counter}_${Date.now()}`,
              timestamp: new Date().toISOString(),
            },
            ...s.entries,
          ].slice(0, 200),
        })),

      clearAll: () => set({ entries: [] }),
    }),
    {
      name: 'nbc_gen_log',
      partialize: (s) => ({ entries: s.entries }),
    }
  )
)
