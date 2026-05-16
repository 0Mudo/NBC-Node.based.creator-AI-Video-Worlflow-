import React, { useState, useCallback } from 'react'
import { Plus, X, ChevronUp, ChevronDown, ChevronRight, Clock, Edit3 } from 'lucide-react'
import type { ScriptScene, ScriptDialogue } from '@/types/inspiration'

interface ScriptSceneEditorProps {
  scenes: ScriptScene[]
  onChange: (scenes: ScriptScene[]) => void
}

const TIME_OPTIONS: { value: ScriptScene['timeOfDay']; label: string; emoji: string }[] = [
  { value: 'dawn', label: '黎明', emoji: '🌅' },
  { value: 'morning', label: '早晨', emoji: '☀️' },
  { value: 'afternoon', label: '下午', emoji: '🌤️' },
  { value: 'evening', label: '黄昏', emoji: '🌆' },
  { value: 'night', label: '深夜', emoji: '🌙' },
  { value: 'midnight', label: '午夜', emoji: '🕛' },
]

const LINE_TYPE_OPTIONS: { value: ScriptDialogue['lineType']; label: string }[] = [
  { value: 'speech', label: '对白' },
  { value: 'voiceover', label: '画外音' },
  { value: 'internal', label: '内心独白' },
  { value: 'radio', label: '无线电' },
]

const HEX = '0123456789abcdef'
function uid(): string {
  let id = ''
  for (let i = 0; i < 16; i++) {
    id += HEX[Math.floor(Math.random() * 16)]
  }
  return id
}

