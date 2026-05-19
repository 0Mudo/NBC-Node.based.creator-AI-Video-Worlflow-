# Timeline & Node All-in-One Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely redesign the timeline into a table format (Prompt | Storyboard Image | Video) with inline editing, batch generation, multi-version support, and simultaneous node enhancements (resizable nodes, inline prompt editing, multi-select three-card nodes).

**Architecture:** The timeline transforms from a multi-track video editor into a shot-row table with three columns. A new `useTimelineStore` data model replaces TrackClip with ShotRow. Nodes gain ReactFlow NodeResizer-based resize support with inline text editing. Batch generation gets a concurrency-controlled queue with cancel support.

**Tech Stack:** React 18 + TypeScript 5 + ReactFlow 11 + Zustand 4 + TailwindCSS 3 + Lucide React

---

## Feature Breakdown Across Subsystems

This plan covers **4 independent subsystems** that should be implemented in sequence (each depends on the previous):

1. **Data Model & Types** — New `ShotRow` type, updated `NodeData`, updated `useTimelineStore` v3
2. **Resizable Nodes + Inline Prompt** — NodeResizer integration, PromptNode inline editor, three-card multi-select
3. **Timeline Table Redesign** — Shot row table UI, edit/generate buttons, drag-from-library, batch generation queue
4. **Asset Cell Management** — Replace/delete storyboard images and videos, multi-version, cloud/local drag binding

---

## File Structure Changes

### New Files
- `src/types/timeline.ts` — ShotRow, ShotMedia types
- `src/components/timeline/ShotTable.tsx` — Main table component
- `src/components/timeline/ShotRow.tsx` — Individual row component
- `src/components/timeline/PromptCell.tsx` — Prompt column cell
- `src/components/timeline/ImageCell.tsx` — Storyboard image column cell
- `src/components/timeline/VideoCell.tsx` — Video column cell
- `src/components/timeline/BatchGenerateToolbar.tsx` — Batch generate controls
- `src/hooks/useNodeResize.ts` — Shared resize hook for nodes

### Modified Files
- `src/types/flow.ts` — Add `nodeDimensions`, multi-select fields, `itemCards`, `sceneCards`
- `src/store/useTimelineStore.ts` — Complete v3 rewrite with ShotRow model
- `src/nodes/PromptNode.tsx` — Inline textarea + refresh/optimize buttons + NodeResizer
- `src/nodes/CharacterCardNode.tsx` — Multi-select, resize, thumbnail scaling
- `src/nodes/SceneCardNode.tsx` — Multi-select, resize, thumbnail scaling
- `src/nodes/ItemCardNode.tsx` — Multi-select, resize, thumbnail scaling
- `src/nodes/AssetInputNode.tsx` — Thumbnail display, resize
- `src/nodes/GPTImageNode.tsx` — NodeResizer, thumbnail scaling
- `src/nodes/SeedanceNode.tsx` — NodeResizer, thumbnail scaling
- `src/nodes/ScriptNode.tsx` — NodeResizer
- `src/nodes/StoryboardNode.tsx` — NodeResizer
- `src/components/timeline/TimelineView.tsx` — Rewrite as container for ShotTable
- `src/components/inspector/Inspector.tsx` — Remove prompt inspector (moved inline), add multi-select fields for cards
- `src/components/inspector/PromptOptimizer.tsx` — Adapt for inline use
- `src/components/node-editor/FlowEditor.tsx` — Handle timeline→canvas node popup
- `src/store/useExecutionEngine.ts` — Support batch queue generation with concurrency
- `src/index.css` — Add resize handle styles, timeline table styles

---

## Subsystem 1: Data Model & Types

### Task 1.1: Create timeline types

**Files:**
- Create: `src/types/timeline.ts`

- [ ] **Step 1: Define ShotRow and ShotMedia types**

