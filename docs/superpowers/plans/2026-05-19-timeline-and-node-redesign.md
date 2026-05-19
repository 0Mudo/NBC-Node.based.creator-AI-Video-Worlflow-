# 时间线与节点全面重构 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构时间线为三栏表格布局（提示词/分镜画面/视频画面），改造三卡节点支持多选和自由缩放，提示词节点内嵌编辑，支持一键批量生成和多版本对比。

**Architecture:** 时间线从轨道式（Track-based）改为镜头式（Shot-based）表格视图。每个 Shot 持有 promptText / storyboardFrames[] / videoClip 三栏数据。节点增加 ResizableNodeWrapper 统一支持缩放，三卡节点改用多选下拉，提示词节点内嵌 textarea + 按钮。

**Tech Stack:** React 18 + TypeScript 5 + ReactFlow 11 + Zustand 4 + TailwindCSS 3 + Lucide React

---

## 文件结构概览

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/types/flow.ts` | 修改 | 新增 NodeData 字段（multi chars/scenes/items, nodeSize） |
| `src/types/timeline.ts` | 新建 | Shot / StoryboardFrame / VideoClip 类型 |
| `src/store/useTimelineStore.ts` | 重写 | Shot-based 数据模型替代 Track-based |
| `src/components/timeline/TimelineView.tsx` | 重写 | 三栏表格视图 |
| `src/components/timeline/ShotRow.tsx` | 新建 | 单行 Shot 的三栏渲染 + 交互 |
| `src/components/timeline/StoryboardCell.tsx` | 新建 | 分镜画面单元格（多版本缩略图 + 按钮） |
| `src/components/timeline/VideoCell.tsx` | 新建 | 视频画面单元格 |
| `src/components/timeline/PromptCell.tsx` | 新建 | 提示词列单元格 |
| `src/components/timeline/ShotEditPanel.tsx` | 新建 | 点击编辑时在画布上调出节点 |
| `src/components/timeline/BatchToolbar.tsx` | 新建 | 一键生成所有分镜/视频按钮 |
| `src/components/node-editor/ResizableNodeWrapper.tsx` | 新建 | 统一节点缩放包装器 |
| `src/nodes/CharacterCardNode.tsx` | 修改 | 支持多角色显示 + 缩略图 + 缩放 |
| `src/nodes/SceneCardNode.tsx` | 修改 | 支持多场景显示 + 缩略图 + 缩放 |
| `src/nodes/ItemCardNode.tsx` | 修改 | 支持多物品显示 + 缩略图 + 缩放 |
| `src/nodes/PromptNode.tsx` | 重写 | 内嵌 textarea + 刷新/AI优化按钮 + 缩放 |
| `src/nodes/AssetInputNode.tsx` | 修改 | 显示缩略图 + 缩放 |
| `src/nodes/GPTImageNode.tsx` | 修改 | 缩放支持 |
| `src/nodes/SeedanceNode.tsx` | 修改 | 缩放支持 |
| `src/nodes/StoryboardNode.tsx` | 修改 | 缩放支持 |
| `src/nodes/ScriptNode.tsx` | 修改 | 缩放支持 |
| `src/nodes/index.ts` | 修改 | 注册 ResizableNodeWrapper |
| `src/components/inspector/Inspector.tsx` | 修改 | 三卡多选支持、移除 PromptNode textarea |
| `src/index.css` | 修改 | 新增缩放节点样式、时间线表格样式 |
| `src/store/useExecutionEngine.ts` | 修改 | 支持时间线绑定的生成回调 |
| `src/store/useFlowStore.ts` | 修改 | 新增 nodeSize 持久化 |

---

## 详细任务分解

### Task 1: 新增时间线类型定义

**Files:**
- Create: `src/types/timeline.ts`

- [ ] **Step 1: 创建 Shot/StoryboardFrame/VideoClip 类型文件**

```typescript
// src/types/timeline.ts

export interface StoryboardFrame {
  id: string
  shotId: string
  order: number
  imageUrl: string
  thumbnail?: string
  status: 'empty' | 'generating' | 'done' | 'failed'
  aspectRatio?: string
  quality?: string
  genNodeId?: string
  genTaskId?: string
  error?: string
  createdAt?: string
}

