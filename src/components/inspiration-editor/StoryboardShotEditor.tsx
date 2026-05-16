import React, { useState, useCallback } from 'react'
import { Plus, X, ChevronUp, ChevronDown, Clock, Edit3 } from 'lucide-react'
import type { StoryboardShot } from '@/types/inspiration'

interface StoryboardShotEditorProps {
  shots: StoryboardShot[]
  onChange: (shots: StoryboardShot[]) => void
}

const SHOT_TYPE_OPTIONS = [
  { value: '全景', label: '全景' },
  { value: '远景', label: '远景' },
  { value: '中景', label: '中景' },
  { value: '中近景', label: '中近景' },
  { value: '近景', label: '近景' },
  { value: '特写', label: '特写' },
  { value: '大特写', label: '大特写' },
]

const CAMERA_OPTIONS = [
  { value: '固定', label: '固定' },
  { value: '推近', label: '推近' },
  { value: '拉远', label: '拉远' },
  { value: '横摇', label: '横摇' },
  { value: '纵摇', label: '纵摇' },
  { value: '环绕', label: '环绕' },
  { value: '跟随', label: '跟随' },
  { value: '俯拍', label: '俯拍' },
  { value: '仰拍', label: '仰拍' },
]

const TRANSITION_OPTIONS = [
  { value: '硬切', label: '硬切' },
  { value: '淡入', label: '淡入' },
  { value: '淡出', label: '淡出' },
  { value: '叠化', label: '叠化' },
  { value: '擦除', label: '擦除' },
]

const HEX = '0123456789abcdef'
function uid(): string {
  let id = ''
  for (let i = 0; i < 16; i++) {
    id += HEX[Math.floor(Math.random() * 16)]
  }
  return id
}