```typescript
// src/types/timeline.ts

export interface ShotMedia {
  id: string
  url: string
  thumbnail?: string
  status: 'empty' | 'generating' | 'done' | 'failed'
  error?: string
  boundAssetId?: string // linked asset from asset store
  boundCloudPath?: string // OSS cloud path
}

export interface ShotRow {
  id: string
  order: number

  // Prompt column data
  characters: string[]     // characterNames (multi)
  sceneName: string
  sceneDescription: string
  itemNames: string[]      // itemNames (multi)
  shotNumber: number
  shotType: string
  shotDescription: string
  dialogue: string
  promptText: string
  sceneNumber?: number
  sceneHeading?: string

  // Linked asset IDs for auto-matching
  characterAssetIds: string[]
  sceneAssetId: string
  itemAssetIds: string[]

  // Storyboard image column (up to 4 versions)
  images: ShotMedia[]

  // Video column (single video)
  video: ShotMedia

  // Tracking
  sourceNodeId?: string
  createdAt: number
}

export interface BatchGenerationQueue {
  id: string
  type: 'image' | 'video'
  shotIds: string[]
  currentIndex: number
  status: 'idle' | 'running' | 'paused' | 'completed' | 'cancelled'
  abortController: AbortController | null
}

export type TimelineViewMode = 'table' | 'legacy-track'
```

- [ ] **Step 2: Verify type file compiles**

Run: `npx tsc --noEmit src/types/timeline.ts`
Expected: No errors

---

### Task 1.2: Update NodeData in flow.ts for multi-select

**Files:**
- Modify: `src/types/flow.ts`

- [ ] **Step 1: Add multi-select and resizing fields to NodeData**

In `src/types/flow.ts`, add the following new fields to the `NodeData` interface:

```typescript
// Add to NodeData interface:

  // Node dimensions (for persistable resize)
  nodeWidth?: number
  nodeHeight?: number

  // Character Card - multi-select
  characterAssetIds?: string[]    // multiple character asset IDs
  characterNames?: string[]       // multiple character names
  characterAppearances?: string[] // multiple character appearances

  // Scene Card - multi-select
  sceneAssetIds?: string[]        // multiple scene asset IDs
  sceneNames?: string[]           // multiple scene names
  sceneDescriptions?: string[]    // multiple scene descriptions

  // Item Card - multi-select
  itemAssetIds?: string[]         // multiple item asset IDs
  itemNames?: string[]            // multiple item names
  itemDescriptions?: string[]     // multiple item descriptions
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No new type errors

---

### Task 1.3: Rewrite useTimelineStore v3 with ShotRow model

**Files:**
- Modify: `src/store/useTimelineStore.ts`

- [ ] **Step 1: Write the new ShotRow-based store**

```typescript
// src/store/useTimelineStore.ts
import { create } from 'zustand'
import { useProjectStore } from './useProjectStore'
import { emitNBCEvent } from '@/utils/nbcEvents'
import { useAssetStore } from './useAssetStore'
import { characters } from '@/data/characters'
import { scenes } from '@/data/scenes'
import { safeGetItem, safeSetItem } from '@/utils/safeStorage'
import type { ShotRow, ShotMedia, BatchGenerationQueue } from '@/types/timeline'