export interface VideoClipData {
  id: string
  shotId: string
  videoUrl: string
  thumbnail?: string
  status: 'empty' | 'generating' | 'done' | 'failed'
  duration: number
  modelId?: string
  mode?: string
  resolution?: string
  ratio?: string
  generateAudio?: boolean
  genNodeId?: string
  genTaskId?: string
  error?: string
  createdAt?: string
}

export interface ShotSpec {
  characterIds: string[]
  sceneId: string
  itemIds: string[]
  duration: number
  shotType: string
  transition: string
  dialogue?: string
  action?: string
  emotion?: string
}

export interface Shot {
  id: string
  order: number
  label: string
  promptText: string
  spec: ShotSpec
  storyboardFrames: StoryboardFrame[]
  videoClip: VideoClipData | null
  expanded: boolean
}
```

- [ ] **Step 2: 运行类型检查确认无语法错误**

Run: `npx tsc --noEmit --pretty src/types/timeline.ts`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/types/timeline.ts
git commit -m "feat: add timeline Shot/StoryboardFrame/VideoClip types"
```

---

### Task 2: 扩展 NodeData 类型支持多选和节点尺寸

**Files:**
- Modify: `src/types/flow.ts`

- [ ] **Step 1: 在 NodeData 接口中新增字段**

在 `src/types/flow.ts` 的 `NodeData` 接口中添加以下字段：

在 `characterCards` 字段之后添加（查找 `characterCards?: string`）：
```typescript
  // Multi-card support
  selectedCharacterIds?: string[]
  selectedSceneIds?: string[]
  selectedItemIds?: string[]
```

在 `[key: string]: unknown` 之前添加：
```typescript
  // Node resizing
  nodeWidth?: number
  nodeHeight?: number
```

- [ ] **Step 2: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 无新增错误

- [ ] **Step 3: Commit**

```bash
git add src/types/flow.ts
git commit -m "feat: add multi-card selection and node resize fields to NodeData"
```

---

### Task 3: 重写 useTimelineStore（Shot-based 模型）

**Files:**
- Modify: `src/store/useTimelineStore.ts`

- [ ] **Step 1: 编写新 Store 接口和实现**

完全重写 `src/store/useTimelineStore.ts`：

```typescript
import { create } from 'zustand'
import { useProjectStore } from './useProjectStore'
import { characters } from '@/data/characters'
import { scenes } from '@/data/scenes'
import { items } from '@/data/items'
import { emitNBCEvent } from '@/utils/nbcEvents'
import { useAssetStore } from './useAssetStore'
import { safeGetItem, safeSetItem } from '@/utils/safeStorage'
import type { Shot, ShotSpec, StoryboardFrame, VideoClipData } from '@/types/timeline'

// Legacy type aliases kept for backward compat with execution engine
export type TrackType = 'video' | 'audio' | 'bgm' | 'subtitle' | 'custom'

export interface Track {
  id: string; name: string; type: TrackType; index: number
  locked: boolean; muted: boolean; solo: boolean; visible: boolean
  height: number; clips: TrackClip[]; color?: string
}

export interface TrackClip {
  id: string; trackId: string; label: string; startTime: number; duration: number
  sourceUrl: string; sourceType: 'image' | 'video' | 'audio' | 'text'
  thumbnail?: string; status: 'empty' | 'generating' | 'done' | 'failed'
  spec: { characterIds: string[]; sceneId: string; shotType: string; transition: string; dialogue?: string; action?: string; emotion?: string }
  genNodeId?: string; opacity: number; volume: number; effectPreset?: string
}

export interface TimelineSlot {
  id: string; order: number; label: string
  spec: { characterIds: string[]; sceneId: string; duration: number; shotType: string; transition: string; dialogue?: string; action?: string; emotion?: string }
  filledClipId: string | null; sourceNodeId?: string
}

export interface GeneratedClip {
  id: string; nodeId: string; nodeLabel: string
  type: 'image' | 'video'; url: string; thumbnail?: string; createdAt: number
}

interface TimelineStore {
  shots: Shot[]
  playheadTime: number
  zoomLevel: number

  // Shot ops
  addShot: (label: string, spec?: Partial<ShotSpec>) => string
  updateShot: (shotId: string, updates: Partial<Shot>) => void
  removeShot: (shotId: string) => void
  reorderShots: (fromIdx: number, toIdx: number) => void

  // Storyboard frame ops
  addStoryboardFrame: (shotId: string, count?: number) => void
  updateStoryboardFrame: (frameId: string, updates: Partial<StoryboardFrame>) => void
  removeStoryboardFrame: (frameId: string) => void
  removeAllStoryboardFrames: (shotId: string) => void
  setFrameCount: (shotId: string, count: number) => void

  // Video clip ops
  setVideoClip: (shotId: string, clip: Omit<VideoClipData, 'id' | 'shotId'>) => string
  updateVideoClip: (clipId: string, updates: Partial<VideoClipData>) => void
  removeVideoClip: (shotId: string) => void

  // Batch
  importShotsFromScript: (scriptText: string) => void

  // Query
  getShot: (shotId: string) => Shot | undefined
  getTotalDuration: () => number

  // Playhead
  setPlayheadTime: (time: number) => void
  setZoomLevel: (level: number) => void

  // Legacy bridge
  addLegacyClip: (clip: Omit<GeneratedClip, 'id' | 'createdAt'>) => void
}
```

