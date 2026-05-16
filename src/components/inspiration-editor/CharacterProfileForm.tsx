import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react'
import type { CharacterProfile, EmotionPreset, ActionPreset } from '@/types/inspiration'

interface Props {
  profile: CharacterProfile
  onChange: (profile: CharacterProfile) => void
}

const DEFAULT_EMOTION_PRESETS: EmotionPreset[] = [
  { name: '平静', prompt: 'calm, neutral expression' },
  { name: '紧张', prompt: 'tense, alert, narrowed eyes' },
  { name: '愤怒', prompt: 'angry, furrowed brows' },
  { name: '悲伤', prompt: 'sad, downcast eyes' },
]

const DEFAULT_ACTION_PRESETS: ActionPreset[] = [
  { name: '持枪', prompt: 'holding weapon, combat stance' },
  { name: '奔跑', prompt: 'sprinting, motion blur' },
  { name: '蹲伏', prompt: 'crouching, stealth' },
]

type SectionId = 'basic' | 'appearance' | 'emotion' | 'action' | 'tts' | 'backstory'

export default function CharacterProfileForm({ profile, onChange }: Props) {
  const [expanded, setExpanded] = useState<Record<SectionId, boolean>>({
    basic: false,
    appearance: true,
    emotion: false,
    action: false,
    tts: false,
    backstory: false,
  })

  const toggle = (id: SectionId) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const update = (partial: Partial<CharacterProfile>) => {
    onChange({ ...profile, ...partial })
  }

  const emotionPresets = profile.emotionPresets.length > 0 ? profile.emotionPresets : DEFAULT_EMOTION_PRESETS
  const actionPresets = profile.actionPresets.length > 0 ? profile.actionPresets : DEFAULT_ACTION_PRESETS

  return (
    <div className="flex flex-col gap-1 text-sm text-text-primary">
      <Section
        id="basic"
        icon="📛"
        label="基本信息"
        expanded={expanded.basic}
        onToggle={() => toggle('basic')}
      >
        <div className="space-y-3">
          <Field label="名称">
            <input
              className="input-field"
              value={profile.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="角色名称"
            />
          </Field>
          <Field label="代号">
            <input
              className="input-field"
              value={profile.alias}
              onChange={(e) => update({ alias: e.target.value })}
              placeholder="代号"
            />
          </Field>
          <Field label="性别">
            <select
              className="input-field"
              value={profile.gender}
              onChange={(e) => update({ gender: e.target.value })}
            >
              <option value="">请选择</option>
              <option value="男">男</option>
              <option value="女">女</option>
              <option value="其他">其他</option>
            </select>
          </Field>
          <Field label="年龄">
            <input
              type="number"
              className="input-field"
              value={profile.age || ''}
              onChange={(e) => update({ age: Number(e.target.value) })}
              placeholder="0"
              min={0}
            />
          </Field>
          <Field label="身份">
            <input
              className="input-field"
              value={profile.role}
              onChange={(e) => update({ role: e.target.value })}
              placeholder="例如：突击手、指挥官"
            />
          </Field>
        </div>
      </Section>

      <Section
        id="appearance"
        icon="🧬"
        label="外貌设定"
        expanded={expanded.appearance}
        onToggle={() => toggle('appearance')}
      >
        <div className="space-y-3">
          <Field label="面部提示词">
            <textarea
              className="input-field resize-none"
              rows={3}
              value={profile.facePrompt}
              onChange={(e) => update({ facePrompt: e.target.value })}
              placeholder="英文超写实描述..."
            />
          </Field>
          <Field label="体型/着装提示词">
            <textarea
              className="input-field resize-none"
              rows={3}
              value={profile.bodyPrompt}
              onChange={(e) => update({ bodyPrompt: e.target.value })}
              placeholder="身体体型、服装描述..."
            />
          </Field>
          <Field label="负面约束">
            <textarea
              className="input-field resize-none"
              rows={2}
              value={profile.negativePrompt}
              onChange={(e) => update({ negativePrompt: e.target.value })}
              placeholder="不希望出现的内容..."
            />
          </Field>
          <Field label="🎲 推荐种子">
            <input
              type="number"
              className="input-field"
              value={profile.consistencySeed ?? ''}
              onChange={(e) => update({ consistencySeed: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="留空为随机"
            />
          </Field>
          <div>
            <div className="text-xs text-text-secondary mb-2 font-medium">📸 多角度参考图</div>
            <div className="space-y-2">
              {profile.refImages.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className="input-field flex-1"
                    value={url}
                    onChange={(e) => {
                      const next = [...profile.refImages]
                      next[i] = e.target.value
                      update({ refImages: next })
                    }}
                    placeholder="图片 URL"
                  />
                  <button
                    onClick={() => {
                      update({ refImages: profile.refImages.filter((_, j) => j !== i) })
                    }}
                    className="p-1 text-text-secondary hover:text-red-400 transition-colors"
                    title="删除参考图"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => update({ refImages: [...profile.refImages, ''] })}
                className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
              >
                <Plus size={12} /> 添加参考图
              </button>
            </div>
          </div>
        </div>
      </Section>

      <Section
        id="emotion"
        icon="🎭"
        label="情绪预设"
        expanded={expanded.emotion}
        onToggle={() => toggle('emotion')}
      >
        <div className="space-y-3">
          {emotionPresets.map((ep, i) => (
            <div key={i} className="flex items-start gap-2">
              <input
                className="input-field w-24 shrink-0"
                value={ep.name}
                onChange={(e) => {
                  const next = [...emotionPresets]
                  next[i] = { ...next[i], name: e.target.value }
                  update({ emotionPresets: next })
                }}
                placeholder="情绪名"
              />
              <textarea
                className="input-field flex-1 resize-none"
                rows={2}
                value={ep.prompt}
                onChange={(e) => {
                  const next = [...emotionPresets]
                  next[i] = { ...next[i], prompt: e.target.value }
                  update({ emotionPresets: next })
                }}
                placeholder="英文提示词"
              />
              <button
                onClick={() => {
                  update({ emotionPresets: emotionPresets.filter((_, j) => j !== i) })
                }}
                className="p-1 text-text-secondary hover:text-red-400 transition-colors shrink-0 mt-0.5"
                title="删除情绪"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              update({ emotionPresets: [...emotionPresets, { name: '', prompt: '' }] })
            }
            className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
          >
            <Plus size={12} /> 添加情绪
          </button>
        </div>
      </Section>

      <Section
        id="action"
        icon="🎬"
        label="动作预设"
        expanded={expanded.action}
        onToggle={() => toggle('action')}
      >
        <div className="space-y-3">
          {actionPresets.map((ap, i) => (
            <div key={i} className="flex items-start gap-2">
              <input
                className="input-field w-24 shrink-0"
                value={ap.name}
                onChange={(e) => {
                  const next = [...actionPresets]
                  next[i] = { ...next[i], name: e.target.value }
                  update({ actionPresets: next })
                }}
                placeholder="动作名"
              />
              <textarea
                className="input-field flex-1 resize-none"
                rows={2}
                value={ap.prompt}
                onChange={(e) => {
                  const next = [...actionPresets]
                  next[i] = { ...next[i], prompt: e.target.value }
                  update({ actionPresets: next })
                }}
                placeholder="英文提示词"
              />
              <button
                onClick={() => {
                  update({ actionPresets: actionPresets.filter((_, j) => j !== i) })
                }}
                className="p-1 text-text-secondary hover:text-red-400 transition-colors shrink-0 mt-0.5"
                title="删除动作"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              update({ actionPresets: [...actionPresets, { name: '', prompt: '' }] })
            }
            className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
          >
            <Plus size={12} /> 添加动作
          </button>
        </div>
      </Section>

      <Section
        id="tts"
        icon="🎤"
        label="配音设置"
        expanded={expanded.tts}
        onToggle={() => toggle('tts')}
      >
        <div className="space-y-3">
          <Field label="音色ID">
            <input
              className="input-field"
              value={profile.ttsVoiceId || ''}
              onChange={(e) => update({ ttsVoiceId: e.target.value || undefined })}
              placeholder="TTS 音色标识"
            />
          </Field>
          <Field label="语速">
            <input
              type="number"
              className="input-field"
              value={profile.ttsSpeed ?? 1.0}
              onChange={(e) => update({ ttsSpeed: Number(e.target.value) })}
              step={0.1}
              min={0.5}
              max={2.0}
            />
          </Field>
          <Field label="音调">
            <input
              type="number"
              className="input-field"
              value={profile.ttsPitch ?? 0}
              onChange={(e) => update({ ttsPitch: Number(e.target.value) })}
              step={1}
              min={-20}
              max={20}
            />
          </Field>
        </div>
      </Section>

      <Section
        id="backstory"
        icon="📖"
        label="背景故事"
        expanded={expanded.backstory}
        onToggle={() => toggle('backstory')}
      >
        <textarea
          className="input-field resize-none w-full"
          rows={4}
          value={profile.backstory}
          onChange={(e) => update({ backstory: e.target.value })}
          placeholder="角色的背景故事、经历、性格等..."
        />
      </Section>
    </div>
  )
}

function Section({
  id,
  icon,
  label,
  expanded,
  onToggle,
  children,
}: {
  id: string
  icon: string
  label: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-node-border rounded-lg bg-bg-secondary overflow-hidden">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium hover:bg-bg-tertiary transition-colors"
      >
        <span className="text-text-secondary">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span>{icon}</span>
        <span>{label}</span>
      </button>
      {expanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-text-secondary font-medium mb-1 block">{label}</span>
      {children}
    </label>
  )
}