function createEmptyMedia(): ShotMedia {
  return { id: `sm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, url: '', status: 'empty' }
}

function createShotRow(order: number, overrides?: Partial<ShotRow>): ShotRow {
  return {
    id: `shot_${order}_${Date.now()}`,
    order,
    characters: [],
    sceneName: '',
    sceneDescription: '',
    itemNames: [],
    shotNumber: order + 1,
    shotType: '',
    shotDescription: '',
    dialogue: '',
    promptText: '',
    characterAssetIds: [],
    sceneAssetId: '',
    itemAssetIds: [],
    images: [],
    video: createEmptyMedia(),
    createdAt: Date.now(),
    ...overrides,
  }
}

interface TimelineStore {
  shots: ShotRow[]
  batchQueue: BatchGenerationQueue | null
  viewMode: 'table' | 'legacy-track'
  selectedShotId: string | null

  // Shot CRUD
  addShot: (overrides?: Partial<ShotRow>) => void
  updateShot: (shotId: string, updates: Partial<ShotRow>) => void
  removeShot: (shotId: string) => void
  reorderShots: (fromIndex: number, toIndex: number) => void
  selectShot: (shotId: string | null) => void

  // Image management
  addImageToShot: (shotId: string) => string
  updateImage: (shotId: string, imageId: string, updates: Partial<ShotMedia>) => void
  removeImage: (shotId: string, imageId: string) => void
  setImageCount: (shotId: string, count: number) => void

  // Video management
  updateVideo: (shotId: string, updates: Partial<ShotMedia>) => void

  // Batch generation
  startBatchQueue: (type: 'image' | 'video', shotIds: string[]) => void
  updateBatchProgress: (currentIndex: number) => void
  cancelBatchQueue: () => void
  completeBatchQueue: () => void

  // Import from script/inspiration
  importShotsFromScript: (scriptText: string) => void

  // Legacy bridge
  migrateFromLegacy: () => void
}

const STORAGE_KEY = 'nbc_timeline_v3_'

function autoSave(shots: ShotRow[]) {
  const projectId = useProjectStore.getState().activeProjectId
  if (projectId) {
    safeSetItem(`${STORAGE_KEY}${projectId}`, JSON.stringify({ shots }))
  }
}

function loadSaved(): ShotRow[] {
  const projectId = useProjectStore.getState().activeProjectId
  if (projectId) {
    const raw = safeGetItem(`${STORAGE_KEY}${projectId}`)
    if (raw) {
      try { return JSON.parse(raw).shots || [] } catch {}
    }
  }
  return []
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  shots: loadSaved(),
  batchQueue: null,
  viewMode: 'table',
  selectedShotId: null,

  addShot: (overrides) => {
    const shots = [...get().shots]
    const order = shots.length
    const shot = createShotRow(order, overrides)
    shots.push(shot)
    set({ shots })
    autoSave(shots)
  },

  updateShot: (shotId, updates) => {
    const shots = get().shots.map(s =>
      s.id === shotId ? { ...s, ...updates } : s
    )
    set({ shots })
    autoSave(shots)
  },

  removeShot: (shotId) => {
    const shots = get().shots
      .filter(s => s.id !== shotId)
      .map((s, i) => ({ ...s, order: i, shotNumber: i + 1 }))
    set({ shots, selectedShotId: get().selectedShotId === shotId ? null : get().selectedShotId })
    autoSave(shots)
  },

  reorderShots: (fromIndex, toIndex) => {
    const shots = [...get().shots]
    const [moved] = shots.splice(fromIndex, 1)
    shots.splice(toIndex, 0, moved)
    const reordered = shots.map((s, i) => ({ ...s, order: i, shotNumber: i + 1 }))
    set({ shots: reordered })
    autoSave(reordered)
  },

  selectShot: (shotId) => set({ selectedShotId: shotId }),

  addImageToShot: (shotId) => {
    const media = createEmptyMedia()
    const shots = get().shots.map(s => {
      if (s.id !== shotId) return s
      if (s.images.length >= 4) return s
      return { ...s, images: [...s.images, media] }
    })
    set({ shots })
    autoSave(shots)
    return media.id
  },

  updateImage: (shotId, imageId, updates) => {
    const shots = get().shots.map(s => {
      if (s.id !== shotId) return s
      return {
        ...s,
        images: s.images.map(img =>
          img.id === imageId ? { ...img, ...updates } : img
        ),
      }
    })
    set({ shots })
    autoSave(shots)
  },

  removeImage: (shotId, imageId) => {
    const shots = get().shots.map(s => {
      if (s.id !== shotId) return s
      return { ...s, images: s.images.filter(img => img.id !== imageId) }
    })
    set({ shots })
    autoSave(shots)
  },

  setImageCount: (shotId, count) => {
    const shots = get().shots.map(s => {
      if (s.id !== shotId) return s
      const clamped = Math.max(1, Math.min(4, count))
      const current = s.images
      if (clamped > current.length) {
        const newImages = [...current]
        for (let i = current.length; i < clamped; i++) {
          newImages.push(createEmptyMedia())
        }
        return { ...s, images: newImages }
      } else if (clamped < current.length) {
        return { ...s, images: current.slice(0, clamped) }
      }
      return s
    })
    set({ shots })
    autoSave(shots)
  },

  updateVideo: (shotId, updates) => {
    const shots = get().shots.map(s => {
      if (s.id !== shotId) return s
      return { ...s, video: { ...s.video, ...updates } }
    })
    set({ shots })
    autoSave(shots)
  },

  startBatchQueue: (type, shotIds) => {
    const queue: BatchGenerationQueue = {
      id: `batch_${Date.now()}`,
      type,
      shotIds,
      currentIndex: 0,
      status: 'running',
      abortController: new AbortController(),
    }
    set({ batchQueue: queue })
  },

  updateBatchProgress: (currentIndex) => {
    const queue = get().batchQueue
    if (queue) {
      set({ batchQueue: { ...queue, currentIndex } })
    }
  },

  cancelBatchQueue: () => {
    const queue = get().batchQueue
    if (queue) {
      queue.abortController?.abort()
      set({ batchQueue: { ...queue, status: 'cancelled', abortController: null } })
    }
  },

  completeBatchQueue: () => {
    const queue = get().batchQueue
    if (queue) {
      set({ batchQueue: { ...queue, status: 'completed', abortController: null } })
    }
  },

  importShotsFromScript: (scriptText) => {
    const lines = scriptText.split('\n').filter(l => l.trim())
    const shots = get().shots
    const startOrder = shots.length

    const SHOT_TYPES = ['全景', '中景', '近景', '特写', '远景', '大远景', '中近景', '大特写']

    const newShots: ShotRow[] = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const cleaned = line.replace(/^镜头\s*\d+[：:.\-]\s*/, '').replace(/^\d+[.、）)]\s*/, '')

      let shotType = ''
      for (const st of SHOT_TYPES) { if (cleaned.includes(st)) { shotType = st; break } }

      const characterNames: string[] = []
      const characterAssetIds: string[] = []
      for (const char of characters) {
        if (cleaned.includes(char.name) || cleaned.includes(char.nameEn)) {
          characterNames.push(char.name)
          characterAssetIds.push(`preset_char_${char.id}`)
        }
      }

      let sceneName = ''
      let sceneAssetId = ''
      for (const scene of scenes) {
        if (cleaned.includes(scene.name) || cleaned.includes(scene.nameEn)) {
          sceneName = scene.name
          sceneAssetId = `preset_scene_${scene.id}`
          break
        }
      }

      const dialogueMatch = cleaned.match(/["""](.+?)[""」]/)
      const dialogue = dialogueMatch ? dialogueMatch[1] : ''

      newShots.push(createShotRow(startOrder + i, {
        shotNumber: startOrder + i + 1,
        shotType,
        characters: characterNames,
        characterAssetIds,
        sceneName,
        sceneAssetId,
        dialogue,
        shotDescription: cleaned.slice(0, 200),
      }))
    }

    const allShots = [...shots, ...newShots]
    set({ shots: allShots })
    autoSave(allShots)

    emitNBCEvent('timeline:import', useProjectStore.getState().activeProjectId || undefined, {
      summary: `导入了 ${newShots.length} 个分镜`,
    })
  },

  migrateFromLegacy: () => {
    // Migration from v2 timeline store if old data exists
    const projectId = useProjectStore.getState().activeProjectId
    if (!projectId) return
    const legacyRaw = safeGetItem(`nbc_timeline_v2_${projectId}`)
    if (!legacyRaw) return
    try {
      const legacy = JSON.parse(legacyRaw)
      const videoTrack = legacy.tracks?.find((t: any) => t.type === 'video')
      if (!videoTrack?.clips?.length) return
      const shots: ShotRow[] = videoTrack.clips.map((clip: any, i: number) => ({
        id: `shot_${i}_${Date.now()}`,
        order: i,
        characters: (clip.spec?.characterIds || []).map((cid: string) => {
          const c = characters.find(ch => `preset_char_${ch.id}` === cid || ch.id === cid)
          return c?.name || cid
        }),
        sceneName: (() => {
          const s = scenes.find(sc => `preset_scene_${sc.id}` === clip.spec?.sceneId || sc.id === clip.spec?.sceneId)
          return s?.name || ''
        })(),
        sceneDescription: '',
        itemNames: [],
        shotNumber: i + 1,
        shotType: clip.spec?.shotType || '',
        shotDescription: clip.label || '',
        dialogue: clip.spec?.dialogue || '',
        promptText: '',
        characterAssetIds: clip.spec?.characterIds || [],
        sceneAssetId: clip.spec?.sceneId || '',
        itemAssetIds: [],
        images: clip.sourceUrl && clip.sourceType === 'image' ? [{
          id: `sm_${Date.now()}_${i}`,
          url: clip.sourceUrl,
          thumbnail: clip.thumbnail,
          status: clip.status === 'done' ? 'done' : 'empty',
        }] : [],
        video: clip.sourceUrl && clip.sourceType === 'video' ? {
          id: `sm_${Date.now()}_${i}_v`,
          url: clip.sourceUrl,
          thumbnail: clip.thumbnail,
          status: clip.status === 'done' ? 'done' : 'empty',
        } : createEmptyMedia(),
        sourceNodeId: clip.genNodeId,
        createdAt: Date.now(),
      }))
      set({ shots })
      autoSave(shots)
    } catch {}
  },
}))
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No new errors from the store

---

## Subsystem 2: Resizable Nodes + Inline Prompt + Multi-Select Cards

### Task 2.1: Add NodeResizer wrapper component

**Files:**
- Create: `src/hooks/useNodeResize.ts`

- [ ] **Step 1: Create shared resize hook/component**

```typescript
// src/hooks/useNodeResize.ts
import { useCallback, useEffect, useRef } from 'react'
import { useFlowStore } from '@/store/useFlowStore'

interface ResizeState {
  width: number
  height: number
  isResizing: boolean
}

const MIN_WIDTH = 200
const MIN_HEIGHT = 120
const DEFAULT_WIDTH = 280
const DEFAULT_HEIGHT = 180

export function useNodeDimensions(nodeId: string, defaultW = DEFAULT_WIDTH, defaultH = DEFAULT_HEIGHT) {
  const node = useFlowStore((s) => s.nodes.find(n => n.id === nodeId))
  const updateNodeData = useFlowStore((s) => s.updateNodeData)
  const resizeRef = useRef<HTMLDivElement>(null)
  const resizeStateRef = useRef<ResizeState>({
    width: (node?.data.nodeWidth as number) || defaultW,
    height: (node?.data.nodeHeight as number) || defaultH,
    isResizing: false,
  })

  const currentWidth = (node?.data.nodeWidth as number) || defaultW
  const currentHeight = (node?.data.nodeHeight as number) || defaultH

  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const startW = currentWidth
    const startH = currentHeight
    resizeStateRef.current.isResizing = true

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeStateRef.current.isResizing) return
      let newW = startW
      let newH = startH

      if (direction.includes('e')) newW = Math.max(MIN_WIDTH, startW + moveEvent.clientX - startX)
      if (direction.includes('w')) newW = Math.max(MIN_WIDTH, startW - (moveEvent.clientX - startX))
      if (direction.includes('s')) newH = Math.max(MIN_HEIGHT, startH + moveEvent.clientY - startY)
      if (direction.includes('n')) newH = Math.max(MIN_HEIGHT, startH - (moveEvent.clientY - startY))

      resizeStateRef.current.width = newW
      resizeStateRef.current.height = newH

      if (resizeRef.current) {
        resizeRef.current.style.width = `${newW}px`
        resizeRef.current.style.height = `${newH}px`
      }
    }

    const handleMouseUp = () => {
      resizeStateRef.current.isResizing = false
      updateNodeData(nodeId, {
        nodeWidth: resizeStateRef.current.width,
        nodeHeight: resizeStateRef.current.height,
      })
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [nodeId, currentWidth, currentHeight, updateNodeData])

  return {
    width: currentWidth,
    height: currentHeight,
    resizeRef,
    handleResizeStart,
    style: { width: currentWidth, height: currentHeight },
  }
}
```

- [ ] **Step 2: Create resize handle CSS**

In `src/index.css`, append after the existing `.node-container` styles:

```css
/* --- Node Resize Handles --- */
.node-resize-handle {
  position: absolute;
  z-index: 30;
  opacity: 0;
  transition: opacity 0.15s;
}
.node-container:hover .node-resize-handle,
.node-container.selected .node-resize-handle {
  opacity: 1;
}
.node-resize-handle-se { bottom: 0; right: 0; width: 14px; height: 14px; cursor: se-resize; }
.node-resize-handle-se::after {
  content: '';
  position: absolute;
  bottom: 3px;
  right: 3px;
  width: 8px;
  height: 8px;
  border-right: 2px solid rgb(var(--accent));
  border-bottom: 2px solid rgb(var(--accent));
  opacity: 0.6;
}
.node-resize-handle-e { top: 0; right: -4px; bottom: 0; width: 8px; cursor: e-resize; }
.node-resize-handle-s { left: 0; right: 0; bottom: -4px; height: 8px; cursor: s-resize; }
```

- [ ] **Step 3: Verify CSS compiles**

Run: `npx vite build --mode development 2>&1 | head -20`
Expected: Build succeeds

---

### Task 2.2: Rewrite PromptNode with inline text editing

**Files:**
- Modify: `src/nodes/PromptNode.tsx`

- [ ] **Step 1: Rewrite PromptNode with inline textarea + resize + buttons**

```tsx
// src/nodes/PromptNode.tsx
import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { FileText, RefreshCw, Sparkles, Check, X, Loader2 } from 'lucide-react'
import type { NodeData } from '@/types/flow'
import { useFlowStore } from '@/store/useFlowStore'
import { useNodeDimensions } from '@/hooks/useNodeResize'
import { optimizePrompt } from '@/api/promptOptimize'
import { useNotificationStore } from '@/store/useNotificationStore'

