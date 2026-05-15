import { useState, useCallback, useEffect, memo } from 'react'
import { useTimelineStore, type TrackClip } from '@/store/useTimelineStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useFlowStore } from '@/store/useFlowStore'
import { useInspirationStore } from '@/store/useInspirationStore'
import { executeNode } from '@/store/useExecutionEngine'
import {
  Film, Plus, Trash2, GripVertical, X, Import, Check, Clock,
  Play, RotateCcw, ChevronDown, ChevronRight, Eye, EyeOff,
  Volume2, VolumeX, Lock, Unlock,
} from 'lucide-react'
import EmptyState from '@/components/shared/EmptyState'

const SHOT_OPTIONS = ['', '全景', '中景', '近景', '特写', '远景', '大远景', '中近景', '大特写']
const TRANSITION_OPTIONS = ['硬切', '淡入淡出', '叠化', '擦除', '滑入', '缩放']
const PX_PER_SEC = 20
const MIN_CLIP_PX = 80

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

function ClipBlock({
  clip, pxPerSec, onUpdate, onDelete, onTriggerGenerate,
}: {
  clip: TrackClip
  pxPerSec: number
  onUpdate: (updates: Partial<TrackClip>) => void
  onDelete: () => void
  onTriggerGenerate: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const widthPx = Math.max(MIN_CLIP_PX, clip.duration * pxPerSec)

  const statusColor =
    clip.status === 'done' ? 'border-green-500/50 bg-green-500/10' :
    clip.status === 'generating' ? 'border-yellow-500/50 bg-yellow-500/10 animate-pulse' :
    clip.status === 'failed' ? 'border-red-500/50 bg-red-500/10' :
    'border-blue-400/30 bg-blue-400/5 border-dashed'

  return (
    <div
      className={`absolute top-1 bottom-1 rounded-lg border-2 ${statusColor} overflow-hidden cursor-grab active:cursor-grabbing group transition-colors`}
      style={{ left: clip.startTime * pxPerSec, width: widthPx }}
      title={`${clip.label} (${formatDuration(clip.duration)})`}
    >
      {clip.status === 'empty' ? (
        <div className="flex items-center justify-center h-full" onClick={onTriggerGenerate}>
          <div className="flex flex-col items-center gap-0.5 text-[9px] text-text-secondary hover:text-accent">
            <Play size={12} />
            <span className="truncate max-w-full px-2">{clip.label.slice(0, 12)}</span>
            <span className="text-[8px] opacity-50">{clip.spec.shotType || '未指定'}</span>
          </div>
        </div>
      ) : clip.status === 'generating' ? (
        <div className="flex items-center justify-center h-full text-[9px] text-yellow-400">
          <span className="animate-pulse">生成中...</span>
        </div>
      ) : clip.status === 'failed' ? (
        <div className="flex items-center justify-center h-full text-[9px] text-red-400 gap-1">
          <span>失败</span>
          <button className="underline hover:text-red-300" onClick={onTriggerGenerate}>重试</button>
        </div>
      ) : clip.sourceType === 'video' ? (
        <video src={clip.sourceUrl} className="w-full h-full object-cover" muted />
      ) : clip.sourceType === 'image' ? (
        <img src={clip.sourceUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="flex items-center justify-center h-full text-[9px] text-text-secondary px-2 truncate">
          {clip.label}
        </div>
      )}

      <button
        className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
      >
        <X size={10} />
      </button>

      {clip.status === 'done' && (
        <button
          className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-black/50 text-text-secondary opacity-0 group-hover:opacity-100 hover:text-accent transition-opacity"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
        >
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </button>
      )}

      {expanded && clip.status === 'done' && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 text-[9px] text-text-secondary space-y-0.5">
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

function TrackHeader({ track, onToggleMute, onToggleLock, onToggleVisible }: {
  track: import('@/store/useTimelineStore').Track
  onToggleMute: () => void
  onToggleLock: () => void
  onToggleVisible: () => void
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

export default function TimelineView() {
  const tracks = useTimelineStore((s) => s.tracks)
  const playheadTime = useTimelineStore((s) => s.playheadTime)
  const zoomLevel = useTimelineStore((s) => s.zoomLevel)
  const addTrack = useTimelineStore((s) => s.addTrack)
  const updateTrack = useTimelineStore((s) => s.updateTrack)
  const removeClip = useTimelineStore((s) => s.removeClip)
  const updateClip = useTimelineStore((s) => s.updateClip)
  const addClip = useTimelineStore((s) => s.addClip)
  const getTotalDuration = useTimelineStore((s) => s.getTotalDuration)
  const setPlayheadTime = useTimelineStore((s) => s.setPlayheadTime)
  const setZoomLevel = useTimelineStore((s) => s.setZoomLevel)
  const nodes = useFlowStore((s) => s.nodes)
  const [showImport, setShowImport] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newDuration, setNewDuration] = useState(5)

  const videoTrack = tracks.find(t => t.type === 'video')
  const videoClips = videoTrack?.clips || []
  const totalDuration = getTotalDuration()
  const emptyCount = videoClips.filter(c => c.status === 'empty').length
  const pxPerSec = zoomLevel

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

  const handleTriggerGenerate = useCallback((clip: TrackClip) => {
    const genNodes = nodes.filter((n) =>
      n.type === 'gptImage2' || n.type === 'seedance' || n.type === 'comfyUI'
    )
    if (genNodes.length === 0) {
      useNotificationStore.getState().addNotification({
        type: 'warning', title: '无生成节点',
        message: '请先在画布中添加 GPT Image / Seedance / ComfyUI 节点',
      })
      return
    }
    const targetNode = genNodes[0]
    updateClip(clip.id, { status: 'generating' })
    useNotificationStore.getState().addNotification({
      type: 'info', title: '触发生成',
      message: `正在为片段「${clip.label}」执行节点「${targetNode.data.label || targetNode.type}」`,
    })
    executeNode(targetNode.id)
  }, [nodes, updateClip])

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
          {videoClips.length > 0 && (
            <button className="btn btn-ghost p-1 text-text-secondary hover:text-red-400" onClick={handleClearAll} title="清空">
              <RotateCcw size={11} />
            </button>
          )}
        </div>
      </div>

      {showImport && <ImportPanel onClose={() => setShowImport(false)} videoTrackId={videoTrack?.id} />}

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
                />
              </div>
            ))}
          </div>

          {/* Timeline ruler + track rows */}
          <div className="flex-1 flex flex-col">
            {/* Time ruler */}
            <div className="flex-shrink-0 h-5 border-b border-node-border bg-bg-secondary/50 overflow-hidden relative">
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
                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = e.clientX - rect.left
                  const time = x / pxPerSec
                  setPlayheadTime(time)
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
                {/* Clips */}
                {track.clips.sort((a, b) => a.startTime - b.startTime).map(clip => (
                  <ClipBlock
                    key={clip.id}
                    clip={clip}
                    pxPerSec={pxPerSec}
                    onUpdate={(u) => updateClip(clip.id, u)}
                    onDelete={() => removeClip(clip.id)}
                    onTriggerGenerate={() => handleTriggerGenerate(clip)}
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
