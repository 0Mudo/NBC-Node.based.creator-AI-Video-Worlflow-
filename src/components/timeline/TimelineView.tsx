import { useState, useCallback, useEffect, memo } from 'react'
import { useTimelineStore, type TimelineSlot, type GeneratedClip } from '@/store/useTimelineStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useFlowStore } from '@/store/useFlowStore'
import { useInspirationStore } from '@/store/useInspirationStore'
import { executeNode } from '@/store/useExecutionEngine'
import {
  Film, Plus, Trash2, GripVertical, X, Import, Check, Clock,
  Scissors, Play, RotateCcw,
} from 'lucide-react'
import EmptyState from '@/components/shared/EmptyState'

const SHOT_OPTIONS = ['', '全景', '中景', '近景', '特写', '远景', '大远景', '中近景', '大特写']
const TRANSITION_OPTIONS = ['硬切', '淡入淡出', '叠化', '擦除', '滑入', '缩放']
const MIN_SLOT_PX = 160
const PX_PER_SEC = 8

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}m${s}s` : `${s}s`
}

function TransitionMarker({ transition, onClick }: { transition: string; onClick?: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center flex-shrink-0 w-6 cursor-pointer group"
      onClick={onClick}
      title={`转场: ${transition} (点击切换)`}
    >
      <div className="w-px h-8 bg-node-border group-hover:bg-accent transition-colors" />
      <span className="text-[8px] text-text-secondary mt-0.5 group-hover:text-accent transition-colors leading-none">
        {transition === '硬切' ? '|' : transition === '淡入淡出' ? '⊘' : transition === '叠化' ? '≈' : '◆'}
      </span>
    </div>
  )
}

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k])
}

const SlotCard = memo(function SlotCard({
  slot, clip, widthPx, onDrop, onReorder, index, dragIndex, onDragStart, onDragEnd,
  onTriggerGenerate,
}: {
  slot: TimelineSlot
  clip: GeneratedClip | undefined
  widthPx: number
  onDrop: (slotId: string, clipId: string) => void
  onReorder: (from: number, to: number) => void
  index: number
  dragIndex: number | null
  onDragStart: (index: number) => void
  onDragEnd: () => void
  onTriggerGenerate: (slot: TimelineSlot) => void
}) {
  const { clearSlot, removeSlot, updateSlot } = useTimelineStore()
  const [dragOver, setDragOver] = useState(false)
  const [reorderOver, setReorderOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const types = e.dataTransfer.types
    if (types.includes('application/nbc-clip')) {
      e.dataTransfer.dropEffect = 'copy'
      setDragOver(true)
    } else if (types.includes('application/nbc-slot-reorder')) {
      e.dataTransfer.dropEffect = 'move'
      setReorderOver(true)
    }
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
    setReorderOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    setReorderOver(false)
    const clipId = e.dataTransfer.getData('application/nbc-clip')
    if (clipId) {
      onDrop(slot.id, clipId)
      return
    }
    const fromIdx = parseInt(e.dataTransfer.getData('application/nbc-slot-reorder'), 10)
    if (!isNaN(fromIdx) && fromIdx !== index) {
      onReorder(fromIdx, index)
    }
  }, [slot.id, index, onDrop, onReorder])

  const handleSlotDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/nbc-slot-reorder', String(index))
    e.dataTransfer.effectAllowed = 'move'
    onDragStart(index)
  }, [index, onDragStart])

  const borderColor = dragOver
    ? 'border-accent bg-accent/10'
    : reorderOver
    ? 'border-blue-400 bg-blue-400/10'
    : clip
    ? 'border-green-500/40 bg-green-500/5'
    : 'border-red-400/40 bg-red-400/5'

  const isDragging = dragIndex === index

  return (
    <div
      className={`flex-shrink-0 rounded-lg border-2 transition-all ${borderColor} ${isDragging ? 'opacity-40' : ''}`}
      style={{ width: widthPx }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-1 px-2 py-1 border-b border-node-border/30">
        <div
          draggable
          onDragStart={handleSlotDragStart}
          onDragEnd={onDragEnd}
          className="cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <GripVertical size={10} className="text-text-secondary" />
        </div>
        <span className="text-[10px] font-semibold flex-1 truncate">{slot.label}</span>
        <span className="text-[9px] text-text-secondary flex-shrink-0">#{slot.order}</span>
        <button
          className="btn btn-ghost p-0.5 text-text-secondary hover:text-red-400 flex-shrink-0"
          onClick={() => removeSlot(slot.id)}
        >
          <Trash2 size={9} />
        </button>
      </div>

      <div className="p-1.5 min-h-[96px] flex flex-col justify-center">
        {clip ? (
          <div className="space-y-1">
            {clip.type === 'video' ? (
              <video
                src={clip.url}
                className="w-full h-24 object-cover rounded bg-black/30"
                muted
                onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                onMouseLeave={(e) => {
                  const v = e.target as HTMLVideoElement
                  v.pause(); v.currentTime = 0
                }}
              />
            ) : (
              <img src={clip.url} alt="" className="w-full h-24 object-cover rounded bg-black/30" />
            )}
            <div className="flex items-center gap-1">
              <Check size={9} className="text-green-400 flex-shrink-0" />
              <span className="text-[9px] text-green-400 truncate flex-1">{clip.nodeLabel}</span>
              <button
                className="btn btn-ghost p-0.5 text-text-secondary hover:text-red-400"
                onClick={() => clearSlot(slot.id)}
                title="移除素材"
              >
                <X size={9} />
              </button>
            </div>
          </div>
        ) : (
          <button
            className="w-full h-24 flex flex-col items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/5 rounded transition-colors border border-dashed border-node-border hover:border-accent"
            onClick={() => onTriggerGenerate(slot)}
            title="点击触发节点生成"
          >
            <Play size={16} className="mb-1 opacity-50" />
            <span className="text-[10px]">点击补生成</span>
          </button>
        )}
      </div>

      <div className="px-1.5 py-1 border-t border-node-border/30 space-y-1">
        <div className="flex items-center gap-1">
          <select
            className="input text-[9px] py-0 px-1 flex-1 min-w-0"
            value={slot.spec.shotType}
            onChange={(e) => updateSlot(slot.id, { spec: { ...slot.spec, shotType: e.target.value } })}
          >
            {SHOT_OPTIONS.map((s) => (
              <option key={s} value={s}>{s || '镜头...'}</option>
            ))}
          </select>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Clock size={8} className="text-text-secondary" />
            <input
              className="input text-[10px] py-0 text-center px-1"
              style={{ width: '48px' }}
              type="number"
              min={1}
              max={60}
              value={slot.spec.duration}
              onChange={(e) => updateSlot(slot.id, { spec: { ...slot.spec, duration: Math.max(1, Math.min(60, parseInt(e.target.value) || 5)) } })}
            />
            <span className="text-[8px] text-text-secondary">s</span>
          </div>
        </div>
        <select
          className="input text-[9px] py-0 w-full"
          value={slot.spec.transition}
          onChange={(e) => updateSlot(slot.id, { spec: { ...slot.spec, transition: e.target.value } })}
        >
          {TRANSITION_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
    </div>
  )
}, (prev, next) => {
  return (
    shallowEqual(prev.slot as unknown as Record<string, unknown>, next.slot as unknown as Record<string, unknown>) &&
    prev.clip === next.clip &&
    prev.widthPx === next.widthPx &&
    prev.index === next.index &&
    prev.dragIndex === next.dragIndex
  )
})

function ClipItem({ clip }: { clip: GeneratedClip }) {
  const { removeClip } = useTimelineStore()
  const [hovering, setHovering] = useState(false)

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/nbc-clip', clip.id)
    e.dataTransfer.effectAllowed = 'copy'
  }, [clip.id])

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="flex-shrink-0 w-24 cursor-grab active:cursor-grabbing relative group"
    >
      <div className="rounded-md overflow-hidden border border-node-border hover:border-accent transition-colors">
        <div className="relative">
          {clip.type === 'video' ? (
            <video
              src={clip.url}
              className="w-full h-14 object-cover bg-black/30"
              muted
              onMouseEnter={(e) => hovering && (e.target as HTMLVideoElement).play()}
              onMouseLeave={(e) => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0 }}
            />
          ) : (
            <img src={clip.url} alt="" className="w-full h-14 object-cover bg-black/30" />
          )}
          <button
            className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/60 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/30 transition-opacity"
            onClick={(e) => { e.stopPropagation(); removeClip(clip.id) }}
            title="从素材池删除"
          >
            <X size={10} />
          </button>
        </div>
        <div className="px-1 py-0.5">
          <p className="text-[9px] truncate">{clip.nodeLabel}</p>
        </div>
      </div>
    </div>
  )
}

function ImportPanel({ onClose }: { onClose: () => void }) {
  const { importSlotsFromScript } = useTimelineStore()
  const [text, setText] = useState('')

  const handleImport = () => {
    if (!text.trim()) return
    const count = text.split('\n').filter((l) => l.trim()).length
    importSlotsFromScript(text)
    setText('')
    onClose()
    useNotificationStore.getState().addNotification({
      type: 'info',
      title: '分镜已导入',
      message: `已导入 ${count} 个分镜（自动解析了镜头类型、时长、角色和场景）`,
    })
  }

  const handleFromInspiration = () => {
    const storyboardText = useInspirationStore.getState().getActiveData('storyboard').content || ''
    if (!storyboardText.trim()) {
      useNotificationStore.getState().addNotification({
        type: 'warning',
        title: '未找到分镜内容',
        message: '请先在灵感编辑器的「第2步：分镜」中编写分镜',
      })
      return
    }
    const count = storyboardText.split('\n').filter((l) => l.trim()).length
    importSlotsFromScript(storyboardText)
    onClose()
    useNotificationStore.getState().addNotification({
      type: 'info',
      title: '分镜已从灵感编辑器导入',
      message: `已导入 ${count} 个分镜，并自动关联了角色/场景/物品卡`,
    })
  }

  return (
    <div className="px-3 py-2 border-b border-node-border bg-bg-secondary/80 space-y-1.5">
      <textarea
        className="input text-[11px] w-full"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"每行一个分镜，自动解析结构化信息，例如：\n全景·蜂医从巴别塔高处跃下 8秒 淡入淡出\n特写·疾风从侧面突入 5秒 硬切"}
      />
      <div className="flex gap-1.5">
        <button className="btn btn-accent text-[11px]" onClick={handleImport}>导入文本</button>
        <button className="btn btn-ghost text-[11px] border border-node-border" onClick={handleFromInspiration}>从灵感编辑器(分镜当前版)导入</button>
        <button className="btn btn-ghost text-[11px]" onClick={onClose}>取消</button>
      </div>
    </div>
  )
}

import { useProjectStore } from '@/store/useProjectStore'

function loadSaved(): { slots: TimelineSlot[]; clips: GeneratedClip[] } {
  try {
    const projectId = useProjectStore.getState().activeProjectId
    if (projectId) {
      const raw = localStorage.getItem(`nbc_timeline_${projectId}`)
      if (raw) return JSON.parse(raw)
    }
  } catch {}
  return { slots: [], clips: [] }
}

export default function TimelineView() {
  const slots = useTimelineStore((s) => s.slots)
  const clips = useTimelineStore((s) => s.clips)
  const addSlot = useTimelineStore((s) => s.addSlot)
  const fillSlot = useTimelineStore((s) => s.fillSlot)
  const reorderSlots = useTimelineStore((s) => s.reorderSlots)
  const getUnfilledSlots = useTimelineStore((s) => s.getUnfilledSlots)
  const getTotalDuration = useTimelineStore((s) => s.getTotalDuration)
  const nodes = useFlowStore((s) => s.nodes)
  const [showImport, setShowImport] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newDuration, setNewDuration] = useState(5)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    // Reload timeline when project switches
    const handleSwitch = () => {
      const saved = loadSaved()
      useTimelineStore.setState({ slots: saved.slots, clips: saved.clips })
    }
    handleSwitch() // Initial load
    
    // Listen for custom import event
    const handleImport = () => {
      const saved = loadSaved()
      useTimelineStore.setState({ slots: saved.slots, clips: saved.clips })
    }
    window.addEventListener('timeline-imported', handleImport)
    return () => window.removeEventListener('timeline-imported', handleImport)
  }, [useProjectStore.getState().activeProjectId])

  const unfilledSlots = getUnfilledSlots()
  const unfilledCount = unfilledSlots.length
  const totalDuration = getTotalDuration()

  const handleAddSlot = () => {
    if (!newLabel.trim()) return
    const duration = Math.max(1, Math.min(60, newDuration))
    addSlot({
      order: slots.length + 1,
      label: newLabel.trim(),
      spec: { characterIds: [], sceneId: '', duration, shotType: '', transition: '硬切' },
    })
    setNewLabel('')
    setNewDuration(5)
  }

  const handleDrop = useCallback((slotId: string, clipId: string) => {
    fillSlot(slotId, clipId)
  }, [fillSlot])

  const handleReorder = useCallback((from: number, to: number) => {
    reorderSlots(from, to)
  }, [reorderSlots])

  const handleDragStart = useCallback((index: number) => setDragIndex(index), [])
  const handleDragEnd = useCallback(() => setDragIndex(null), [])

  const handleTriggerGenerate = useCallback((slot: TimelineSlot) => {
    const genNodes = nodes.filter((n) =>
      n.type === 'gptImage2' || n.type === 'seedance' || n.type === 'comfyUI'
    )
    if (genNodes.length === 0) {
      useNotificationStore.getState().addNotification({
        type: 'warning',
        title: '无生成节点',
        message: '请先在画布中添加 GPT Image / Seedance / ComfyUI 节点',
      })
      return
    }
    const targetNode = genNodes[0]
    useNotificationStore.getState().addNotification({
      type: 'info',
      title: '触发补生成',
      message: `正在为坑位「${slot.label}」执行节点「${targetNode.data.label || targetNode.type}」`,
    })
    executeNode(targetNode.id)
  }, [nodes])

  const handleClearAll = useCallback(() => {
    useTimelineStore.setState({ slots: [], clips: [] })
    const projectId = useProjectStoreId()
    if (projectId) localStorage.removeItem(`nbc_timeline_${projectId}`)
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1 bg-bg-secondary border-b border-node-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Film size={13} className="text-accent" />
          <span className="text-[11px] font-semibold">时间线</span>
          {slots.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-text-secondary">
              <Clock size={10} />
              {formatDuration(totalDuration)}
              <span className="text-[9px] opacity-60">({slots.length} 镜)</span>
            </span>
          )}
          {unfilledCount > 0 ? (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-400 rounded-full">
              {unfilledCount} 未填充
            </span>
          ) : slots.length > 0 ? (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-green-500/20 text-green-400 rounded-full">
              全部已填充
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            className="btn btn-ghost p-1 text-text-secondary hover:text-accent"
            onClick={() => setShowImport(!showImport)}
            title="导入分镜"
          >
            <Import size={11} />
          </button>
          {slots.length > 0 && (
            <button
              className="btn btn-ghost p-1 text-text-secondary hover:text-red-400"
              onClick={handleClearAll}
              title="清空全部"
            >
              <RotateCcw size={11} />
            </button>
          )}
        </div>
      </div>

      {showImport && <ImportPanel onClose={() => setShowImport(false)} />}

      <div className="px-3 py-1 border-b border-node-border/50 bg-bg-secondary/30 flex items-center gap-1.5 flex-shrink-0">
        <input
          className="input text-[10px] py-0.5 flex-1 min-w-0"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="快速添加：输入镜头描述回车"
          onKeyDown={(e) => e.key === 'Enter' && handleAddSlot()}
        />
        <input
          className="input text-[10px] py-0.5 text-center"
          style={{ width: '48px', flexShrink: 0 }}
          type="number"
          min={1}
          max={60}
          value={newDuration}
          onChange={(e) => setNewDuration(parseInt(e.target.value) || 5)}
          placeholder="秒"
        />
        <span className="text-[9px] text-text-secondary flex-shrink-0">s</span>
        <button className="btn btn-ghost p-1 text-text-secondary hover:text-accent flex-shrink-0" onClick={handleAddSlot} title="添加坑位">
          <Plus size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
        {slots.length === 0 ? (
          <EmptyState icon={Film} title="暂无分镜" subtitle="在上方输入描述并回车添加，或点击导入按钮导入分镜" />
        ) : (
          <div className="flex items-stretch p-2 gap-0 min-h-full w-max">
            {slots.map((slot, i) => {
              const clip = clips.find((c) => c.id === slot.filledClipId)
              const widthPx = Math.max(MIN_SLOT_PX, slot.spec.duration * PX_PER_SEC)
              return (
                <div key={slot.id} className="flex items-stretch flex-shrink-0">
                  {i > 0 && (
                    <TransitionMarker
                      transition={slot.spec.transition}
                      onClick={() => {
                        const idx = TRANSITION_OPTIONS.indexOf(slot.spec.transition)
                        const next = TRANSITION_OPTIONS[(idx + 1) % TRANSITION_OPTIONS.length]
                        useTimelineStore.getState().updateSlot(slot.id, { spec: { ...slot.spec, transition: next } })
                      }}
                    />
                  )}
                  <SlotCard
                    slot={slot}
                    clip={clip}
                    widthPx={widthPx}
                    onDrop={handleDrop}
                    onReorder={handleReorder}
                    index={i}
                    dragIndex={dragIndex}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onTriggerGenerate={handleTriggerGenerate}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {clips.length > 0 && (
        <div className="border-t border-node-border flex-shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-0.5 bg-bg-secondary">
            <Scissors size={10} className="text-text-secondary" />
            <span className="text-[10px] text-text-secondary uppercase tracking-wider">素材池</span>
            <span className="text-[9px] text-text-secondary">({clips.length})</span>
          </div>
          <div className="flex gap-1.5 px-3 py-1.5 overflow-x-auto">
            {clips.map((clip) => (
              <ClipItem key={clip.id} clip={clip} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function useProjectStoreId(): string | null {
  try {
    const raw = localStorage.getItem('nbc_active_project')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
