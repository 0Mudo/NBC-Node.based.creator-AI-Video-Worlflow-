import { useState, useCallback, useRef } from 'react'
import { useTimelineStore, type TimelineMediaItem, type TimelineRow } from '@/store/useTimelineStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useFlowStore } from '@/store/useFlowStore'
import { useInspirationStore } from '@/store/useInspirationStore'
import { useAssetStore } from '@/store/useAssetStore'
import { executeNode } from '@/store/useExecutionEngine'
import {
  Film, Plus, Import, Check, Clock,
  RotateCcw, Loader2, Download, Clapperboard, Image as ImageIcon, Pencil, Trash2,
} from 'lucide-react'
import EmptyState from '@/components/shared/EmptyState'

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}m${s}s` : `${s}s`
}

function ImportPanel({ onClose }: { onClose: () => void }) {
  const { importClipsFromScript } = useTimelineStore()
  const [text, setText] = useState('')

  const handleImport = () => {
    if (!text.trim()) return
    importClipsFromScript(text)
    setText('')
    onClose()
  }

  const handleFromInspiration = () => {
    const storyboardText = useInspirationStore.getState().getActiveData('storyboard').content || ''
    if (!storyboardText.trim()) {
      useNotificationStore.getState().addNotification({
        type: 'warning', title: '未找到分镜内容',
        message: '请先在灵感编辑器的「第2步：分镜」中编写分镜',
      })
      return
    }
    importClipsFromScript(storyboardText)
    onClose()
  }

  return (
    <div className="px-3 py-2 border-b border-node-border bg-bg-secondary/80 space-y-1.5">
      <textarea
        className="input text-[11px] w-full"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"每行一个分镜，支持「对白」解析，例如：\n全景·蜂医从巴别塔高处跃下 8秒 淡入淡出\n特写·疾风「快跟上!」从侧面突入 5秒 硬切"}
      />
      <div className="flex gap-1.5">
        <button className="btn btn-accent text-[11px]" onClick={handleImport}>导入时间线</button>
        <button className="btn btn-ghost text-[11px] border border-node-border" onClick={handleFromInspiration}>从灵感编辑器导入</button>
        <button className="btn btn-ghost text-[11px]" onClick={onClose}>取消</button>
      </div>
    </div>
  )
}

function BatchProgressBar({ current, total, generating }: { current: number; total: number; generating: boolean }) {
  if (!generating && current === 0) return null
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="px-3 py-1 border-b border-node-border bg-bg-secondary/50 flex items-center gap-2 flex-shrink-0">
      {generating ? <Loader2 size={12} className="animate-spin text-accent" /> : <Check size={12} className="text-green-400" />}
      <span className="text-[10px] text-text-primary">
        {generating ? `批量生成中... ${current}/${total}` : `全部完成! ${total} 个任务`}
      </span>
      <div className="flex-1 h-1.5 bg-node-border rounded-full overflow-hidden">
        <div className="h-full bg-accent transition-all duration-300 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-text-secondary">{pct}%</span>
    </div>
  )
}

function ExportDialog({ onClose }: { onClose: () => void }) {
  const rows = useTimelineStore((s) => s.rows)
  const [exportPath, setExportPath] = useState('')
  const [exporting, setExporting] = useState(false)
  const doneClips = rows
    .map((row) => {
      const active = row.videoBindings.find((item) => item.id === row.activeVideoId)
      return active ? { ...active, duration: row.duration } : null
    })
    .filter(Boolean) as Array<TimelineMediaItem & { duration: number }>

  const handleSelectPath = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.openDirectory()
      if (path) setExportPath(path)
    }
  }

  const handleExport = async () => {
    if (doneClips.length === 0) return
    setExporting(true)

    let concatScript = '# NBC Timeline Export\n# Generated: ' + new Date().toISOString() + '\n\n'
    concatScript += '# ffmpeg -f concat -safe 0 -i concat.txt -c copy output.mp4\n\n'
    doneClips.forEach((clip, index) => {
      concatScript += `file 'shot_${String(index + 1).padStart(3, '0')}.mp4'\n`
      concatScript += `duration ${clip.duration}\n`
    })
    concatScript += `file 'shot_${String(doneClips.length).padStart(3, '0')}.mp4'\n`

    try {
      const blob = new Blob([concatScript], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'nbc_export_script.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      if (exportPath && window.electronAPI) {
        const api = window.electronAPI
        const metaBlob = new Blob([concatScript], { type: 'text/plain' })
        const reader = new FileReader()
        reader.onload = async () => {
          const base64 = btoa(reader.result as string)
          await api.saveFile('nbc_export_script.txt', base64, exportPath)
        }
        reader.readAsText(metaBlob)
      }

      useNotificationStore.getState().addNotification({
        type: 'success',
        title: '导出脚本已生成',
        message: `已生成 ffmpeg 拼接脚本 (${doneClips.length} 个片段)。`,
      })
    } catch (e: any) {
      useNotificationStore.getState().addNotification({
        type: 'error',
        title: '导出失败',
        message: e.message || '未知错误',
      })
    }
    setExporting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-bg-primary border border-node-border rounded-xl p-6 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Download size={16} /> 导出视频
        </h3>
        <div className="space-y-3 mb-4">
          <div className="text-xs text-text-secondary">
            当前共 <span className="text-text-primary font-medium">{doneClips.length}</span> 个已绑定视频片段
          </div>
          <div>
            <label className="text-[10px] text-text-secondary block mb-1">输出目录（可选）</label>
            <div className="flex gap-1">
              <input className="input text-xs flex-1" value={exportPath} onChange={(e) => setExportPath(e.target.value)} placeholder="选择输出目录..." />
              <button className="btn btn-secondary text-xs px-2" onClick={handleSelectPath}>浏览</button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-secondary text-xs" onClick={onClose}>取消</button>
          <button className="btn btn-accent text-xs flex items-center gap-1" onClick={handleExport} disabled={exporting || doneClips.length === 0}>
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            {exporting ? '导出中...' : '导出脚本'}
          </button>
        </div>
      </div>
    </div>
  )
}

function createNodeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

function createTimelineEdge(source: string, target: string, sourceHandle = 'output', targetHandle = 'input') {
  return {
    id: `edge_${source}_${sourceHandle}_${target}_${targetHandle}`,
    source,
    target,
    sourceHandle,
    targetHandle,
  }
}

function getMediaStatus(bindings: TimelineMediaItem[]): 'empty' | 'generating' | 'failed' | 'done' {
  if (bindings.length === 0) return 'empty'
  if (bindings.some((item) => item.status === 'generating')) return 'generating'
  if (bindings.some((item) => item.status === 'failed')) return 'failed'
  return 'done'
}

function getRowStatus(row: TimelineRow): { tone: string; label: string } {
  const imageStatus = getMediaStatus(row.imageBindings)
  const videoStatus = getMediaStatus(row.videoBindings)
  if (imageStatus === 'generating' || videoStatus === 'generating') return { tone: 'text-yellow-400 bg-yellow-500/15', label: '生成中' }
  if (imageStatus === 'failed' || videoStatus === 'failed') return { tone: 'text-red-400 bg-red-500/15', label: '有失败' }
  if (imageStatus === 'done' && videoStatus === 'done') return { tone: 'text-green-400 bg-green-500/15', label: '已完成' }
  if (imageStatus === 'done' || videoStatus === 'done') return { tone: 'text-sky-400 bg-sky-500/15', label: '部分完成' }
  return { tone: 'text-text-secondary bg-bg-tertiary', label: '待生成' }
}

function TimelineMediaCell({
  row,
  mediaType,
  onGenerate,
  onEdit,
  onDelete,
  onBindAsset,
  onDropAsset,
}: {
  row: TimelineRow
  mediaType: 'image' | 'video'
  onGenerate: () => void
  onEdit: () => void
  onDelete: (bindingId: string) => void
  onBindAsset: (assetId: string) => void
  onDropAsset: (payload: string) => void
}) {
  const assets = useAssetStore((s) => s.assets.filter((asset) => asset.type === mediaType))
  const bindings = mediaType === 'image' ? row.imageBindings : row.videoBindings
  const activeId = mediaType === 'image' ? row.activeImageId : row.activeVideoId
  const status = getMediaStatus(bindings)
  const statusLabel = status === 'generating' ? '生成中' : status === 'failed' ? '失败' : status === 'done' ? '已完成' : '待生成'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <button className="btn btn-ghost text-[10px] px-2 py-1 border border-node-border" onClick={onEdit}>
          <Pencil size={11} className="mr-1" /> 编辑
        </button>
        <button className="btn btn-ghost text-[10px] px-2 py-1 border border-node-border" onClick={onGenerate}>
          {mediaType === 'image' ? <ImageIcon size={11} className="mr-1" /> : <Film size={11} className="mr-1" />}
          生成
        </button>
        <span className="ml-auto text-[10px] text-text-secondary">
          {bindings.length > 0 ? `${bindings.length} 个候选` : statusLabel}
        </span>
      </div>
      <select className="input text-[11px]" value="" onChange={(e) => { if (e.target.value) onBindAsset(e.target.value) }}>
        <option value="">从素材库/云端绑定...</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>{asset.name}</option>
        ))}
      </select>
      <div
        className={`grid gap-2 ${mediaType === 'image' ? 'grid-cols-2' : 'grid-cols-1'}`}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
        }}
        onDrop={(e) => {
          e.preventDefault()
          const payload = e.dataTransfer.getData('application/asset') || e.dataTransfer.getData('application/reactflow')
          if (payload) onDropAsset(payload)
        }}
      >
        {bindings.length > 0 ? bindings.map((binding) => (
          <div
            key={binding.id}
            className={`relative rounded-lg border ${binding.id === activeId ? 'border-accent' : 'border-node-border'} bg-bg-tertiary overflow-hidden`}
            onClick={() => useTimelineStore.getState().setActiveMediaBinding(row.id, mediaType, binding.id)}
          >
            {mediaType === 'video' ? (
              <video src={binding.sourceUrl} className="w-full h-24 object-cover" muted />
            ) : (
              <img src={binding.thumbnail || binding.sourceUrl} alt="" className="w-full h-24 object-cover" />
            )}
            <button
              className="absolute top-1 right-1 rounded bg-black/60 p-1 text-white hover:text-red-400"
              onClick={(e) => { e.stopPropagation(); onDelete(binding.id) }}
            >
              <Trash2 size={11} />
            </button>
            {binding.id === activeId && (
              <div className="absolute bottom-1 left-1 rounded bg-accent/80 px-1.5 py-0.5 text-[9px] text-white">
                当前
              </div>
            )}
          </div>
        )) : (
          <div className="h-24 rounded-lg border border-dashed border-node-border flex items-center justify-center text-[11px] text-text-secondary">
            暂无{mediaType === 'image' ? '分镜图' : '视频'}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TimelineView() {
  const rows = useTimelineStore((s) => s.rows)
  const addRow = useTimelineStore((s) => s.addRow)
  const updateRow = useTimelineStore((s) => s.updateRow)
  const removeRow = useTimelineStore((s) => s.removeRow)
  const removeMediaBinding = useTimelineStore((s) => s.removeMediaBinding)
  const bindMediaToRow = useTimelineStore((s) => s.bindMediaToRow)
  const nodes = useFlowStore((s) => s.nodes)
  const [showImport, setShowImport] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newDuration, setNewDuration] = useState(5)
  const [batchGenerating, setBatchGenerating] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  const batchCancelledRef = useRef(false)

  const totalDuration = rows.reduce((sum, row) => sum + row.duration, 0)
  const emptyImageCount = rows.filter((row) => row.imageBindings.length === 0).length
  const emptyVideoCount = rows.filter((row) => row.videoBindings.length === 0).length

  const handleAddRow = () => {
    if (!newLabel.trim()) return
    addRow({
      title: newLabel.trim(),
      promptText: newLabel.trim(),
      duration: Math.max(1, Math.min(60, newDuration)),
      spec: { characterIds: [], sceneIds: [], itemIds: [], shotType: '', transition: '硬切' },
      imageVariantCount: 1,
    })
    setNewLabel('')
    setNewDuration(5)
  }

  const handleEditRow = useCallback((row: TimelineRow, mediaType: 'image' | 'video') => {
    const flowStore = useFlowStore.getState()
    const addNode = flowStore.addNode
    const baseX = 300
    const baseY = 200
    let yOffset = 0
    const LAYOUT_GAP = 160
    const NODE_X = baseX + 50
    const existingNodes = flowStore.nodes
    const edgesToAdd = []

    const ensureNode = (type: string, factory: () => any) => {
      const existing = existingNodes.find((node) => node.type === type && node.data.timelineRowId === row.id)
      if (existing) return existing.id
      const created = factory()
      addNode(created)
      return created.id
    }

    const characterAssets = useAssetStore.getState().assets.filter((a) => a.type === 'text' && a.tags?.includes('Character'))
    const sceneAssets = useAssetStore.getState().assets.filter((a) => a.type === 'text' && a.tags?.includes('Scene'))
    const itemAssets = useAssetStore.getState().assets.filter((a) => a.type === 'text' && a.tags?.includes('Item'))

    let characterNodeId: string | undefined
    let sceneNodeId: string | undefined
    let itemNodeId: string | undefined

    if (row.spec.characterIds.length > 0) {
      const selected = characterAssets.filter((asset) => row.spec.characterIds.includes(asset.id))
      characterNodeId = ensureNode('characterCard', () => {
        const id = createNodeId('characterCard')
        return {
          id,
          type: 'characterCard',
          position: { x: NODE_X, y: baseY + yOffset },
          data: {
            label: selected.length > 1 ? `角色卡 (${selected.length})` : (selected[0]?.name || '角色卡'),
            _nodeId: id,
            timelineRowId: row.id,
            nodeWidth: 220,
            nodeHeight: 180,
            characterAssetId: selected[0]?.id,
            characterAssetIds: selected.map((asset) => asset.id),
            characterName: selected[0]?.name,
            characterNames: selected.map((asset) => asset.name),
            characterAppearance: selected[0]?.prompt || '',
            characterAppearances: selected.map((asset) => asset.prompt || ''),
            characterRefImage: selected[0]?.thumbnailPath || '',
            characterRefImages: selected.map((asset) => asset.thumbnailPath || '').filter(Boolean),
          },
        }
      })
      yOffset += LAYOUT_GAP
    }

    if (row.spec.sceneIds.length > 0) {
      const selected = sceneAssets.filter((asset) => row.spec.sceneIds.includes(asset.id))
      sceneNodeId = ensureNode('sceneCard', () => {
        const id = createNodeId('sceneCard')
        return {
          id,
          type: 'sceneCard',
          position: { x: NODE_X, y: baseY + yOffset },
          data: {
            label: selected.length > 1 ? `场景卡 (${selected.length})` : (selected[0]?.name || '场景卡'),
            _nodeId: id,
            timelineRowId: row.id,
            nodeWidth: 220,
            nodeHeight: 180,
            sceneAssetId: selected[0]?.id,
            sceneAssetIds: selected.map((asset) => asset.id),
            sceneName: selected[0]?.name,
            sceneNames: selected.map((asset) => asset.name),
            sceneDescription: selected[0]?.prompt || '',
            sceneDescriptions: selected.map((asset) => asset.prompt || ''),
            sceneRefImage: selected[0]?.thumbnailPath || '',
            sceneRefImages: selected.map((asset) => asset.thumbnailPath || '').filter(Boolean),
          },
        }
      })
      yOffset += LAYOUT_GAP
    }

    if (row.spec.itemIds.length > 0) {
      const selected = itemAssets.filter((asset) => row.spec.itemIds.includes(asset.id))
      itemNodeId = ensureNode('itemCard', () => {
        const id = createNodeId('itemCard')
        return {
          id,
          type: 'itemCard',
          position: { x: NODE_X, y: baseY + yOffset },
          data: {
            label: selected.length > 1 ? `物品卡 (${selected.length})` : (selected[0]?.name || '物品卡'),
            _nodeId: id,
            timelineRowId: row.id,
            nodeWidth: 220,
            nodeHeight: 180,
            itemAssetId: selected[0]?.id,
            itemAssetIds: selected.map((asset) => asset.id),
            itemName: selected[0]?.name,
            itemNames: selected.map((asset) => asset.name),
            itemDescription: selected[0]?.prompt || '',
            itemDescriptions: selected.map((asset) => asset.prompt || ''),
            itemRefImage: selected[0]?.thumbnailPath || '',
            itemRefImages: selected.map((asset) => asset.thumbnailPath || '').filter(Boolean),
          },
        }
      })
      yOffset += LAYOUT_GAP
    }

    const scriptId = ensureNode('script', () => {
      const id = createNodeId('script')
      return {
        id,
        type: 'script',
        position: { x: NODE_X - 220, y: baseY + yOffset },
        data: {
          label: row.title,
          _nodeId: id,
          timelineRowId: row.id,
          nodeWidth: 240,
          nodeHeight: 180,
          scriptText: row.promptText,
        },
      }
    })
    yOffset += LAYOUT_GAP

    const storyboardId = ensureNode('storyboard', () => {
      const id = createNodeId('storyboard')
      return {
        id,
        type: 'storyboard',
        position: { x: NODE_X, y: baseY + yOffset },
        data: {
          label: row.title,
          _nodeId: id,
          timelineRowId: row.id,
          nodeWidth: 240,
          nodeHeight: 180,
          storyboardShotDescription: row.promptText || row.title,
          storyboardShotType: row.spec.shotType || '',
          storyboardDialogue: row.spec.dialogue || '',
          storyboardCharacterIds: row.spec.characterIds || [],
          storyboardSceneId: row.spec.sceneIds[0] || '',
          storyboardItemIds: row.spec.itemIds || [],
        },
      }
    })
    yOffset += LAYOUT_GAP

    const promptId = ensureNode('prompt', () => {
      const id = createNodeId('prompt')
      return {
        id,
        type: 'prompt',
        position: { x: NODE_X + 220, y: baseY + yOffset },
        data: {
          label: `提示词 ${row.order + 1}`,
          _nodeId: id,
          timelineRowId: row.id,
          nodeWidth: 280,
          nodeHeight: 220,
          promptText: row.promptText,
        },
      }
    })
    yOffset += LAYOUT_GAP

    const generationNodeId = ensureNode(mediaType === 'image' ? 'gptImage2' : 'seedance', () => {
      const id = createNodeId(mediaType === 'image' ? 'gptImage2' : 'seedance')
      return {
        id,
        type: mediaType === 'image' ? 'gptImage2' : 'seedance',
        position: { x: NODE_X + 440, y: baseY + yOffset },
        data: {
          label: mediaType === 'image' ? `分镜画面 ${row.order + 1}` : `视频画面 ${row.order + 1}`,
          _nodeId: id,
          timelineRowId: row.id,
          timelineMediaType: mediaType,
          nodeWidth: 240,
          nodeHeight: 180,
          batchCount: mediaType === 'image' ? row.imageVariantCount : 1,
          ...(mediaType === 'image'
            ? { gptImageModel: 'gpt-image-2' }
            : { seedanceModelId: 'doubao-seedance-2-0-260128' }),
        },
      }
    })

    const orderedNodes = [characterNodeId, sceneNodeId, itemNodeId, scriptId, storyboardId, promptId, generationNodeId].filter(Boolean) as string[]
    for (let i = 0; i < orderedNodes.length - 1; i++) {
      edgesToAdd.push(createTimelineEdge(orderedNodes[i], orderedNodes[i + 1]))
    }
    flowStore.addEdges(edgesToAdd)

    useNotificationStore.getState().addNotification({
      type: 'info',
      title: `已打开编辑：「${row.title}」`,
      message: `已调出三卡、剧本、分镜、提示词和${mediaType === 'image' ? '分镜画面' : '视频画面'}生成节点。`,
    })
  }, [])

  const handleGenerateRow = useCallback(async (row: TimelineRow, mediaType: 'image' | 'video') => {
    const targetNode = nodes.find((node) =>
      node.data.timelineRowId === row.id &&
      node.data.timelineMediaType === mediaType &&
      ((mediaType === 'image' && node.type === 'gptImage2') || (mediaType === 'video' && node.type === 'seedance'))
    )
    if (!targetNode) {
      handleEditRow(row, mediaType)
      useNotificationStore.getState().addNotification({
        type: 'info',
        title: '已创建生成节点',
        message: '请再次点击生成，或到画布直接运行新生成节点。',
      })
      return
    }
    await executeNode(targetNode.id)
  }, [nodes, handleEditRow])

  const handleBatchGenerate = useCallback(async (mediaType: 'image' | 'video') => {
    const targets = rows.filter((row) => mediaType === 'image' ? row.imageBindings.length === 0 : row.videoBindings.length === 0)
    if (targets.length === 0) {
      useNotificationStore.getState().addNotification({
        type: 'warning', title: '无需生成',
        message: mediaType === 'image' ? '没有待生成的分镜图' : '没有待生成的视频片段',
      })
      return
    }

    setBatchGenerating(true)
    batchCancelledRef.current = false
    setBatchProgress({ current: 0, total: targets.length })
    for (let i = 0; i < targets.length; i++) {
      if (batchCancelledRef.current) break
      try {
        await handleGenerateRow(targets[i], mediaType)
      } finally {
        setBatchProgress((prev) => ({ ...prev, current: prev.current + 1 }))
      }
    }
    setBatchGenerating(false)
    batchCancelledRef.current = false
  }, [rows, handleGenerateRow])

  const handleClearAll = useCallback(() => {
    rows.forEach((row) => removeRow(row.id))
  }, [rows, removeRow])

  const handleBindAsset = (rowId: string, mediaType: 'image' | 'video', assetId: string) => {
    const asset = useAssetStore.getState().assets.find((item) => item.id === assetId)
    if (!asset) return
    bindMediaToRow(rowId, mediaType, {
      kind: 'asset',
      type: mediaType,
      sourceUrl: asset.path,
      thumbnail: asset.thumbnailPath || asset.path,
      assetId: asset.id,
      status: 'done',
    })
  }

  const handleDropAsset = (rowId: string, mediaType: 'image' | 'video', payload: string) => {
    try {
      const parsed = JSON.parse(payload)
      const assetId = parsed.id || parsed.assetId || parsed.path || parsed.url
      const asset = useAssetStore.getState().assets.find((item) => item.id === assetId || item.path === assetId)
      if (!asset) return
      handleBindAsset(rowId, mediaType, asset.id)
    } catch {
      // ignore malformed drag payload
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1 bg-bg-secondary border-b border-node-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Film size={13} className="text-accent" />
          <span className="text-[11px] font-semibold">时间线</span>
          <span className="flex items-center gap-0.5 text-[10px] text-text-secondary">
            <Clock size={10} />
            {formatDuration(totalDuration)}
            <span className="text-[9px] opacity-60">({rows.length} 分镜)</span>
          </span>
          {(emptyImageCount > 0 || emptyVideoCount > 0) ? (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-400 rounded-full">
              图 {emptyImageCount} / 视频 {emptyVideoCount} 待生成
            </span>
          ) : rows.length > 0 ? (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-green-500/20 text-green-400 rounded-full">
              全部已生成
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost p-1 text-text-secondary hover:text-accent" onClick={() => setShowImport(!showImport)} title="导入分镜">
            <Import size={11} />
          </button>
          <button className="btn btn-ghost p-1 text-accent hover:bg-accent/10" onClick={() => handleBatchGenerate('image')} disabled={batchGenerating} title="一键生成所有分镜画面">
            {batchGenerating ? <Loader2 size={11} className="animate-spin" /> : <ImageIcon size={11} />}
          </button>
          <button className="btn btn-ghost p-1 text-accent hover:bg-accent/10" onClick={() => handleBatchGenerate('video')} disabled={batchGenerating} title="一键生成所有片段视频">
            {batchGenerating ? <Loader2 size={11} className="animate-spin" /> : <Clapperboard size={11} />}
          </button>
          {batchGenerating && (
            <button className="btn btn-ghost p-1 text-red-400 hover:bg-red-500/10" onClick={() => { batchCancelledRef.current = true }} title="取消批量生成">
              <Trash2 size={11} />
            </button>
          )}
          {rows.some((row) => row.videoBindings.length > 0) && (
            <button className="btn btn-ghost p-1 text-text-secondary hover:text-accent" onClick={() => setShowExport(true)} title="导出视频">
              <Download size={11} />
            </button>
          )}
          {rows.length > 0 && (
            <button className="btn btn-ghost p-1 text-text-secondary hover:text-red-400" onClick={handleClearAll} title="清空">
              <RotateCcw size={11} />
            </button>
          )}
        </div>
      </div>

      {showImport && <ImportPanel onClose={() => setShowImport(false)} />}
      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}

      <BatchProgressBar current={batchProgress.current} total={batchProgress.total} generating={batchGenerating} />

      <div className="px-3 py-1 border-b border-node-border/50 bg-bg-secondary/30 flex items-center gap-1.5 flex-shrink-0">
        <input
          className="input text-[10px] py-0.5 flex-1 min-w-0"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="快速添加分镜行... (Enter 确认)"
          onKeyDown={(e) => e.key === 'Enter' && handleAddRow()}
        />
        <input
          className="input text-[10px] py-0.5 text-center"
          style={{ width: '48px', flexShrink: 0 }}
          type="number" min={1} max={60}
          value={newDuration}
          onChange={(e) => setNewDuration(parseInt(e.target.value) || 5)}
        />
        <span className="text-[9px] text-text-secondary flex-shrink-0">s</span>
        <button className="btn btn-ghost p-1 text-text-secondary hover:text-accent flex-shrink-0" onClick={handleAddRow}>
          <Plus size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        {rows.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <EmptyState icon={Film} title="暂无分镜" subtitle="导入灵感编辑器分镜，或手动新增一行" />
          </div>
        ) : (
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[72px_1.4fr_1fr_1fr] sticky top-0 z-10 bg-bg-secondary border-b border-node-border">
              <div className="px-3 py-2 text-[11px] font-semibold text-text-secondary">序号</div>
              <div className="px-3 py-2 text-[11px] font-semibold text-text-secondary">提示词</div>
              <div className="px-3 py-2 text-[11px] font-semibold text-text-secondary">分镜画面</div>
              <div className="px-3 py-2 text-[11px] font-semibold text-text-secondary">视频画面</div>
            </div>
            {rows.map((row) => (
              <div key={row.id} className="grid grid-cols-[72px_1.4fr_1fr_1fr] border-b border-node-border/30">
                <div className="px-3 py-3 text-[11px] text-text-secondary">
                  <div className="flex items-center justify-between">
                    <span>{row.order + 1}</span>
                    <button
                      className="text-text-secondary hover:text-red-400 p-0.5 rounded hover:bg-red-500/10"
                      onClick={() => removeRow(row.id)}
                      title="删除此行"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                  <div className="mt-1">{row.duration}s</div>
                  <div className={`mt-2 inline-flex rounded px-1.5 py-0.5 text-[9px] ${getRowStatus(row).tone}`}>
                    {getRowStatus(row).label}
                  </div>
                </div>
                <div className="px-3 py-3 space-y-2">
                  <textarea
                    className="input text-[11px] w-full min-h-[132px]"
                    value={row.promptText}
                    onChange={(e) => updateRow(row.id, { promptText: e.target.value, title: e.target.value.slice(0, 24) || row.title })}
                    placeholder="这里汇总三卡、场次、分镜和提示词文本..."
                  />
                  <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                    <span>分镜图数量</span>
                    <input
                      className="input w-16 text-center"
                      type="number"
                      min={1}
                      max={4}
                      value={row.imageVariantCount}
                      onChange={(e) => updateRow(row.id, { imageVariantCount: Math.min(4, Math.max(1, parseInt(e.target.value) || 1)) })}
                    />
                  </div>
                </div>
                <div className="px-3 py-3">
                  <TimelineMediaCell
                    row={row}
                    mediaType="image"
                    onGenerate={() => handleGenerateRow(row, 'image')}
                    onEdit={() => handleEditRow(row, 'image')}
                    onDelete={(bindingId) => removeMediaBinding(row.id, 'image', bindingId)}
                    onBindAsset={(assetId) => handleBindAsset(row.id, 'image', assetId)}
                    onDropAsset={(payload) => handleDropAsset(row.id, 'image', payload)}
                  />
                </div>
                <div className="px-3 py-3">
                  <TimelineMediaCell
                    row={row}
                    mediaType="video"
                    onGenerate={() => handleGenerateRow(row, 'video')}
                    onEdit={() => handleEditRow(row, 'video')}
                    onDelete={(bindingId) => removeMediaBinding(row.id, 'video', bindingId)}
                    onBindAsset={(assetId) => handleBindAsset(row.id, 'video', assetId)}
                    onDropAsset={(payload) => handleDropAsset(row.id, 'video', payload)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-node-border p-1.5 flex items-center gap-2 bg-bg-secondary flex-shrink-0">
        <button className="btn btn-ghost text-[10px] py-0.5 px-2 flex items-center gap-1 border border-node-border" onClick={handleAddRow}>
          <Plus size={10} /> 添加分镜行
        </button>
        <div className="flex-1" />
        <span className="text-[9px] text-text-secondary">
          {rows.length} 分镜 · 图 {rows.reduce((sum, row) => sum + row.imageBindings.length, 0)} 张 · 视频 {rows.reduce((sum, row) => sum + row.videoBindings.length, 0)} 段
        </span>
      </div>
    </div>
  )
}
