import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Asset, AssetTag } from '@/types/asset'
import { characters } from '@/data/characters'
import { scenes } from '@/data/scenes'
import { items } from '@/data/items'

function buildPresetAssets(): Asset[] {
  const now = new Date().toISOString()
  const presets: Asset[] = []

  for (const c of characters) {
    presets.push({
      id: `preset_char_${c.id}`,
      name: c.name,
      type: 'text',
      path: `preset://character/${c.id}`,
      prompt: c.appearance,
      tags: ['Character', '预设'],
      createdAt: now,
      thumbnailPath: c.refImage || undefined,
      preset: true
    })
  }

  for (const s of scenes) {
    presets.push({
      id: `preset_scene_${s.id}`,
      name: s.name,
      type: 'text',
      path: `preset://scene/${s.id}`,
      prompt: `${s.description}\n\n光照: ${s.lighting}\n氛围: ${s.mood}`,
      tags: ['Scene', '预设'],
      createdAt: now,
      thumbnailPath: s.refImage || undefined,
      preset: true
    })
  }

  for (const it of items) {
    presets.push({
      id: `preset_item_${it.id}`,
      name: it.name,
      type: 'text',
      path: `preset://item/${it.id}`,
      prompt: `${it.description}\n\n材质: ${it.material}\n状态: ${it.status}`,
      tags: ['Item', '预设'],
      createdAt: now,
      thumbnailPath: it.refImage || undefined,
      preset: true
    })
  }

  return presets
}

interface AssetStore {
  assets: Asset[]
  selectedAssetId: string | null
  searchQuery: string
  indexMode: 'category' | 'project'
  filterTag: AssetTag | 'All'
  filterProject: string | 'All'
  viewMode: 'grid' | 'list'
  scanPath: string
  defaultLocalPath: string
  setAssets: (assets: Asset[]) => void
  removeAsset: (id: string) => void
  selectAsset: (id: string | null) => void
  setSearch: (query: string) => void
  setIndexMode: (mode: 'category' | 'project') => void
  setFilterTag: (tag: AssetTag | 'All') => void
  setFilterProject: (projectId: string | 'All') => void
  setViewMode: (mode: 'grid' | 'list') => void
  setScanPath: (path: string) => void
  setDefaultLocalPath: (path: string) => void
}

export const useAssetStore = create<AssetStore>()(
  persist(
    (set) => ({
      assets: [],
      selectedAssetId: null,
      searchQuery: '',
      indexMode: 'category',
      filterTag: 'All',
      filterProject: 'All',
      viewMode: 'grid',
      scanPath: '',
      defaultLocalPath: 'H:\\素材库',
      setAssets: (assets) => set({ assets }),
      removeAsset: (id) => set((state) => {
        const filtered = state.assets.filter((a) => a.id !== id)
        return {
          assets: filtered,
          selectedAssetId: state.selectedAssetId === id ? null : state.selectedAssetId,
        }
      }),
      selectAsset: (id) => set({ selectedAssetId: id }),
      setSearch: (query) => set({ searchQuery: query }),
      setIndexMode: (mode) => set({ indexMode: mode }),
      setFilterTag: (tag) => set({ filterTag: tag }),
      setFilterProject: (projectId) => set({ filterProject: projectId }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setScanPath: (path) => set({ scanPath: path }),
      setDefaultLocalPath: (path) => {
        set({ defaultLocalPath: path })
      },
    }),
    {
      name: 'nbc_asset_store',
      partialize: (state) => ({
        assets: state.assets,
        defaultLocalPath: state.defaultLocalPath,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const legacyPath = localStorage.getItem('nbc_default_local_asset_path')
          if (legacyPath && state.defaultLocalPath === 'H:\\素材库') {
            state.defaultLocalPath = legacyPath
            localStorage.removeItem('nbc_default_local_asset_path')
          }

          const hasPresets = state.assets.some((a) => a.preset === true)
          if (!hasPresets) {
            const presets = buildPresetAssets()
            state.assets = [...presets, ...state.assets]
          }
        }
      },
    }
  )
)
