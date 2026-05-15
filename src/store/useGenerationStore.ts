import { create } from 'zustand'
import type { GenerationTask, GenerationStatus, GenerationType } from '@/types/generation'

interface GenerationStore {
  tasks: GenerationTask[]
  isProcessing: boolean
  addTask: (task: GenerationTask) => void
  updateTask: (id: string, updates: Partial<GenerationTask>) => void
  removeTask: (id: string) => void
  cancelTask: (id: string) => void
  setProcessing: (v: boolean) => void
  clearCompleted: () => void
}

export const useGenerationStore = create<GenerationStore>((set, get) => ({
  tasks: [],
  isProcessing: false,
  addTask: (task) => set({ tasks: [...get().tasks, task] }),
  updateTask: (id, updates) => set({
    tasks: get().tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  }),
  removeTask: (id) => set({ tasks: get().tasks.filter((t) => t.id !== id) }),
  cancelTask: (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (task && task.status === 'running') {
      task.abortController?.abort()
      set({
        tasks: get().tasks.map((t) => (t.id === id ? { ...t, status: 'failed', error: 'User cancelled', completedAt: new Date().toISOString() } : t))
      })
    }
  },
  setProcessing: (v) => set({ isProcessing: v }),
  clearCompleted: () => set({ tasks: get().tasks.filter((t) => t.status !== 'completed') }),
}))