export default function ScriptSceneEditor({ scenes, onChange }: ScriptSceneEditorProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const updateScene = useCallback((id: string, patch: Partial<ScriptScene>) => {
    onChange(scenes.map(s => s.id === id ? { ...s, ...patch } : s))
  }, [scenes, onChange])

  const deleteScene = useCallback((id: string) => {
    const filtered = scenes.filter(s => s.id !== id)
    onChange(filtered.map((s, i) => ({ ...s, sceneNumber: i + 1 })))
  }, [scenes, onChange])

  const moveScene = useCallback((id: string, delta: number) => {
    const idx = scenes.findIndex(s => s.id === id)
    if (idx < 0) return
    const newIdx = idx + delta
    if (newIdx < 0 || newIdx >= scenes.length) return
    const next = [...scenes]
    const [moved] = next.splice(idx, 1)
    next.splice(newIdx, 0, moved)
    onChange(next.map((s, i) => ({ ...s, sceneNumber: i + 1 })))
  }, [scenes, onChange])

  const addScene = () => {
    const nextNumber = scenes.length > 0 ? Math.max(...scenes.map(s => s.sceneNumber)) + 1 : 1
    const newScene: ScriptScene = {
      id: `scene_${uid()}`,
      sceneNumber: nextNumber,
      heading: `场次${nextNumber}`,
      timeOfDay: 'afternoon',
      mood: '',
      estimatedDuration: 30,
      action: '',
      dialogues: [],
    }
    const updated = [...scenes, newScene]
    onChange(updated)
    setExpandedIds(prev => new Set([...prev, newScene.id]))
  }

  const addDialogue = (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId)
    if (!scene) return
    const newDialogue: ScriptDialogue = {
      id: `dialogue_${uid()}`,
      characterName: '',
      lineType: 'speech',
      content: '',
    }
    updateScene(sceneId, { dialogues: [...scene.dialogues, newDialogue] })
  }

  const updateDialogue = (sceneId: string, dialogueId: string, patch: Partial<ScriptDialogue>) => {
    const scene = scenes.find(s => s.id === sceneId)
    if (!scene) return
    updateScene(sceneId, {
      dialogues: scene.dialogues.map(d => d.id === dialogueId ? { ...d, ...patch } : d)
    })
  }

  const deleteDialogue = (sceneId: string, dialogueId: string) => {
    const scene = scenes.find(s => s.id === sceneId)
    if (!scene) return
    updateScene(sceneId, { dialogues: scene.dialogues.filter(d => d.id !== dialogueId) })
  }

  const totalDuration = scenes.reduce((sum, s) => sum + (s.estimatedDuration || 0), 0)

  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec}秒`
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return s > 0 ? `${m}分${s}秒` : `${m}分`
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary text-text-primary">
      <div className="flex items-center justify-between px-3 py-2 bg-bg-secondary border-b border-node-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">📝 场次结构</span>
          <span className="text-[10px] text-text-secondary">
            ({scenes.length} 场 · 预估总时长 {formatDuration(totalDuration)})
          </span>
        </div>
        <button
          onClick={addScene}
          className="btn btn-ghost text-xs py-1 px-2 flex items-center gap-1 border border-node-border hover:border-accent/50 hover:text-accent"
        >
          <Plus size={12} />
          添加场次
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {scenes.length === 0 && (
          <div className="text-center text-text-tertiary text-xs py-8">
            暂无场次，点击「添加场次」开始编写
          </div>
        )}

        {scenes.map((scene, index) => {
          const isExpanded = expandedIds.has(scene.id)
          const hasDialogue = scene.dialogues.length > 0
          const sceneDuration = scene.estimatedDuration || 0

          return (
            <div
              key={scene.id}
              className="bg-bg-secondary border border-node-border rounded-md overflow-hidden"
            >
              <div className="flex items-center gap-1 px-2 py-1.5 hover:bg-bg-tertiary/50 transition-colors">
                <button
                  onClick={() => toggleExpand(scene.id)}
                  className="p-0.5 text-text-secondary hover:text-text-primary shrink-0"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                <div
                  className="flex-1 flex items-center gap-2 min-w-0 cursor-pointer"
                  onClick={() => toggleExpand(scene.id)}
                >
                  <span className="text-xs font-medium text-text-primary whitespace-nowrap">
                    场次{scene.sceneNumber}
                  </span>
                  <span className="text-xs text-text-primary truncate">
                    {scene.heading || '(无标题)'}
                  </span>
                  <span className="text-[10px] text-text-secondary flex items-center gap-0.5 whitespace-nowrap ml-auto mr-1">
                    <Clock size={10} />
                    {sceneDuration}秒
                  </span>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => moveScene(scene.id, -1)}
                    disabled={index === 0}
                    className="p-0.5 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    onClick={() => moveScene(scene.id, 1)}
                    disabled={index === scenes.length - 1}
                    className="p-0.5 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown size={12} />
                  </button>
                  <button
                    onClick={() => deleteScene(scene.id)}
                    className="p-0.5 text-text-secondary hover:text-red-500 ml-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-node-border/50 space-y-2 bg-bg-tertiary/30">
                  <div>
                    <label className="text-[10px] text-text-secondary block mb-0.5">标题</label>
                    <input
                      className="input w-full text-xs py-1.5"
                      value={scene.heading}
                      onChange={e => updateScene(scene.id, { heading: e.target.value })}
                      placeholder="例如：审讯室对峙"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-text-secondary block mb-0.5">📍 场景</label>
                      <input
                        className="input w-full text-xs py-1.5"
                        value={scene.locationId || ''}
                        onChange={e => updateScene(scene.id, { locationId: e.target.value })}
                        placeholder="例如：潮汐监狱"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-secondary block mb-0.5">🕐 时间</label>
                      <select
                        className="input w-full text-xs py-1.5"
                        value={scene.timeOfDay}
                        onChange={e => updateScene(scene.id, { timeOfDay: e.target.value as ScriptScene['timeOfDay'] })}
                      >
                        {TIME_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-text-secondary block mb-0.5">🌧️ 氛围</label>
                      <input
                        className="input w-full text-xs py-1.5"
                        value={scene.mood}
                        onChange={e => updateScene(scene.id, { mood: e.target.value })}
                        placeholder="紧张、压抑..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-secondary block mb-0.5">⏱ 时长（秒）</label>
                      <input
                        type="number"
                        className="input w-full text-xs py-1.5"
                        value={scene.estimatedDuration}
                        onChange={e => updateScene(scene.id, { estimatedDuration: Math.max(1, Number(e.target.value) || 1) })}
                        min={1}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-text-secondary block mb-0.5">📖 动作描述</label>
                    <textarea
                      className="input w-full text-xs py-1.5 resize-none"
                      rows={3}
                      value={scene.action}
                      onChange={e => updateScene(scene.id, { action: e.target.value })}
                      placeholder="描述本场动作..."
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-text-secondary">💬 对白</label>
                      <button
                        onClick={() => addDialogue(scene.id)}
                        className="btn btn-ghost text-[10px] py-0.5 px-1.5 flex items-center gap-0.5 border border-node-border/50 hover:border-accent/50"
                      >
                        <Plus size={10} /> 添加对白
                      </button>
                    </div>

                    {scene.dialogues.length === 0 && (
                      <div className="text-[10px] text-text-tertiary text-center py-2 border border-dashed border-node-border rounded">
                        暂无对白
                      </div>
                    )}

                    {scene.dialogues.map(dialogue => (
                      <div
                        key={dialogue.id}
                        className="flex items-center gap-1 mb-1 p-1.5 rounded bg-bg-primary/80 border border-node-border/30"
                      >
                        <input
                          className="input text-[10px] py-1 px-1.5 w-[80px] shrink-0"
                          value={dialogue.characterName}
                          onChange={e => updateDialogue(scene.id, dialogue.id, { characterName: e.target.value })}
                          placeholder="角色名"
                        />
                        <select
                          className="input text-[10px] py-1 px-1 w-[72px] shrink-0"
                          value={dialogue.lineType}
                          onChange={e => updateDialogue(scene.id, dialogue.id, { lineType: e.target.value as ScriptDialogue['lineType'] })}
                        >
                          {LINE_TYPE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <input
                          className="input text-[10px] py-1 px-1.5 flex-1 min-w-0"
                          value={dialogue.content}
                          onChange={e => updateDialogue(scene.id, dialogue.id, { content: e.target.value })}
                          placeholder="对白内容..."
                        />
                        <button
                          onClick={() => deleteDialogue(scene.id, dialogue.id)}
                          className="p-0.5 text-text-secondary hover:text-red-500 shrink-0"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