实现所有方法（完整代码约350行）。关键变更：
- `shots: Shot[]` 替代 `tracks: Track[]`
- `addShot` 创建新 Shot（含 empty storyboardFrames[0] 和 null videoClip）
- `updateShot` 更新 Shot 任意字段
- `addStoryboardFrame` 在 shot 中新增一帧
- `setFrameCount` 调整帧数量（1-4），自动裁剪/补空
- `updateStoryboardFrame` 更新帧的 url/status 等
- `importShotsFromScript` 从灵感编辑器文本解析分镜并创建 Shots（保留原 parseLine 逻辑）
- `addLegacyClip` 兼容执行引擎的回调，将生成结果存入 shot

Storage key: `nbc_timeline_v3_{projectId}`

- [ ] **Step 2: 在文件中保留原有 Track/TrackClip 类型导出**（执行引擎仍引用）

保留 `Track`, `TrackClip`, `TimelineSlot`, `GeneratedClip` 类型别名，但标记为 `@deprecated`

- [ ] **Step 3: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 需修复执行引擎中对 `useTimelineStore` 的引用

- [ ] **Step 4: Commit**

```bash
git add src/store/useTimelineStore.ts
git commit -m "feat: rewrite timeline store with Shot-based data model"
```

---

### Task 4: 修复执行引擎兼容新 Timeline Store

**Files:**
- Modify: `src/store/useExecutionEngine.ts`

- [ ] **Step 1: 更新 addLegacyClip 调用侧**

在 `executeNode` 函数底部，原有 `useTimelineStore.getState().addLegacyClip(...)` 调用已兼容，无需改动。

但在成功生成后，需要将结果绑定到当前活跃的 Shot。修改 `addLegacyClip` 的逻辑：在执行引擎成功后，不仅创建 TrackClip（保持兼容），还要将结果 URL 写入对应 Shot 的 storyboardFrame 或 videoClip。

具体修改：在 `executeNode` 的 `successfulUrls` 处理块中，增加对 timeline shots 的查找更新逻辑。根据生成的是 image 还是 video，更新对应 shot 的 frame 或 video clip。

```typescript
// 在 successfulUrls 循环中加入：
const timelineState = useTimelineStore.getState()
const activeShotId = (node.data._shotId as string)
if (activeShotId && type === 'gptImage2') {
  // 更新对应 shot 的 storyboard frame
  const shot = timelineState.getShot(activeShotId)
  if (shot) {
    const emptyFrame = shot.storyboardFrames.find(f => f.status === 'empty' || f.status === 'generating')
    if (emptyFrame) {
      timelineState.updateStoryboardFrame(emptyFrame.id, {
        imageUrl: url, status: 'done', thumbnail: url, genNodeId: nodeId
      })
    }
  }
}
if (activeShotId && type === 'seedance') {
  const shot = timelineState.getShot(activeShotId)
  if (shot) {
    timelineState.setVideoClip(activeShotId, {
      videoUrl: url, status: 'done', duration: (node.data.seedanceDuration as number) || 5,
      genNodeId: nodeId, modelId: node.data.seedanceModelId as string,
      mode: node.data.seedanceMode as string, resolution: node.data.seedanceResolution as string,
      ratio: node.data.seedanceRatio as string, generateAudio: node.data.seedanceGenerateAudio as boolean,
    })
  }
}
```

