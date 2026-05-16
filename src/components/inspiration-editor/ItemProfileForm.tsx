import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react'
import type { ItemProfile } from '@/types/inspiration'

interface Props {
  profile: ItemProfile
  onChange: (profile: ItemProfile) => void
}

type SectionId = 'basic' | 'physical' | 'visual' | 'function' | 'refImages'

const ITEM_TYPE_OPTIONS = ['武器', '道具', '科技设备', '服装', '消耗品', '载具', '文献']
const CONDITION_OPTIONS = ['完好', '轻微磨损', '明显磨损', '损坏', '老旧']

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

export default function ItemProfileForm({ profile, onChange }: Props) {
  const [expanded, setExpanded] = useState<Record<SectionId, boolean>>({
    basic: true,
    physical: false,
    visual: false,
    function: false,
    refImages: false,
  })

  const toggle = (id: SectionId) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const update = (partial: Partial<ItemProfile>) => {
    onChange({ ...profile, ...partial })
  }

  return (
    <div className="flex flex-col gap-0.5 text-sm text-text-primary">
      <Section id="basic" icon="📛" label="基本信息" expanded={expanded.basic} onToggle={toggle}>
        <Field label="名称">
          <input
            className="input bg-bg-secondary mt-0.5"
            value={profile.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="物品中文名"
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
        <Field label="物品类型">
          <select
            className="input bg-bg-secondary mt-0.5"
            value={profile.itemType}
            onChange={(e) => update({ itemType: e.target.value })}
          >
            <option value="">请选择</option>
            {ITEM_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </Field>
      </Section>

      <Section id="physical" icon="🔬" label="物理属性" expanded={expanded.physical} onToggle={toggle}>
        <Field label="材质">
          <input
            className="input bg-bg-secondary mt-0.5"
            value={profile.material}
            onChange={(e) => update({ material: e.target.value })}
            placeholder="金属、木材、塑料…"
          />
        </Field>
        <Field label="颜色">
          <input
            className="input bg-bg-secondary mt-0.5"
            value={profile.color}
            onChange={(e) => update({ color: e.target.value })}
            placeholder="暗红、灰银、哑光黑…"
          />
        </Field>
        <Field label="尺寸">
          <input
            className="input bg-bg-secondary mt-0.5"
            value={profile.dimensions}
            onChange={(e) => update({ dimensions: e.target.value })}
            placeholder="长×宽×高，如 30×15×5cm"
          />
        </Field>
        <Field label="重量">
          <input
            className="input bg-bg-secondary mt-0.5"
            value={profile.weight}
            onChange={(e) => update({ weight: e.target.value })}
            placeholder="2.5kg"
          />
        </Field>
        <Field label="成色">
          <select
            className="input bg-bg-secondary mt-0.5"
            value={profile.condition}
            onChange={(e) => update({ condition: e.target.value })}
          >
            <option value="">请选择</option>
            {CONDITION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </Field>
      </Section>

      <Section id="visual" icon="✨" label="视觉特征" expanded={expanded.visual} onToggle={toggle}>
        <Field label="外观描述">
          <textarea
            className="input bg-bg-secondary mt-0.5"
            rows={3}
            value={profile.visualFeatures}
            onChange={(e) => update({ visualFeatures: e.target.value })}
            placeholder="表面纹理、锈迹裂痕、发光部件、标识符号…"
          />
        </Field>
      </Section>

      <Section id="function" icon="🎯" label="功能" expanded={expanded.function} onToggle={toggle}>
        <Field label="功能描述">
          <textarea
            className="input bg-bg-secondary mt-0.5"
            rows={3}
            value={profile.function}
            onChange={(e) => update({ function: e.target.value })}
            placeholder="物品在剧情中的作用、使用方法、限制条件…"
          />
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