function PromptNode({ id, data, selected }: NodeProps<NodeData>) {
  const { width, height, resizeRef, handleResizeStart, style } = useNodeDimensions(id, 320, 220)
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)
  const updateNodeData = useFlowStore((s) => s.updateNodeData)
  const [optimizing, setOptimizing] = useState(false)
  const [optResult, setOptResult] = useState<string | null>(null)
  const [optError, setOptError] = useState<string | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const promptText = (data.promptText as string) || ''

  const handleRefreshFromUpstream = useCallback(() => {
    const upstreamNodeIds = new Set<string>()
    edges.filter((e) => e.target === id).forEach((e) => upstreamNodeIds.add(e.source))
    const upstreamNodes = nodes.filter((n) => upstreamNodeIds.has(n.id))

    const parts: string[] = []
    for (const un of upstreamNodes) {
      if (un.type === 'characterCard') {
        const names = (un.data.characterNames as string[]) || (un.data.characterName ? [un.data.characterName as string] : [])
        const appearances = (un.data.characterAppearances as string[]) || (un.data.characterAppearance ? [un.data.characterAppearance as string] : [])
        for (let i = 0; i < Math.max(names.length, appearances.length); i++) {
          const n = names[i] || ''
          const a = appearances[i] || ''
          if (n || a) parts.push(`角色「${n}」：${a}`)
        }
      } else if (un.type === 'sceneCard') {
        const names = (un.data.sceneNames as string[]) || (un.data.sceneName ? [un.data.sceneName as string] : [])
        const descs = (un.data.sceneDescriptions as string[]) || (un.data.sceneDescription ? [un.data.sceneDescription as string] : [])
        for (let i = 0; i < Math.max(names.length, descs.length); i++) {
          const n = names[i] || ''
          const d = descs[i] || ''
          if (n || d) parts.push(`场景「${n}」：${d}`)
        }
      } else if (un.type === 'itemCard') {
        const names = (un.data.itemNames as string[]) || (un.data.itemName ? [un.data.itemName as string] : [])
        const descs = (un.data.itemDescriptions as string[]) || (un.data.itemDescription ? [un.data.itemDescription as string] : [])
        for (let i = 0; i < Math.max(names.length, descs.length); i++) {
          const n = names[i] || ''
          const d = descs[i] || ''
          if (n || d) parts.push(`物品「${n}」：${d}`)
        }
      } else if (un.type === 'script' && un.data.scriptText) {
        parts.push(`[剧本·第${un.data.scriptSceneNumber}场 ${un.data.scriptSceneHeading || ''}]\n${un.data.scriptText}`)
      } else if (un.type === 'storyboard') {
        parts.push(`[分镜·镜${un.data.storyboardShotNumber} ${un.data.storyboardShotType || ''}]\n${un.data.storyboardShotDescription || ''}${un.data.storyboardDialogue ? `\n对白：「${un.data.storyboardDialogue}」` : ''}`)
      }
    }

    if (parts.length === 0) {
      useNotificationStore.getState().addNotification({ type: 'warning', title: '无上游信息', message: '请先连线角色卡/场景卡/物品卡/剧本/分镜节点到提示词节点' })
      return
    }
    updateNodeData(id, { promptText: parts.join('\n\n') })
    useNotificationStore.getState().addNotification({ type: 'success', title: '已刷新提示词', message: `已从 ${parts.length} 个上游节点收集信息` })
  }, [id, nodes, edges, updateNodeData])

  const handleOptimize = async () => {
    if (!promptText.trim()) return
    setOptimizing(true)
    setOptResult(null)
    setOptError(null)
    const res = await optimizePrompt({ originalPrompt: promptText })
    setOptimizing(false)
    if (res.error) {
      setOptError(res.error)
    } else {
      setOptResult(res.optimized)
    }
  }

  const handleAccept = () => {
    if (optResult) {
      updateNodeData(id, { promptText: optResult })
      setOptResult(null)
    }
  }

  const handleDismiss = () => { setOptResult(null); setOptError(null) }

  const textAreaHeight = Math.max(60, height - 120)

  return (
    <div
      ref={resizeRef}
      className={`node-container ${selected ? 'selected' : ''}`}
      style={{ borderColor: '#a29bfe', width, height, ...style }}
    >
      <Handle type="target" position={Position.Left} id="input" />
      <Handle type="source" position={Position.Right} id="output" />
      <div className="node-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="node-icon" style={{ background: '#a29bfe', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            <FileText size={14} style={{ color: 'rgb(var(--bg-primary))' }} />
          </div>
          <span>{data.label || '提示词'}</span>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <button className="btn btn-ghost p-0.5" onClick={handleRefreshFromUpstream} title="刷新状态（从上游节点拉取）">
            <RefreshCw size={12} />
          </button>
          <button
            className="btn btn-ghost p-0.5"
            onClick={handleOptimize}
            disabled={optimizing || !promptText.trim()}
            title="AI 优化提示词"
          >
            {optimizing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          </button>
        </div>
      </div>
      <div className="node-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '4px 8px' }}>
        <textarea
          ref={textRef}
          className="w-full flex-1 bg-bg-tertiary/50 border border-node-border/30 rounded p-2 text-xs resize-none focus:outline-none focus:border-accent/50"
          style={{ minHeight: textAreaHeight }}
          value={promptText}
          onChange={(e) => updateNodeData(id, { promptText: e.target.value })}
          placeholder="输入提示词...（支持模板变量 {{角色卡}} {{场景卡}} {{物品卡}} {{剧本}} {{分镜}}）"
        />
        {optError && (
          <div className="text-[10px] text-red-400 mt-1">{optError}</div>
        )}
        {optResult && (
          <div className="mt-2 border border-accent/30 rounded p-2 bg-accent/5">
            <div className="text-[10px] text-text-secondary mb-1">AI优化结果</div>
            <div className="text-xs leading-relaxed max-h-24 overflow-y-auto mb-2">{optResult}</div>
            <div className="flex gap-1">
              <button className="btn btn-accent text-[10px] py-0.5 px-2 flex items-center gap-1" onClick={handleAccept}>
                <Check size={10} /> 采用
              </button>
              <button className="btn btn-ghost text-[10px] py-0.5 px-2 border border-node-border flex items-center gap-1" onClick={handleOptimize} disabled={optimizing}>
                <RefreshCw size={10} /> 再试
              </button>
              <button className="btn btn-ghost text-[10px] py-0.5 px-2 flex items-center gap-1" onClick={handleDismiss}>
                <X size={10} /> 放弃
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="node-resize-handle node-resize-handle-se" onMouseDown={(e) => handleResizeStart(e, 'se')} />
      <div className="node-resize-handle node-resize-handle-e" onMouseDown={(e) => handleResizeStart(e, 'e')} />
      <div className="node-resize-handle node-resize-handle-s" onMouseDown={(e) => handleResizeStart(e, 's')} />
    </div>
  )
}
export default memo(PromptNode)
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: No new errors

---

### Task 2.3: Rewrite CharacterCardNode with multi-select + resize

**Files:**
- Modify: `src/nodes/CharacterCardNode.tsx`

- [ ] **Step 1: Rewrite with multi-select, resize, and scaling thumbnails**

```tsx
// src/nodes/CharacterCardNode.tsx
import { memo, useMemo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { User, Plus, X } from 'lucide-react'
import { useFlowStore } from '@/store/useFlowStore'
import { useAssetStore } from '@/store/useAssetStore'
import { useNodeDimensions } from '@/hooks/useNodeResize'
import { characters } from '@/data/characters'
import type { NodeData } from '@/types/flow'
import type { Asset } from '@/types/asset'

function CharacterCardNode({ id, data, selected }: NodeProps<NodeData>) {
  const { width, resizeRef, handleResizeStart, style } = useNodeDimensions(id, 260, 200)
  const assets = useAssetStore((s) => s.assets)
  const updateNodeData = useFlowStore((s) => s.updateNodeData)

  const names = (data.characterNames as string[]) || (data.characterName ? [data.characterName as string] : [])
  const appearances = (data.characterAppearances as string[]) || (data.characterAppearance ? [data.characterAppearance as string] : [])
  const refImages = (data.characterRefImages as string[]) || (data.characterRefImage ? [data.characterRefImage as string] : [])
  const assetIds = (data.characterAssetIds as string[]) || (data.characterAssetId ? [data.characterAssetId as string] : [])

  const count = Math.max(names.length, appearances.length, refImages.length, assetIds.length, 0)

  const handleAddCharacter = () => {
    const charAssets = assets.filter(a => a.type === 'text' && a.tags?.includes('Character'))
    const nextChar = charAssets.find(a =>
      !assetIds.includes(a.id) && !names.includes(a.name)
    )
    if (nextChar) {
      updateNodeData(id, {
        characterAssetIds: [...assetIds, nextChar.id],
        characterNames: [...names, nextChar.name],
        characterAppearances: [...appearances, nextChar.prompt || ''],
        characterRefImages: [...refImages, nextChar.thumbnailPath || ''],
      })
    }
  }

  const handleRemoveCharacter = (index: number) => {
    updateNodeData(id, {
      characterAssetIds: assetIds.filter((_, i) => i !== index),
      characterNames: names.filter((_, i) => i !== index),
      characterAppearances: appearances.filter((_, i) => i !== index),
      characterRefImages: refImages.filter((_, i) => i !== index),
    })
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    const dataStr = e.dataTransfer.getData('application/asset')
    if (dataStr) {
      try {
        const asset: Asset = JSON.parse(dataStr)
        if (!assetIds.includes(asset.id)) {
          updateNodeData(id, {
            characterAssetIds: [...assetIds, asset.id],
            characterNames: [...names, asset.name],
            characterAppearances: [...appearances, asset.prompt || ''],
            characterRefImages: [...refImages, asset.path || asset.thumbnailPath || ''],
          })
        }
      } catch {}
    }
  }

  const thumbSize = Math.max(36, Math.min(80, Math.floor((width - 60) / Math.max(count, 1) - 8)))

  return (
    <div
      ref={resizeRef}
      className={`node-container ${selected ? 'selected' : ''}`}
      style={{ borderColor: '#ff6b6b', ...style }}
      onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      <Handle type="source" position={Position.Right} id="output" />
      <div className="node-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="node-icon" style={{ background: '#ff6b6b', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            <User size={14} style={{ color: 'rgb(var(--bg-primary))' }} />
          </div>
          <span>{data.label || '角色卡'}</span>
        </div>
        <button className="btn btn-ghost p-0.5" onClick={handleAddCharacter} title="添加角色">
          <Plus size={12} />
        </button>
      </div>
      <div className="node-body" style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {count === 0 ? (
          <span className="text-text-secondary" style={{ fontSize: 11 }}>未设置角色</span>
        ) : (
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: count }, (_, i) => {
              const img = refImages[i] || (i < assetIds.length ? assets.find(a => a.id === assetIds[i])?.thumbnailPath : undefined)
              return (
                <div key={i} className="relative group flex-shrink-0" style={{ width: thumbSize }}>
                  <div className="rounded overflow-hidden bg-bg-tertiary" style={{ width: thumbSize, height: thumbSize }}>
                    {img ? (
                      <img src={img.startsWith('http') || img.startsWith('data:') ? img : `file://${img}`}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        alt={names[i] || ''}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <User size={Math.floor(thumbSize * 0.4)} opacity={0.3} />
                      </div>
                    )}
                  </div>
                  <div className="text-[9px] text-center truncate mt-0.5" style={{ maxWidth: thumbSize }}>
                    {names[i] || '未命名'}
                  </div>
                  <button
                    className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); handleRemoveCharacter(i) }}
                  >
                    <X size={8} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div className="node-resize-handle node-resize-handle-se" onMouseDown={(e) => handleResizeStart(e, 'se')} />
      <div className="node-resize-handle node-resize-handle-e" onMouseDown={(e) => handleResizeStart(e, 'e')} />
      <div className="node-resize-handle node-resize-handle-s" onMouseDown={(e) => handleResizeStart(e, 's')} />
    </div>
  )
}
export default memo(CharacterCardNode)
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: No new errors

---

### Task 2.4: Rewrite SceneCardNode with multi-select + resize (same pattern)

**Files:**
- Modify: `src/nodes/SceneCardNode.tsx`

Follow the same pattern as CharacterCardNode but using scene-related fields (`sceneNames`, `sceneDescriptions`, `sceneAssetIds`, `sceneRefImages`) and `Map` icon with `#f9ca24` color.

### Task 2.5: Rewrite ItemCardNode with multi-select + resize (same pattern)

**Files:**
- Modify: `src/nodes/ItemCardNode.tsx`

Follow the same pattern using item-related fields (`itemNames`, `itemDescriptions`, `itemAssetIds`, `itemRefImages`) and `Box` icon with `#e67e22` color.

### Task 2.6: Add resize to AssetInputNode with thumbnail

**Files:**
- Modify: `src