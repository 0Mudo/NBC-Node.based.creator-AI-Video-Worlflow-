import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StylePreset } from '@/types/style'
import { builtInStyles } from '@/data/stylePresets'

interface StyleStore {
  styles: StylePreset[]
  activeStyleId: string | null
  setActiveStyle: (id: string | null) => void
  addStyle: (style: StylePreset) => void
  removeStyle: (id: string) => void
  updateStyle: (id: string, updates: Partial<StylePreset>) => void
  incrementUsage: (id: string) => void
}

export const useStyleStore = create<StyleStore>()(
  persist(
    (set) => ({
      styles: [],
      activeStyleId: null,

      setActiveStyle: (id) => set({ activeStyleId: id }),

      addStyle: (style) => set((s) => ({
        styles: [...s.styles, style],
      })),

      removeStyle: (id) => set((s) => ({
        styles: s.styles.filter((st) => st.id !== id),
        activeStyleId: s.activeStyleId === id ? null : s.activeStyleId,
      })),

      updateStyle: (id, updates) => set((s) => ({
        styles: s.styles.map((st) => st.id === id ? { ...st, ...updates } : st),
      })),

      incrementUsage: (id) => set((s) => ({
        styles: s.styles.map((st) => st.id === id ? { ...st, usageCount: st.usageCount + 1 } : st),
      })),
    }),
    {
      name: 'nbc_style_store',
      partialize: (s) => ({ styles: s.styles, activeStyleId: s.activeStyleId }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const existingIds = new Set(state.styles.map((s) => s.id))
          const newOnes = builtInStyles.filter((bs) => !existingIds.has(bs.id))
          if (newOnes.length > 0) {
            state.styles = [...state.styles, ...newOnes]
          }
        }
      },
    }
  )
)