- [ ] **Step 2: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/store/useExecutionEngine.ts
git commit -m "feat: wire execution engine results to timeline shots"
```

---

### Task 5: 创建 ResizableNodeWrapper 通用缩放包装器

**Files:**
- Create: `src/components/node-editor/ResizableNodeWrapper.tsx`
- Modify: `src/nodes/index.ts`

- [ ] **Step 1: 编写 ResizableNodeWrapper 组件**

```typescript
// src/components/node-editor/ResizableNodeWrapper.tsx
import { memo, useCallback, useEffect, useRef } from 'react'
import type { NodeProps } from 'reactflow'
import { useFlowStore } from '@/store/useFlowStore'
import type { NodeData } from '@/types/flow'

interface Props {
  nodeProps: NodeProps<NodeData>
  children: React.ReactNode
  minWidth?: number
  minHeight?: number
}

function ResizableNodeWrapper({ nodeProps, children, minWidth = 200, minHeight = 100 }: Props) {
  const { id, data, selected } = nodeProps
  const updateNodeData = useFlowStore((s) => s.updateNodeData)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const nodeWidth = (data.nodeWidth as number) || undefined
  const nodeHeight = (data.nodeHeight as number) || undefined

  const handleResizeStart = useCallback((e: React.MouseEvent, corner: string) => {
    e.preventDefault()
    e.stopPropagation()

    const startX = e.clientX
    const startY = e.clientY
    const startWidth = wrapperRef.current?.offsetWidth || minWidth
    const startHeight = wrapperRef.current?.offsetHeight || minHeight

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      let newWidth = startWidth
      let newHeight = startHeight

      if (corner.includes('e')) newWidth = Math.max(minWidth, startWidth + dx)
      if (corner.includes('w')) newWidth = Math.max(minWidth, startWidth - dx)
      if (corner.includes('s')) newHeight = Math.max(minHeight, startHeight + dy)
      if (corner.includes('n')) newHeight = Math.max(minHeight, startHeight - dy)

      updateNodeData(id, { nodeWidth: newWidth, nodeHeight: newHeight })
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [id, updateNodeData, minWidth, minHeight])

  return (
    <div
      ref={wrapperRef}
      className="resizable-node-wrapper"
      style={{
        width: nodeWidth ? `${nodeWidth}px` : undefined,
        height: nodeHeight ? `${nodeHeight}px` : undefined,
        minWidth: `${minWidth}px`,
        minHeight: `${minHeight}px`,
        position: 'relative',
      }}
    >
      {children}
      {selected && (
        <>
          <div className="resize-handle resize-se" onMouseDown={(e) => handleResizeStart(e, 'se')} />
          <div className="resize-handle resize-sw" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
          <div className="resize-handle resize-ne" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
          <div className="resize-handle resize-nw" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
          <div className="resize-handle resize-e" onMouseDown={(e) => handleResizeStart(e, 'e')} />
          <div className="resize-handle resize-w" onMouseDown={(e) => handleResizeStart(e, 'w')} />
          <div className="resize-handle resize-s" onMouseDown={(e) => handleResizeStart(e, 's')} />
          <div className="resize-handle resize-n" onMouseDown={(e) => handleResizeStart(e, 'n')} />
        </>
      )}
    </div>
  )
}

export default memo(ResizableNodeWrapper)
```

- [ ] **Step 2: 更新 nodes/index.ts 注册包装后的节点**

```typescript
// src/nodes/index.ts - 修改每个节点的导出方式
import ResizableNodeWrapper from '@/components/node-editor/ResizableNodeWrapper'
import CharacterCardNode from './CharacterCardNode'
// ... 其他 imports

function withResize(Component: React.ComponentType<any>, minW = 200, minH = 100) {
  return memo((props: any) => (
    <ResizableNodeWrapper nodeProps={props} minWidth={minW} minHeight={minH}>
      <Component {...props} />
    </ResizableNodeWrapper>
  ))
}

export const nodeTypes = {
  assetInput: withResize(AssetInputNode, 180, 120),
  characterCard: withResize(CharacterCardNode, 220, 140),
  sceneCard: withResize(SceneCardNode, 220, 140),
  itemCard: withResize(ItemCardNode, 220, 140),
  script: withResize(ScriptNode, 200, 120),
  storyboard: withResize(StoryboardNode, 200, 120),
  prompt: withResize(PromptNode, 280, 200), // 更大以容纳内嵌 textarea
  gptImage2: withResize(GPTImageNode, 240, 200),
  seedance: withResize(SeedanceNode, 240, 200),
  banana: withResize(BananaNode, 240, 200),
  output: withResize(OutputNode, 200, 120),
} as const
```

- [ ] **Step 3: 添加 resize handle 的 CSS**

在 `src/index.css` 中添加：

```css
.resizable-node-wrapper {
  width: 100%;
  height: 100%;
}

.resize-handle {
  position: absolute;
  z-index: 20;
  background: transparent;
}

.resize-handle.resize-se { right: 0; bottom: 0; width: 10px; height: 10px; cursor: nwse-resize; }
.resize-handle.resize-sw { left: 0; bottom: 0; width: 10px; height: 10px; cursor: nesw-resize; }
.resize-handle.resize-ne { right: 0; top: 0; width: 10px; height: 10px; cursor: nesw-resize; }
.resize-handle.resize-nw { left: 0; top: 0; width: 10px; height: 10px; cursor: nwse-resize; }
.resize-handle.resize-e { right: -2px; top: 50%; width: 8px; height: 20px; cursor: ew-resize; transform: translateY(-50%); }
.resize-handle.resize-w { left: -2px; top: 50%; width: 8px; height: 20px; cursor: ew-resize; transform: translateY(-50%); }
.resize-handle.resize-s { bottom: -2px; left: 50%; width: 20px; height: 8px; cursor: ns-resize; transform: translateX(-50%); }
.resize-handle.resize-n { top: -2px; left: 50%; width: 20px; height: 8px; cursor: ns-resize; transform: translateX(-50%); }
```

- [ ] **Step 4: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/components/node-editor/ResizableNodeWrapper.tsx src/nodes/index.ts src/index.css
git commit -m "feat: add universal node resize wrapper with drag handles"
```

---

### Task 6: 重写三卡节点（多选支持 + 缩略图响应缩放）

**Files:**
- Modify: `src/nodes/CharacterCardNode.tsx`
- Modify: `src/nodes/SceneCardNode.tsx`
- Modify: `src/nodes/ItemCardNode.tsx`

- [ ] **Step 1: 重写 CharacterCardNode 支持多角色**

```typescript
// src/nodes/CharacterCardNode.tsx
import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { User } from 'lucide-react'
import { useFlowStore } from '@/store/useFlowStore'
import { useAssetStore } from '@/store/useAssetStore'
import { characters } from '@/data/characters'
import type { NodeData } from '@/types/flow'
import type { Asset } from '@/types/asset'

function CharacterCardNode({ id, data, selected }: NodeProps<NodeData>) {
  const characterName = data.characterName as string | undefined
  const characterNamesStr = data.characterNames as string | undefined
  const selectedIds = data.selectedCharacterIds as string[] | undefined
  const assetId = data.characterAssetId as string | undefined
  const assetImage = useAssetStore((s) => assetId ? s.assets.find(a => a.id === assetId)?.thumbnailPath : undefined)
  const refImage = (data.characterRefImage || assetImage) as string | undefined
  const nodeWidth = (data.nodeWidth as number) || undefined
  const nodeHeight = (data.nodeHeight as number) || undefined

  // 解析所有角色名
  const allNames: string[] = []
  if (characterNamesStr) {
    allNames.push(...characterNamesStr.split(/[,，、]/).map(s => s.trim()).filter(Boolean))
  } else if (characterName) {
    allNames.push(characterName)
  }

  const hasConsistency = !!(
    data.characterFacePrompt || data.characterBodyPrompt ||
    data.characterNegativePrompt || data.characterConsistencySeed != null
  )

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    const dataStr = e.dataTransfer.getData('application/asset')
    if (dataStr) {
      try {
        const asset: Asset = JSON.parse(dataStr)
        useFlowStore.getState().updateNodeData(id, { characterRefImage: asset.path || asset.id })
      } catch {}
    }
  }

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation() }

  // 根据节点尺寸计算缩略图大小
  const thumbSize = nodeWidth ? Math.max(40, Math.min(120, (nodeWidth - 80) / Math.max(1, allNames.length || 1))) : 56

  return (
    <div
      className={`node-container ${selected ? 'selected' : ''} ${hasConsistency ? 'node-consistent' : ''}`}
      style={{ borderColor: '#ff6b6b', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
      onDrop={onDrop} onDragOver={onDragOver}
    >
      <Handle type="source" position={Position.Right} id="output" />
      <div className="node-header">
        <div className="node-icon" style={{ background: '#ff6b6b' }}><User size={14} style={{ color: 'rgb(var(--bg-primary))' }} /></div>
        <span>{data.label || '角色卡'}</span>
        {hasConsistency && <span className="text-[9px] px-1 py-0.5 rounded bg-accent/15 text-accent font-medium ml-auto">🎯一致性</span>}
      </div>
      <div className="node-body" style={{ flex: 1, overflow: 'auto' }}>
        {allNames.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {refImage && (
              <div className="rounded overflow-hidden flex-shrink-0 bg-bg-tertiary" style={{ width: thumbSize, height: thumbSize }}>
                <img src={refImage.startsWith('http') || refImage.startsWith('data:') ? refImage : `file://${refImage}`}
                  className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} alt="" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {allNames.map((name, i) => (
                <div key={i} style={{ fontWeight: 600, color: '#ff6b6b', fontSize: nodeWidth && nodeWidth < 260 ? 10 : 12 }}>
                  {name}
                </div>
              ))}
              <div style={{ marginTop: 2, fontSize: 10, maxHeight: nodeHeight ? nodeHeight - 80 : 36, overflow: 'hidden' }}>
                {(data.characterAppearance as string)?.slice(0, nodeHeight ? Math.floor((nodeHeight - 80) / 14) * 20 : 50)}...
              </div>
            </div>
          </div>
        ) : (
          <span className="text-text-secondary" style={{ fontSize: 11 }}>未设置角色</span>
        )}
      </div>
    </div>
  )
}
export default memo(CharacterCardNode)
```

SceneCardNode 和 ItemCardNode 同样改造支持 `selectedSceneIds` / `selectedItemIds` 和 `sceneNames` / `itemNames` 逗号分隔。

- [ ] **Step 2: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/nodes/CharacterCardNode.tsx src/nodes/SceneCardNode.tsx src/nodes/ItemCardNode.tsx
git commit -m "feat: add multi-select support and responsive thumbnails to triple card nodes"
```

