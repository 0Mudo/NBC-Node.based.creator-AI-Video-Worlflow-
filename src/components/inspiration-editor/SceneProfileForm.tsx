import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react'
import type { SceneProfile } from '@/types/inspiration'
import { useStyleStore } from '@/store/useStyleStore'

interface Props {
  profile: SceneProfile
  onChange: (profile: SceneProfile) => void
}

type SectionId = 'basic' | 'atmosphere' | 'lighting' | 'spatial' | 'style' | 'refImages'

const SCENE_TYPE_OPTIONS = ['室内', '室外', '城市街道', '自然环境', '地下设施', '太空设施', '废墟']
const TIME_OF_DAY_OPTIONS = ['黎明', '早晨', '下午', '黄昏', '深夜']
const WEATHER_OPTIONS = ['晴', '阴', '雨', '雾', '雪', '暴风']
const COLOR_PALETTE_OPTIONS = ['暖黄', '冷蓝', '暗绿', '赛博霓虹', '灰调', '高饱和']
const SPATIAL_TYPE_OPTIONS = ['单间', '走廊', '大厅', '开放空间', '多层', '洞穴']

function SectionHeader({ icon, label, expanded, onToggle }: {
  icon: string
  label: string
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 w-full py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
      onClick={onToggle}
    >
      {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function Section({ id, icon, label, expanded, onToggle, children }: {
  id: SectionId
  icon: string
  label: string
  expanded: boolean
  onToggle: (id: SectionId) => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-node-border/50 pb-2">
      <SectionHeader icon={icon} label={label} expanded={expanded} onToggle={() => onToggle(id)} />
      {expanded && <div className="space-y-2 pl-5">{children}</div>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-text-secondary uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

export default function SceneProfileForm({ profile, onChange }: Props) {
  const [expanded, setExpanded] = useState<Record<SectionId, boolean>>({
    basic: true,
    atmosphere: false,
    lighting: false,
    spatial: false,
    style: false,
    refImages: false,
  })

  const toggle = (id: SectionId) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const update = (partial: Partial<SceneProfile>) => {
    onChange({ ...profile, ...partial })
  }

  const styles = useStyleStore((s) => s.styles)

  return (
    <div className="flex flex-col gap-0.5 text-sm text-text-primary">
      <Section id="basic" icon="📛" label="基本信息" expanded={expanded.basic} onToggle={toggle}>
        <Field label="名称">
          <input
            className="input bg-bg-secondary mt-0.5"
            value={profile.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="场景中文名"
          />
        </Field>
        <Field label="英文名">
          <input
            className="input bg-bg-secondary mt-0.5"
            value={profile.nameEn}
            onChange={(e) => update({ nameEn: e.target.value })}
            placeholder="English Name"
          />
        </Field>
        <Field label="场景类型">
          <select
            className="input bg-bg-secondary mt-0.5"
            value={profile.sceneType}
            onChange={(e) => update({ sceneType: e.target.value })}
          >
            <option value="">请选择</option>
            {SCENE_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </Field>
      </Section>

      <Section id="atmosphere" icon="☁️" label="氛围天候" expanded={expanded.atmosphere} onToggle={toggle}>
        <Field label="时段">
          <select
            className="input bg-bg-secondary mt-0.5"
            value={profile.timeOfDay}
            onChange={(e) => update({ timeOfDay: e.target.value })}
          >
            <option value="">请选择</option>
            {TIME_OF_DAY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </Field>
        <Field label="天气">
          <select
            className="input bg-bg-secondary mt-0.5"
            value={profile.weather}
            onChange={(e) => update({ weather: e.target.value })}
          >
            <option value="">请选择</option>
            {WEATHER_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </Field>
        <Field label="色调">
          <select
            className="input bg-bg-secondary mt-0.5"
            value={profile.colorPalette}
            onChange={(e) => update({ colorPalette: e.target.value })}
          >
            <option value="">请选择</option>
            {COLOR_PALETTE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </Field>
        <Field label="情绪">
          <input
            className="input bg-bg-secondary mt-0.5"
            value={profile.mood}
            onChange={(e) => update({ mood: e.target.value })}
            placeholder="紧张、压抑、宁静…"
          />
        </Field>
      </Section>

      <Section id="lighting" icon="💡" label="光影" expanded={expanded.lighting} onToggle={toggle}>
        <Field label="光照描述">
          <textarea
            className="input bg-bg-secondary mt-0.5"
            rows={3}
            value={profile.lightingDescription}
            onChange={(e) => update({ lightingDescription: e.target.value })}
            placeholder="光源类型、方向、色温、明暗对比…"
          />
        </Field>
      </Section>

      <Section id="spatial" icon="🏗️" label="空间结构" expanded={expanded.spatial} onToggle={toggle}>
        <Field label="空间类型">
          <select
            className="input bg-bg-secondary mt-0.5"
            value={profile.spatialType}
            onChange={(e) => update({ spatialType: e.target.value })}
          >
            <option value="">请选择</option>
            {SPATIAL_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </Field>
        <div>
          <label className="text-[10px] text-text-secondary uppercase tracking-wider">关键元素</label>
          <div className="flex flex-wrap gap-1.5 mt-0.5 mb-1.5">
            {profile.keyElements.map((el, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-bg-tertiary text-text-primary border border-node-border/40"
              >
                {el}
                <button
                  type="button"
                  className="text-text-tertiary hover:text-accent transition-colors"
                  onClick={() => {
                    const next = [...profile.keyElements]
                    next.splice(i, 1)
                    update({ keyElements: next })
                  }}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              className="input bg-bg-secondary flex-1"
              placeholder="添加元素…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim()
                  if (val) {
                    update({ keyElements: [...profile.keyElements, val] })
                    ;(e.target as HTMLInputElement).value = ''
                  }
                }
              }}
            />
            <button
              type="button"
              className="btn btn-ghost p-1 text-text-secondary hover:text-accent transition-colors"
              onClick={(e) => {
                const input = (e.currentTarget as HTMLButtonElement).previousElementSibling as HTMLInputElement
                const val = input.value.trim()
                if (val) {
                  update({ keyElements: [...profile.keyElements, val] })
                  input.value = ''
                }
              }}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </Section>

      <Section id="style" icon="🎨" label="风格绑定" expanded={expanded.style} onToggle={toggle}>
        <Field label="推荐风格">
          <select
            className="input bg-bg-secondary mt-0.5"
            value={profile.recommendedStyleId || ''}
            onChange={(e) => update({ recommendedStyleId: e.target.value || undefined })}
          >
            <option value="">无</option>
            {styles.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
      </Section>

      <Section id="refImages" icon="📸" label="参考图" expanded={expanded.refImages} onToggle={toggle}>
        <div className="space-y-1.5">
          {profile.refImages.map((url, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                className="input bg-bg-secondary flex-1"
                value={url}
                onChange={(e) => {
                  const next = [...profile.refImages]
                  next[i] = e.target.value
                  update({ refImages: next })
                }}
                placeholder="https://…"
              />
              <button
                type="button"
                className="text-text-tertiary hover:text-accent transition-colors p-1"
                onClick={() => {
                  const next = [...profile.refImages]
                  next.splice(i, 1)
                  update({ refImages: next })
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-accent transition-colors py-0.5"
            onClick={() => update({ refImages: [...profile.refImages, ''] })}
          >
            <Plus size={12} />
            添加 URL
          </button>
        </div>
      </Section>
    </div>
  )
}
