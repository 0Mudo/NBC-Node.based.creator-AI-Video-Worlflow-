import { useState, useCallback, useRef, useEffect, memo } from 'react'
import { useTimelineStore, type TrackClip } from '@/store/useTimelineStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useFlowStore } from '@/store/useFlowStore'
import { useInspirationStore } from '@/store/useInspirationStore'
import { useAssetStore } from '@/store/useAssetStore'
import { executeNode } from '@/store/useExecutionEngine'
import {
  Film, Plus, Trash2, GripVertical, X, Import, Check, Clock,
  Play, RotateCcw, ChevronDown, ChevronRight, Eye, EyeOff,
  Volume2, VolumeX, Lock, Unlock, Loader2, Download, Clapperboard,
} from 'lucide-react'
import EmptyState from '@/components/shared/EmptyState'
import { safeGetItem, safeSetItem } from '@/utils/safeStorage'

const SHOT_OPTIONS = ['', '全景', '中景', '近景', '特写', '远景', '大远景', '中近景', '大特写']
const TRANSITION_OPTIONS = ['硬切', '淡入淡出', '叠化', '擦除', '滑入', '缩放']
const MIN_CLIP_PX = 80
const SNAP_THRESHOLD_PX = 6
const TRIM_EDGE_PX = 8

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}m${s}s` : `${s}s`
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function snapTime(time: number, snapPoints: number[], pxPerSec: number): number {
  const threshold = SNAP_THRESHOLD_PX / pxPerSec
  let best = time
  let bestDist = Infinity
  for (const p of snapPoints) {
    const dist = Math.abs(p - time)
    if (dist < threshold && dist < bestDist) {
      best = p
      bestDist = dist
    }
  }
  return best
}

function ClipBlock({
  clip, pxPerSec, snapPoints, onUpdate, onDelete, onAnalyzeClip,
}: {
  clip: TrackClip
  pxPerSec: number
  snapPoints: number[]
  onUpdate: (updates: Partial<TrackClip>) => void
  onDelete: () => void
  onAnalyzeClip: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [dragging, setDragging] = useState<'move' | 'trimLeft' | 'trimRight' | null>(null)
  const dragStartRef = useRef({ mouseX: 0, startTime: 0, startDur: 0 })
  const widthPx = Math.max(MIN_CLIP_PX, clip.duration * pxPerSec)

  const handleMouseDown = useCallback((e: React.MouseEvent, mode: 'move' | 'trimLeft' | 'trimRight') => {
    e.stopPropagation()
    e.preventDefault()
    setDragging(mode)
    dragStartRef.current = {
      mouseX: e.clientX,
      startTime: clip.startTime,
      startDur: clip.duration,
    }
  }, [clip.startTime, clip.duration])

  useEffect(() => {
    if (!dragging) return
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.mouseX
      const dt = dx / pxPerSec

      if (dragging === 'move') {
        const rawTime = dragStartRef.current.startTime + dt
        const snapped = snapTime(rawTime, snapPoints, pxPerSec)
        onUpdate({ startTime: Math.max(0, snapped) })
      } else if (dragging === 'trimLeft') {
        const rawTime = dragStartRef.current.startTime + dt
        const snapped = snapTime(rawTime, snapPoints, pxPerSec)
        const maxStart = dragStartRef.current.startTime + dragStartRef.current.startDur - 1
        const newStart = Math.max(0, Math.min(snapped, maxStart))
        const newDur = dragStartRef.current.startDur + (dragStartRef.current.startTime - newStart)
        if (newDur >= 1) onUpdate({ startTime: newStart, duration: Math.round(newDur) })
      } else if (dragging === 'trimRight') {
        const newDur = Math.max(1, Math.round(dragStartRef.current.startDur + dt))
        onUpdate({ duration: newDur })
      }
    }
    const handleMouseUp = () => setDragging(null)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, pxPerSec, snapPoints, onUpdate])

  const statusColor =
    clip.status === 'done' ? 'border-green-500/50 bg-green-500/10' :
    clip.status === 'generating' ? 'border-yellow-500/50 bg-yellow-500/10 animate-pulse' :
    clip.status === 'failed' ? 'border-red-500/50 bg-red-500/10' :
    'border-blue-400/30 bg-blue-400/5 border-dashed'

  return (
    <div
      className={`absolute top-1 bottom-1 rounded-lg border-2 ${statusColor} overflow-hidden group transition-colors ${dragging ? 'z-30 ring-2 ring-accent' : 'z-10'} ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{ left: clip.startTime * pxPerSec, width: widthPx }}
      title={`${clip.label} (${formatDuration(clip.duration)})`}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
    >
      {clip.status === 'empty' ? (
        <div className="flex items-center justify-center h-full" onClick={onAnalyzeClip}>
          <div className="flex flex-col items-center gap-0.5 text-[9px] text-text-secondary hover:text-accent">
            <Play size={12} />
            <span className="truncate max-w-full px-2">{clip.label.slice(0, 12)}</span>
            <span className="text-[8px] opacity-50">{clip.spec.shotType || '未指定'}</span>
          </div>
        </div>
      ) : clip.status === 'generating' ? (
        <div className="flex items-center justify-center h-full text-[9px] text-yellow-400 gap-1">
          <Loader2 size={10} className="animate-spin" />
          <span>生成中...</span>
        </div>
      ) : clip.status === 'failed' ? (
        <div className="flex items-center justify-center h-full text-[9px] text-red-400 gap-1">
          <span>失败</span>
          <button className="underline hover:text-red-300" onClick={(e) => { e.stopPropagation(); onAnalyzeClip() }}>重试</button>
        </div>
      ) : clip.sourceType === 'video' ? (
        <video src={clip.sourceUrl} className="w-full h-full object-cover pointer-events-none" muted />
      ) : clip.sourceType === 'image' ? (
        <img src={clip.sourceUrl} alt="" className="w-full h-full object-cover pointer-events-none" />
      ) : (
        <div className="flex items-center justify-center h-full text-[9px] text-text-secondary px-2 truncate pointer-events-none">
          {clip.label}
        </div>
      )}

      {/* Trim handles (visible on hover for done clips) */}
      {clip.status === 'done' && (
        <>
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-accent/30 opacity-0 group-hover:opacity-100 transition-opacity z-20"
            onMouseDown={(e) => handleMouseDown(e, 'trimLeft')}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-accent/30 opacity-0 group-hover:opacity-100 transition-opacity z-20"
            onMouseDown={(e) => handleMouseDown(e, 'trimRight')}
          />
        </>
      )}

      <button
        className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity z-20"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
      >
        <X size={10} />
      </button>

      {clip.status === 'done' && (
        <button
          className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-black/50 text-text-secondary opacity-0 group-hover:opacity-100 hover:text-accent transition-opacity z-20"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
        >
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </button>
      )}

      {expanded && clip.status === 'done' && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 text-[9px] text-text-secondary space-y-0.5 z-20">
          <div className="flex justify-between">
            <span>{clip.label.slice(0, 20)}</span>
            <span>{clip.spec.shotType || '未指定'}</span>
          </div>
          <div className="flex justify-between">
            <span>{formatDuration(clip.duration)}</span>
            <span>{clip.spec.transition}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function TrackHeader({ track, onToggleMute, onToggleLock, onToggleVisible, onDelete }: {
  track: import('@/store/useTimelineStore').Track
  onToggleMute: () => void
  onToggleLock: () => void
  onToggleVisible: () => void
  onDelete?: () => void
}) {
  const color = track.color || '#6c5ce7'
  return (
    <div className="flex items-center gap-1 px-2 flex-shrink-0 border-r border-node-border/50" style={{ width: 80 }}>
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[10px] font-medium truncate flex-1">{track.name}</span>
      <div className="flex gap-0.5">
        <button className="p-0.5 text-text-secondary hover:text-accent" onClick={onToggleMute} title={track.muted ? '取消静音' : '静音'}>
          {track.muted ? <VolumeX size={10} /> : <Volume2 size={10} />}
        </button>
        <button className="p-0.5 text-text-secondary hover:text-accent" onClick={onToggleLock} title={track.locked ? '解锁' : '锁定'}>
          {track.locked ? <Lock size={10} /> : <Unlock size={10} />}
        </button>
        <button className="p-0.5 text-text-secondary hover:text-accent" onClick={onToggleVisible} title={track.visible ? '隐藏' : '显示'}>
          {track.visible ? <Eye size={10} /> : <EyeOff size={10} />}
        </button>
        {track.type === 'custom' && onDelete && (
          <button className="p-0.5 text-text-secondary hover:text-red-400" onClick={onDelete} title="删除轨道">
            <X size={10} />
          </button>
        )}
      </div>
    </div>
  )
}

function ImportPanel({ onClose, videoTrackId }: { onClose: () => void; videoTrackId?: string }) {
  const { importClipsFromScript } = useTimelineStore()
  const [text, setText] = useState('')

  const handleImport = () => {
    if (!text.trim()) return
    importClipsFromScript(text, videoTrackId)
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
    importClipsFromScript(storyboardText, videoTrackId)
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
        <button className="btn btn-accent text-[11px]" onClick={handleImport}>导入到轨道</button>
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
        {generating ? `批量生成中... ${current}/${total}` : `全部完成! ${total} 个片段`}
      </span>
      <div className="flex-1 h-1.5 bg-node-border rounded-full overflow-hidden">
        <div className="h-full bg-accent transition-all duration-300 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-text-secondary">{pct}%</span>
    </div>
  )
}

function ExportDialog({ onClose }: { onClose: () => void }) {
  const tracks = useTimelineStore((s) => s.tracks)
  const [exportPath, setExportPath] = useState('')
  const [exporting, setExporting] = useState(false)
  const videoTrack = tracks.find(t => t.type === 'video')
  const doneClips = videoTrack?.clips.filter(c => c.status === 'done' && c.sourceUrl) || []

  const handleSelectPath = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.openDirectory()
      if (path) setExportPath(path)
    }
  }

  const handleExport = async () => {
    if (!videoTrack || doneClips.length === 0) return
    setExporting(true)

    const sortedClips = [...doneClips].sort((a, b) => a.startTime - b.startTime)

    // Build ffmpeg-concat style playlist
    const fileList = sortedClips.map((c, i) => {
      const ext = c.sourceType === 'video' ? '.mp4' : '.png'
      return { url: c.sourceUrl, name: `shot_${String(i + 1).padStart(3, '0')}${ext}`, duration: c.duration, transition: c.spec.transition }
    })

    // Generate concat script for ffmpeg
    let concatScript = '# NBC Timeline Export\n# Generated: ' + new Date().toISOString() + '\n\n'
    concatScript += '# === ffmpeg concat method ===\n'
    concatScript += '# Save this script and run:\n'
    concatScript += '#   ffmpeg -f concat -safe 0 -i concat.txt -c copy output.mp4\n\n'
    concatScript += '# === OR use complex filter for transitions ===\n'
    concatScript += `# Total clips: ${fileList.length}\n\n`

    concatScript += '# ---- File list for concat ----\n'
    for (const f of fileList) {
      concatScript += `file '${f.name}'\n`
      concatScript += `duration ${f.duration}\n`
    }
    concatScript += `file '${fileList[fileList.length - 1].name}'\n`

    concatScript += '\n# ---- Complex filter with transitions ----\n'
    concatScript += '# ffmpeg \\\n'
    for (let i = 0; i < fileList.length; i++) {
      concatScript += `#   -i "${fileList[i].name}" \\\n`
    }
    concatScript += '#   -filter_complex "'
    let filterParts: string[] = []
    for (let i = 0; i < fileList.length; i++) {
      filterParts.push(`[${i}:v]`)
    }
    if (fileList.length > 1) {
      concatScript += filterParts.join('') + `concat=n=${fileList.length}:v=1:a=0[outv]" \\\n`
    } else {
      concatScript += `[0:v]copy[outv]" \\\n`
    }
    concatScript += '#   -map "[outv]" \\\n'
    concatScript += '#   -c:v libx264 -preset medium -crf 18 \\\n'
    concatScript += '#   output_final.mp4\n'

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

      // Also try to save to local if electron
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
        message: `已生成 ffmpeg 拼接脚本 (${fileList.length} 个片段)。下载后在素材目录运行 ffmpeg 命令即可合并。`,
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
            视频轨共 <span className="text-text-primary font-medium">{doneClips.length}</span> 个已完成片段
          </div>
          {doneClips.length === 0 && (
            <div className="text-xs text-yellow-400">没有可导出的片段，请先生成视频轨上的空片段</div>
          )}
          <div>
            <label className="text-[10px] text-text-secondary block mb-1">输出目录（可选）</label>
            <div className="flex gap-1">
              <input
                className="input text-xs flex-1"
                value={exportPath}
                onChange={(e) => setExportPath(e.target.value)}
                placeholder="选择输出目录..."
              />
              <button className="btn btn-secondary text-xs px-2" onClick={handleSelectPath}>
                浏览
              </button>
            </div>
          </div>
          <div className="text-[10px] text-text-secondary bg-bg-secondary p-2 rounded">
            导出方式：生成 ffmpeg 拼接脚本。下载脚本后在素材目录运行 ffmpeg 命令即可将时间线上的所有片段合并为一个视频文件。
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-secondary text-xs" onClick={onClose}>取消</button>
          <button
            className="btn btn-accent text-xs flex items-center gap-1"
            onClick={handleExport}
            disabled={exporting || doneClips.length === 0}
          >
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            {exporting ? '导出中...' : '导出脚本'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TimelineView() {
  const tracks = useTimelineStore((s) => s.tracks)
  const playheadTime = useTimelineStore((s) => s.playheadTime)
  const zoomLevel = useTimelineStore((s) => s.zoomLevel)
  const addTrack = useTimelineStore((s) => s.addTrack)
  const updateTrack = useTimelineStore((s) => s.updateTrack)
  const removeTrack = useTimelineStore((s) => s.removeTrack)
  const removeClip = useTimelineStore((s) => s.removeClip)
  const updateClip = useTimelineStore((s) => s.updateClip)
  const addClip = useTimelineStore((s) => s.addClip)
  const getSnapPoints = useTimelineStore((s) => s.getSnapPoints)
  const getTotalDuration = useTimelineStore((s) => s.getTotalDuration)
  const setPlayheadTime = useTimelineStore((s) => s.setPlayheadTime)
  const setZoomLevel = useTimelineStore((s) => s.setZoomLevel)
  const nodes = useFlowStore((s) => s.nodes)
  const [showImport, setShowImport] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newDuration, setNewDuration] = useState(5)
  const [batchGenerating, setBatchGenerating] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })

  const videoTrack = tracks.find(t => t.type === 'video')
  const videoClips = videoTrack?.clips || []
  const totalDuration = getTotalDuration()
  const emptyCount = videoClips.filter(c => c.status === 'empty').length
  const pxPerSec = zoomLevel
  const snapPoints = getSnapPoints()

  const handleAddClip = () => {
    if (!newLabel.trim() || !videoTrack) return
    const duration = Math.max(1, Math.min(60, newDuration))
    const lastClip = videoClips.length > 0 ? videoClips[videoClips.length - 1] : null
    const startTime = lastClip ? lastClip.startTime + lastClip.duration : 0
    addClip(videoTrack.id, {
      trackId: videoTrack.id,
      label: newLabel.trim(),
      startTime,
      duration,
      sourceUrl: '',
      sourceType: 'text',
      status: 'empty',
      spec: { characterIds: [], sceneId: '', shotType: '', transition: '硬切' },
      opacity: 1,
      volume: 1,
    })
    setNewLabel('')
    setNewDuration(5)
  }

  const handleAnalyzeClip = useCallback((clip: TrackClip) => {
    const spec = clip.spec
    const addNode = useFlowStore.getState().addNode
    const existingNodes = nodes
    let nodeId = 0
    function makeId(type: string): string { return `${type}_${++nodeId}_${Date.now()}` }

    const createdNodes: string[] = []
    const baseX = 300
    const baseY = 200
    let yOffset = 0
    const LAYOUT_GAP = 160
    const NODE_X = baseX + 50

    const characterAssets = useAssetStore.getState().assets.filter(
      (a) => a.type === 'text' && a.tags?.includes('Character')
    )
    const sceneAssets = useAssetStore.getState().assets.filter(
      (a) => a.type === 'text' && a.tags?.includes('Scene')
    )
    const itemAssets = useAssetStore.getState().assets.filter(
      (a) => a.type === 'text' && a.tags?.includes('Item')
    )

    // 1. Character Cards
    if (spec.characterIds && spec.characterIds.length > 0) {
      for (const charId of spec.characterIds) {
        const existing = existingNodes.find(
          (n) => n.type === 'characterCard' && n.data.characterAssetId === charId
        )
        if (!existing) {
          const charAsset = characterAssets.find((a) => a.id === charId)
          if (charAsset) {
            const id = makeId('characterCard')
            addNode({
              id,
              type: 'characterCard',
              position: { x: NODE_X, y: baseY + yOffset },
              data: {
                label: charAsset.name || '角色卡',
                _nodeId: id,
                characterAssetId: charId,
                characterName: charAsset.name,
                characterAppearance: charAsset.prompt || '',
                characterRefImage: charAsset.thumbnailPath || '',
              },
            })
            createdNodes.push(`角色卡「${charAsset.name}」`)
            yOffset += LAYOUT_GAP
          }
        } else {
          createdNodes.push(`角色卡「${existing.data.characterName || charId}」(已存在)`)
        }
      }
    }

    // 2. Scene Card
    if (spec.sceneId) {
      const existing = existingNodes.find(
        (n) => n.type === 'sceneCard' && n.data.sceneAssetId === spec.sceneId
      )
      if (!existing) {
        const sceneAsset = sceneAssets.find((a) => a.id === spec.sceneId)
        if (sceneAsset) {
          const id = makeId('sceneCard')
          addNode({
            id,
            type: 'sceneCard',
            position: { x: NODE_X, y: baseY + yOffset },
            data: {
              label: sceneAsset.name || '场景卡',
              _nodeId: id,
              sceneAssetId: spec.sceneId,
              sceneName: sceneAsset.name,
              sceneDescription: sceneAsset.prompt || '',
              sceneRefImage: sceneAsset.thumbnailPath || '',
            },
          })
          createdNodes.push(`场景卡「${sceneAsset.name}」`)
          yOffset += LAYOUT_GAP
        }
      } else {
        createdNodes.push(`场景卡「${existing.data.sceneName || spec.sceneId}」(已存在)`)
      }
    }

    // 3. Item Cards - check if any item assets match by name in clip label/dialogue
    const searchText = (clip.label + ' ' + (spec.dialogue || '') + ' ' + (spec.action || '')).toLowerCase()
    for (const item of itemAssets) {
      if (item.name && searchText.includes(item.name.toLowerCase())) {
        const existing = existingNodes.find(
          (n) => n.type === 'itemCard' && n.data.itemAssetId === item.id
        )
        if (!existing) {
          const id = makeId('itemCard')
          addNode({
            id,
            type: 'itemCard',
            position: { x: NODE_X, y: baseY + yOffset },
            data: {
              label: item.name || '物品卡',
              _nodeId: id,
              itemAssetId: item.id,
              itemName: item.name,
              itemDescription: item.prompt || '',
              itemRefImage: item.thumbnailPath || '',
            },
          })
          createdNodes.push(`物品卡「${item.name}」`)
          yOffset += LAYOUT_GAP
        } else {
          createdNodes.push(`物品卡「${item.name}」(已存在)`)
        }
      }
    }

    // 4. Script node with scene info
    if (spec.sceneId) {
      const sceneAsset = sceneAssets.find((a) => a.id === spec.sceneId)
      const existing = existingNodes.find(
        (n) => n.type === 'script' && n.data.scriptSceneId === spec.sceneId
      )
      if (!existing && sceneAsset) {
        const id = makeId('script')
        addNode({
          id,
          type: 'script',
          position: { x: NODE_X - 200, y: baseY + yOffset },
          data: {
            label: `第?场 ${sceneAsset.name}`,
            _nodeId: id,
            scriptText: sceneAsset.prompt || '',
          },
        })
        createdNodes.push(`剧本节点「${sceneAsset.name}」`)
        yOffset += LAYOUT_GAP
      }
    }

    // 5. Storyboard node with shot info
    if (spec.shotType || spec.dialogue) {
      const id = makeId('storyboard')
      addNode({
        id,
        type: 'storyboard',
        position: { x: NODE_X, y: baseY + yOffset },
        data: {
          label: clip.label || '分镜',
          _nodeId: id,
          storyboardShotDescription: clip.label,
          storyboardShotType: spec.shotType || '',
          storyboardDialogue: spec.dialogue || '',
          storyboardCharacterIds: spec.characterIds || [],
          storyboardSceneId: spec.sceneId || '',
        },
      })
      createdNodes.push(`分镜节点「${clip.label}」`)
      yOffset += LAYOUT_GAP
    }

    if (createdNodes.length === 0) {
      useNotificationStore.getState().addNotification({
        type: 'warning',
        title: '片段分析',
        message: `片段「${clip.label}」未关联任何角色卡/场景卡/物品卡。请先在时间线编辑片段详情或手动创建节点。`,
      })
      return
    }

    useNotificationStore.getState().addNotification({
      type: 'info',
      title: `片段分析：「${clip.label}」`,
      message: `已在画布上调出以下节点：\n${createdNodes.join('、')}\n\n请连接角色卡→场景卡→物品卡→剧本→分镜→提示词节点后点击节点的运行按钮生成。`,
    })
  }, [nodes])

  const handleBatchGenerate = useCallback(async () => {
    const emptyClips = videoClips.filter(c => c.status === 'empty')
    if (emptyClips.length === 0) {
      useNotificationStore.getState().addNotification({
        type: 'warning', title: '无需生成',
        message: '视频轨上没有空片段',
      })
      return
    }
    const genNodes = nodes.filter((n) =>
      n.type === 'gptImage2' || n.type === 'seedance'
    )
    if (genNodes.length === 0) {
      useNotificationStore.getState().addNotification({
        type: 'warning', title: '无生成节点',
        message: '请先在画布中添加生成节点',
      })
      return
    }
    setBatchGenerating(true)
    setBatchProgress({ current: 0, total: emptyClips.length })

    const targetNode = genNodes[0]
    for (let i = 0; i < emptyClips.length; i++) {
      const clip = emptyClips[i]
      updateClip(clip.id, { status: 'generating' })
      try {
        await executeNode(targetNode.id)
        setBatchProgress(prev => ({ ...prev, current: prev.current + 1 }))
      } catch {
        updateClip(clip.id, { status: 'failed' })
        setBatchProgress(prev => ({ ...prev, current: prev.current + 1 }))
      }
    }

    setBatchGenerating(false)
    useNotificationStore.getState().addNotification({
      type: 'success',
      title: '批量生成完成',
      message: `已处理 ${emptyClips.length} 个片段`,
    })
  }, [videoClips, nodes, updateClip])

  const handleClearAll = useCallback(() => {
    if (!videoTrack) return
    videoTrack.clips.forEach(c => removeClip(c.id))
  }, [videoTrack, removeClip])

  const tickCount = Math.max(10, Math.ceil(totalDuration / 5) + 2)
  const totalWidth = Math.max(500, totalDuration * pxPerSec + 100)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1 bg-bg-secondary border-b border-node-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Film size={13} className="text-accent" />
          <span className="text-[11px] font-semibold">时间线</span>
          <span className="flex items-center gap-0.5 text-[10px] text-text-secondary">
            <Clock size={10} />
            {formatDuration(totalDuration)}
            <span className="text-[9px] opacity-60">({videoClips.length} 片段)</span>
          </span>
          {emptyCount > 0 ? (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-400 rounded-full">
              {emptyCount} 待生成
            </span>
          ) : videoClips.length > 0 ? (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-green-500/20 text-green-400 rounded-full">
              全部已生成
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost p-1 text-text-secondary hover:text-accent" onClick={() => setZoomLevel(zoomLevel - 5)} title="缩小">−</button>
          <span className="text-[9px] text-text-secondary w-8 text-center">{zoomLevel}px/s</span>
          <button className="btn btn-ghost p-1 text-text-secondary hover:text-accent" onClick={() => setZoomLevel(zoomLevel + 5)} title="放大">+</button>
          <button className="btn btn-ghost p-1 text-text-secondary hover:text-accent" onClick={() => setShowImport(!showImport)} title="导入分镜">
            <Import size={11} />
          </button>
          {emptyCount > 0 && (
            <button
              className="btn btn-ghost p-1 text-accent hover:bg-accent/10"
              onClick={handleBatchGenerate}
              disabled={batchGenerating}
              title="生成视频轨上所有空片段"
            >
              {batchGenerating ? <Loader2 size={11} className="animate-spin" /> : <Clapperboard size={11} />}
            </button>
          )}
          {videoClips.filter(c => c.status === 'done').length > 0 && (
            <button
              className="btn btn-ghost p-1 text-text-secondary hover:text-accent"
              onClick={() => setShowExport(true)}
              title="导出视频"
            >
              <Download size={11} />
            </button>
          )}
          {videoClips.length > 0 && (
            <button className="btn btn-ghost p-1 text-text-secondary hover:text-red-400" onClick={handleClearAll} title="清空">
              <RotateCcw size={11} />
            </button>
          )}
        </div>
      </div>

      {showImport && <ImportPanel onClose={() => setShowImport(false)} videoTrackId={videoTrack?.id} />}
      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}

      <BatchProgressBar current={batchProgress.current} total={batchProgress.total} generating={batchGenerating} />

      <div className="px-3 py-1 border-b border-node-border/50 bg-bg-secondary/30 flex items-center gap-1.5 flex-shrink-0">
        <input
          className="input text-[10px] py-0.5 flex-1 min-w-0"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="快速添加片段... (Enter 确认)"
          onKeyDown={(e) => e.key === 'Enter' && handleAddClip()}
        />
        <input
          className="input text-[10px] py-0.5 text-center"
          style={{ width: '48px', flexShrink: 0 }}
          type="number" min={1} max={60}
          value={newDuration}
          onChange={(e) => setNewDuration(parseInt(e.target.value) || 5)}
        />
        <span className="text-[9px] text-text-secondary flex-shrink-0">s</span>
        <button className="btn btn-ghost p-1 text-text-secondary hover:text-accent flex-shrink-0" onClick={handleAddClip}>
          <Plus size={12} />
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-auto min-h-0">
        <div className="flex" style={{ minWidth: totalWidth }}>
          {/* Track headers column */}
          <div className="flex flex-col flex-shrink-0 border-r border-node-border" style={{ width: 80 }}>
            {tracks.map(track => (
              <div key={track.id} className="flex items-center px-2 border-b border-node-border/30 bg-bg-tertiary" style={{ height: track.height + 8 }}>
                <TrackHeader
                  track={track}
                  onToggleMute={() => updateTrack(track.id, { muted: !track.muted })}
                  onToggleLock={() => updateTrack(track.id, { locked: !track.locked })}
                  onToggleVisible={() => updateTrack(track.id, { visible: !track.visible })}
                  onDelete={track.type === 'custom' ? () => removeTrack(track.id) : undefined}
                />
              </div>
            ))}
          </div>

          {/* Timeline ruler + track rows */}
          <div className="flex-1 flex flex-col">
            {/* Time ruler */}
            <div
              className="flex-shrink-0 h-5 border-b border-node-border bg-bg-secondary/50 overflow-hidden relative cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = e.clientX - rect.left
                setPlayheadTime(x / pxPerSec)
              }}
            >
              {Array.from({ length: tickCount }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-node-border/50"
                  style={{ left: i * 5 * pxPerSec }}
                >
                  <span className="text-[8px] text-text-secondary ml-0.5">
                    {formatTime(i * 5)}
                  </span>
                </div>
              ))}
              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                style={{ left: playheadTime * pxPerSec }}
              />
            </div>

            {/* Track rows */}
            {tracks.filter(t => t.visible).map(track => (
              <div
                key={track.id}
                className="flex-shrink-0 border-b border-node-border/20 relative bg-bg-primary/50"
                style={{ height: track.height + 8 }}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('.absolute')) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = e.clientX - rect.left
                  setPlayheadTime(x / pxPerSec)
                }}
              >
                {/* Grid lines */}
                {Array.from({ length: tickCount }, (_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-node-border/20"
                    style={{ left: i * 5 * pxPerSec }}
                  />
                ))}
                {/* Snap indicator: clip edges shown as dotted lines */}
                {/* Clips */}
                {track.clips.sort((a, b) => a.startTime - b.startTime).map(clip => (
                  <ClipBlock
                    key={clip.id}
                    clip={clip}
                    pxPerSec={pxPerSec}
                    snapPoints={snapPoints}
                    onUpdate={(u) => updateClip(clip.id, u)}
                    onDelete={() => removeClip(clip.id)}
                    onAnalyzeClip={() => handleAnalyzeClip(clip)}
                  />
                ))}
              </div>
            ))}

            {tracks.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState icon={Film} title="暂无轨道" subtitle="点击下方按钮添加轨道" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-node-border p-1.5 flex items-center gap-2 bg-bg-secondary flex-shrink-0">
        <button
          className="btn btn-ghost text-[10px] py-0.5 px-2 flex items-center gap-1 border border-node-border"
          onClick={() => addTrack('新轨道', 'custom')}
        >
          <Plus size={10} /> 添加轨道
        </button>
        <div className="flex-1" />
        <span className="text-[9px] text-text-secondary">
          {tracks.length} 轨道 · {videoClips.length} 片段 · {formatDuration(totalDuration)}
        </span>
      </div>
    </div>
  )
}