---

### Task 7: 重写 PromptNode（内嵌编辑 + 按钮 + 缩放）

**Files:**
- Modify: `src/nodes/PromptNode.tsx`

- [ ] **Step 1: 重写 PromptNode**

```typescript
// src/nodes/PromptNode.tsx
import { memo, useCallback, useState } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { FileText, RefreshCw, Sparkles, Loader2, Check, X } from 'lucide-react'
import { useFlowStore } from '@/store/useFlowStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { optimizePrompt } from '@/api/promptOptimize'
import type { NodeData } from '@/types/flow'

function PromptNode({ id, data, selected }: NodeProps<NodeData>) {
  const { nodes, edges, updateNodeData } = useFlowStore()
  const [optimizing, setOptimizing] = useState(false)
  const [optimizedResult, setOptimizedResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const nodeWidth = (data.nodeWidth as number) || undefined
  const nodeHeight = (data.nodeHeight as number) || undefined

  const promptText = (data.promptText as string) || ''

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, { promptText: e.target.value })
  }

  const handleRefreshFromUpstream = useCallback(() => {
    const upstreamNodeIds = new Set<string>()
    edges.filter((e) => e.target === id).forEach((e) => upstreamNodeIds.add(e.source))
    const upstreamNodes = nodes.filter((n) => upstreamNodeIds.has(n.id))

    const parts: string[] = []
    for (const un of upstreamNodes) {
      if (un.type === 'characterCard') {
        const name = un.data.characterName || un.data.characterNames
        const appearance = un.data.characterAppearance
        if (name && appearance) parts.push(`角色「${name}」：${appearance}`)
        else if (name) parts.push(`角色「${name}」`)
      } else if (un.type === 'sceneCard') {
        const name = un.data.sceneName || un.data.sceneNames
        const desc = un.data.sceneDescription
        if (name && desc) parts.push(`场景「${name}」：${desc}`)
        else if (name) parts.push(`场景「${name}」`)
      } else if (un.type === 'itemCard') {
        const name = un.data.itemName || un.data.itemNames
        const desc = un.data.itemDescription
        if (name && desc) parts.push(`物品「${name}」：${desc}`)
        else if (name) parts.push(`物品「${name}」`)
      } else if (un.type === 'script') {
        const heading = un.data.scriptSceneHeading
        const text = un.data.scriptText
        if (heading && text) parts.push(`[剧本·第${un.data.scriptSceneNumber}场 ${heading}]\n${text}`)
        else if (text) parts.push(`[剧本]\n${text}`)
      } else if (un.type === 'storyboard') {
        const shotNum = un.data.storyboardShotNumber
        const desc = un.data.storyboardShotDescription
        const dialogue = un.data.storyboardDialogue
        const shotType = un.data.storyboardShotType
        let sb = `[分镜·镜${shotNum}`
        if (shotType) sb += ` ${shotType}`
        sb += ']'
        if (desc) sb += `\n${desc}`
        if (dialogue) sb += `\n对白：「${dialogue}」`
        parts.push(sb)
      }
    }

    if (parts.length === 0) {
      useNotificationStore.getState().addNotification({
        type: 'warning', title: '无上游信息',
        message: '请先将角色卡/场景卡/物品卡/剧本/分镜节点连线到提示词节点。',
      })
      return
    }

    updateNodeData(id, { promptText: parts.join('\n\n') })
    useNotificationStore.getState().addNotification({
      type: 'success', title: '已刷新提示词',
      message: `已从 ${parts.length} 个上游节点收集信息`,
    })
  }, [id, nodes, edges, updateNodeData])

  const handleOptimize = async () => {
    if (!promptText.trim()) return
    setOptimizing(true)
    setOptimizedResult(null)
    setError(null)

    const upstream = findUpstream(id, nodes, edges)
    let characterContext = '', sceneContext = '', itemContext = '', scriptContext = ''
    for (const n of upstream) {
      if (n.type === 'characterCard') {
        const name = n.data.characterName || ''
        const appearance = n.data.characterAppearance || ''
        if (name || appearance) characterContext += `角色名：${name}\n外观：${appearance}\n\n`
      }
      if (n.type === 'sceneCard') {
        const name = n.data.sceneName || ''
        const desc = n.data.sceneDescription || ''
        if (name || desc) sceneContext += `场景名：${name}\n描述：${desc}\n\n`
      }
      if (n.type === 'itemCard') {
        const name = n.data.itemName || ''
        const desc = n.data.itemDescription || ''
        if (name || desc) itemContext += `物品名：${name}\n描述：${desc}\n\n`
      }
      if (n.type === 'script' && n.data.scriptText) {
        scriptContext += `${n.data.scriptText}\n\n`
      }
    }

    try {
      const res = await optimizePrompt({
        originalPrompt: promptText,
        characterContext: characterContext.trim() || undefined,
        sceneContext: sceneContext.trim() || undefined,
        itemContext: itemContext.trim() || undefined,
        scriptContext: scriptContext.trim() || undefined,
      })
      if (res.error) { setError(res.error) }
      else { setOptimizedResult(res.optimized) }
    } catch (e: any) {
      setError(e.message || '优化失败')
    }
    setOptimizing(false)
  }

  const handleAcceptOptimized = () => {
    if (optimizedResult) {
      updateNodeData(id, { promptText: optimizedResult })
      setOptimizedResult(null)
    }
  }

  const textareaHeight = nodeHeight ? Math.max(60, nodeHeight - 100) : 120

  return (
    <div className={`node-container ${selected ? 'selected' : ''}`}
      style={{ borderColor: '#a29bfe', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Handle type="target" position={Position.Left} id="input" />
      <Handle type="source" position={Position.Right} id="output" />
      <div className="node-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="node-icon" style={{ background: '#a29bfe' }}><FileText size={14} style={{ color: 'rgb(var(--bg-primary))' }} /></div>
          <span>{data.label || '提示词'}</span>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <button className="btn btn-ghost p-0.5 text-text-secondary hover:text-accent"
            onClick={(e) => { e.stopPropagation(); handleRefreshFromUpstream() }}
            title="从上游节点刷新">
            <RefreshCw size={12} />
          </button>
          <button className="btn btn-ghost p-0.5 text-text-secondary hover:text-accent"
            onClick={(e) => { e.stopPropagation(); handleOptimize() }}
            disabled={optimizing || !promptText.trim()} title="AI优化提示词">
            {optimizing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          </button>
        </div>
      </div>
      <div className="node-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '4px 8px', gap: 4 }}>
        <textarea
          className="prompt-node-textarea"
          style={{ flex: 1, minHeight: textareaHeight, resize: 'none' }}
          value={promptText}
          onChange={handleTextChange}
          placeholder="输入提示词，或连线后点击刷新按钮从上游节点自动拉取..."
          onClick={(e) => e.stopPropagation()}
        />
        {error && <div className="text-[10px] text-red-400 px-1">{error}</div>}
        {optimizedResult && (
          <div className="border border-accent/30 rounded p-1.5 bg-accent/5 text-[10px]">
            <div className="text-text-secondary mb-1">AI优化结果</div>
            <div className="max-h-20 overflow-y-auto mb-1">{optimizedResult}</div>
            <div className="flex gap-1">
              <button className="btn btn-accent text-[9px] py-0.5 px-2 flex items-center gap-1" onClick={handleAcceptOptimized}>
                <Check size={10} />采用
              </button>
              <button className="btn btn-ghost text-[9px] py-0.5 px-2" onClick={() => setOptimizedResult(null)}>
                <X size={10} />放弃
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function findUpstream(nodeId: string, nodes: any[], edges: any[], visited = new Set<string>()): any[] {
  if (visited.has(nodeId)) return []
  visited.add(nodeId)
  const upstream: any[] = []
  const incoming = edges.filter((e: any) => e.target === nodeId && !visited.has(e.source))
  for (const e of incoming) {
    const node = nodes.find((n: any) => n.id === e.source)
    if (node) { upstream.push(node); upstream.push(...findUpstream(node.id, nodes, edges, visited)) }
  }
  return upstream
}

export default memo(PromptNode)
```

- [ ] **Step 2: 添加 textarea 样式**

在 `src/index.css` 中添加：

```css
.prompt-node-textarea {
  background: rgb(var(--bg-tertiary));
  border: 1px solid rgb(var(--node-border) / 0.3);
  border-radius: 6px;
  color: rgb(var(--text-primary));
  font-size: 11px;
  line-height: 1.5;
  padding: 6px;
  width: 100%;
  outline: none;
}

.prompt-node-textarea:focus {
  border-color: rgb(var(--accent) / 0.5);
  box-shadow: 0 0 0 2px rgb(var(--accent) / 0.1);
}
```

- [ ] **Step 3: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add src/nodes/PromptNode.tsx src/index.css
git commit -m "feat: redesign PromptNode with inline textarea, refresh and AI optimize buttons"
```

---

### Task 8: 更新 Inspector 适配新节点（移除 Prompt textarea、三卡多