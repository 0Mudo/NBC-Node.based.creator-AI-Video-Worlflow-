import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PromptTemplate, PromptCategory } from '@/types/promptTemplate'
import { builtInPrompts } from '@/data/promptLibrary'

interface PromptLibraryStore {
  templates: PromptTemplate[]
  filterCategory: PromptCategory | 'all'
  favoriteIds: string[]
  setFilterCategory: (cat: PromptCategory | 'all') => void
  addTemplate: (tpl: PromptTemplate) => void
  removeTemplate: (id: string) => void
  updateTemplate: (id: string, updates: Partial<PromptTemplate>) => void
  toggleFavorite: (id: string) => void
  incrementUsage: (id: string) => void
}

export const usePromptLibraryStore = create<PromptLibraryStore>()(
  persist(
    (set) => ({
      templates: [],
      filterCategory: 'all',
      favoriteIds: [],

      setFilterCategory: (cat) => set({ filterCategory: cat }),

      addTemplate: (tpl) => set((s) => ({
        templates: [...s.templates, tpl],
      })),

      removeTemplate: (id) => set((s) => ({
        templates: s.templates.filter((t) => t.id !== id),
        favoriteIds: s.favoriteIds.filter((fid) => fid !== id),
      })),

      updateTemplate: (id, updates) => set((s) => ({
        templates: s.templates.map((t) => t.id === id ? { ...t, ...updates } : t),
      })),

      toggleFavorite: (id) => set((s) => ({
        favoriteIds: s.favoriteIds.includes(id)
          ? s.favoriteIds.filter((fid) => fid !== id)
          : [...s.favoriteIds, id],
      })),

      incrementUsage: (id) => set((s) => ({
        templates: s.templates.map((t) => t.id === id ? { ...t, usageCount: t.usageCount + 1 } : t),
      })),
    }),
    {
      name: 'nbc_prompt_library',
      partialize: (s) => ({ templates: s.templates, favoriteIds: s.favoriteIds }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const existingIds = new Set(state.templates.map((t) => t.id))
          const newOnes = builtInPrompts.filter((bp) => !existingIds.has(bp.id))
          if (newOnes.length > 0) {
            state.templates = [...state.templates, ...newOnes]
          }
        }
      },
    }
  )
)