export default function StoryboardShotEditor({ shots, onChange }: StoryboardShotEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const updateShot = useCallback((id: string, patch: Partial<StoryboardShot>) => {
    onChange(shots.map(s => s.id === id ? { ...s, ...patch } : s))
  }, [shots, onChange])

  const deleteShot = useCallback((id: string) => {
    const filtered = shots.filter(s => s.id !== id)
    onChange(filtered.map((s, i) => ({ ...s, shotNumber: i + 1 })))
  }, [shots, onChange])

  const moveShot = useCallback((id: string, delta: number) => {
    const idx = shots.findIndex(s => s.id === id)
    if (idx < 0) return
    const newIdx = idx + delta
    if (newIdx < 0 || newIdx >= shots.length) return
    const next = [...shots]
    const [moved] = next.splice(idx, 1)
    next.splice(newIdx, 0, moved)
    onChange(next.map((s, i) => ({ ...s, shotNumber: i + 1 })))
  }, [shots, onChange])

  const addShot = () => {
    const nextNumber = shots.length > 0 ? Math.max(...shots.map(s => s.shotNumber)) + 1 : 1
    const newShot: StoryboardShot = {
      id: `shot_${uid()}`,
      shotNumber: nextNumber,
      description: '',
      shotType: '中景',
      duration: 5,
      transition: '硬切',
      characterIds: [],
      itemIds: [],
    }
    onChange([...shots, newShot])
    setEditingId(newShot.id)
  }

  const totalDuration = shots.reduce((sum, s) => sum + (s.duration || 0), 0)

  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec}秒`
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return s > 0 ? `${m}分${s}秒` : `${m}分`
  }

  const tagsText = (ids: string[]) => {
    if (!ids || ids.length === 0) return null
    return ids.map(id => (
      <span key={id} className="text-[9px] px-1 py-0.5 bg-bg-tertiary border border-node-border/50 rounded text-text-secondary inline-block mr-0.5 mb-0.5">
        {id}
      </span>
    ))
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary text-text-primary">
      <div className="flex items-center justify-between px-3 py-2 bg-bg-secondary border-b border-node-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">🎬 分镜卡片</span>
          <span className="text-[10px] text-text-secondary">
            ({shots.length} 镜 · 总时长 {formatDuration(totalDuration)})
          </span>
        </div>
        <button
          onClick={addShot}
          className="btn btn-ghost text-xs py-1 px-2 flex items-center gap-1 border border-node-border hover:border-accent/50 hover:text-accent"
        >
          <Plus size={12} />
          添加镜头
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {shots.length === 0 && (
          <div className="text-center text-text-tertiary text-xs py-8">
            暂无分镜，点击「添加镜头」开始创建
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {shots.map((shot, index) => {
            const isEditing = editingId === shot.id
            const charIds = shot.characterIds || []
            const items = shot.itemIds || []

            return (
              <div
                key={shot.id}
                className="bg-bg-secondary border border-node-border rounded-md overflow-hidden"
              >
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <button
                    onClick={() => moveShot(shot.id, -1)}
                    disabled={index === 0}
                    className="p-0.5 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp size={11} />
                  </button>
                  <button
                    onClick={() => moveShot(shot.id, 1)}
                    disabled={index === shots.length - 1}
                    className="p-0.5 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown size={11} />
                  </button>

                  <div className="flex-1 flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-medium text-text-primary whitespace-nowrap">
                      镜{shot.shotNumber}
                    </span>
                    <span className="text-[9px] px-1 py-0.5 bg-bg-tertiary rounded text-text-secondary whitespace-nowrap">
                      {shot.shotType}
                    </span>
                    <span className="text-[9px] text-text-secondary flex items-center gap-0.5 whitespace-nowrap">
                      <Clock size={9} />
                      {shot.duration}s
                    </span>
                    {shot.transition && shot.transition !== '硬切' && (
                      <span className="text-[8px] px-1 py-0.5 bg-accent/10 text-accent rounded whitespace-nowrap">
                        {shot.transition}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setEditingId(isEditing ? null : shot.id)}
                    className={`p-0.5 ${isEditing ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    onClick={() => deleteShot(shot.id)}
                    className="p-0.5 text-text-secondary hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                </div>

                {!isEditing && (
                  <div className="px-2 pb-2">
                    <div className="text-[10px] text-text-secondary leading-relaxed line-clamp-2 mb-1">
                      {shot.description || '(暂无描述)'}
                    </div>
                    <div className="flex flex-wrap gap-0.5">
                      {charIds.length > 0 && (
                        <span className="text-[8px] px-1 py-0.5 bg-bg-tertiary rounded text-text-secondary">
                          👤 {charIds.join(', ')}
                        </span>
                      )}
                      {items.length > 0 && (
                        <span className="text-[8px] px-1 py-0.5 bg-bg-tertiary rounded text-text-secondary">
                          📦 {items.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {isEditing && (
                  <div className="px-2 pb-2 pt-1 border-t border-node-border/50 space-y-2 bg-bg-tertiary/30">
                    <div>
                      <label className="text-[10px] text-text-secondary block mb-0.5">📝 画面描述</label>
                      <textarea
                        className="input w-full text-[10px] py-1 resize-none"
                        rows={2}
                        value={shot.description}
                        onChange={e => updateShot(shot.id, { description: e.target.value })}
                        placeholder="描述画面内容..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[10px] text-text-secondary block mb-0.5">👤 角色</label>
                        <input
                          className="input w-full text-[10px] py-1"
                          value={charIds.join(', ')}
                          onChange={e => updateShot(shot.id, {
                            characterIds: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                          })}
                          placeholder="逗号分隔"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-text-secondary block mb-0.5">📍 场景</label>
                        <input
                          className="input w-full text-[10px] py-1"
                          value={shot.sceneId || ''}
                          onChange={e => updateShot(shot.id, { sceneId: e.target.value })}
                          placeholder="场景名称"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[10px] text-text-secondary block mb-0.5">🎬 镜头类型</label>
                        <select
                          className="input w-full text-[10px] py-1"
                          value={shot.shotType}
                          onChange={e => updateShot(shot.id, { shotType: e.target.value })}
                        >
                          {SHOT_TYPE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-text-secondary block mb-0.5">📐 运镜</label>
                        <select
                          className="input w-full text-[10px] py-1"
                          value={shot.cameraMovement || ''}
                          onChange={e => updateShot(shot.id, { cameraMovement: e.target.value })}
                        >
                          <option value="">无</option>
                          {CAMERA_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[10px] text-text-secondary block mb-0.5">🔄 转场</label>
                        <select
                          className="input w-full text-[10px] py-1"
                          value={shot.transition}
                          onChange={e => updateShot(shot.id, { transition: e.target.value })}
                        >
                          {TRANSITION_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-text-secondary block mb-0.5">⏱ 时长（秒）</label>
                        <input
                          type="number"
                          className="input w-full text-[10px] py-1"
                          value={shot.duration}
                          onChange={e => updateShot(shot.id, { duration: Math.max(1, Number(e.target.value) || 1) })}
                          min={1}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-text-secondary block mb-0.5">💬 对白</label>
                      <input
                        className="input w-full text-[10px] py-1"
                        value={shot.dialogue || ''}
                        onChange={e => updateShot(shot.id, { dialogue: e.target.value })}
                        placeholder="本镜头对白..."
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
