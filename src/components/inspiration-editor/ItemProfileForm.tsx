import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, X, Box, Loader2 } from 'lucide-react'
import type { ItemProfile } from '@/types/inspiration'
import { generateBananaImage } from '@/api/banana'
import { generateGPTImageStream, pollGPTImageResult, sanitizeUrl, buildResultEndpoint } from '@/api/gptImage2'
import { useProviderStore } from '@/store/useProviderStore'
import { useCardGenSettingsStore } from '@/store/useCardGenSettingsStore'

interface Props {
  profile: ItemProfile
  onChange: (profile: ItemProfile) => void
}

function buildItemDescription(profile: ItemProfile): string {
  const parts: string[] = []
  if (profile.name) parts.push(`a ${profile.material || ''} ${profile.color || ''} ${profile.itemType || 'item'} called "${profile.name}"`)
  else if (profile.itemType) parts.push(`a ${profile.material || ''} ${profile.color || ''} ${profile.itemType}`)

  if (profile.visualFeatures) parts.push(`featuring ${profile.visualFeatures}`)

  if (profile.function) parts.push(`function: ${profile.function}`)

  if (profile.condition) parts.push(`in ${profile.condition} condition`)

  if (profile.dimensions) parts.push(`dimensions: ${profile.dimensions}`)

  if (parts.length === 0) parts.push(profile.nameEn || 'an object')

  return parts.join('. ')
}

type SectionId = 'basic' | 'physical' | 'visual' | 'function' | 'refImages' | 'itemRef'

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
    itemRef: true,
  })
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [genResult, setGenResult] = useState<string | null>(null)

  const toggle = (id: SectionId) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const update = (partial: Partial<ItemProfile>) => {
    onChange({ ...profile, ...partial })
  }

  const handleGenerateItemRef = async () => {
    setGenerating(true)
    setGenError('')
    setGenResult(null)

    try {
      const cfg = useCardGenSettingsStore.getState().getSettings('item')
      const objectDescription = buildItemDescription(profile)
      const finalPrompt = cfg.promptTemplate.replace('{OBJECT_DESCRIPTION}', objectDescription)
      const fullPrompt = cfg.negativePrompt
        ? `${finalPrompt}\n\nNEGATIVE PROMPT (STRICTLY AVOID): ${cfg.negativePrompt}`
        : finalPrompt

      if (cfg.provider === 'banana') {
        const provider = useProviderStore.getState().getProvider('banana')
        const endpoint = provider?.endpoints.find(e => e.isDefault) || provider?.endpoints[0]
        const apiKey = endpoint?.apiKey || ''

        const result = await generateBananaImage({
          prompt: fullPrompt,
          model: cfg.model,
          aspectRatio: cfg.aspectRatio,
          imageSize: cfg.imageSize as '1K' | '2K' | '4K',
          replyType: 'json',
          apiKey,
          endpoint: endpoint?.url,
        })

        if (result.results && result.results.length > 0) {
          const url = result.results[0].url
          setGenResult(url)
          update({ refImages: [...profile.refImages, url] })
        } else {
          throw new Error('生成成功但未返回图像链接')
        }
      } else {
        const provider = useProviderStore.getState().getProvider('gptImage2')
        const endpoint = provider?.endpoints.find(e => e.isDefault) || provider?.endpoints[0]
        const apiKey = endpoint?.apiKey || ''
        const endpointUrl = sanitizeUrl(endpoint?.url)

        const results = await generateGPTImageStream({
          prompt: fullPrompt,
          model: cfg.model,
          aspectRatio: cfg.aspectRatio,
          apiKey,
          endpoint: endpointUrl,
        })
        const first = results[0]
        if (first?.id && !first?.url) {
          const resultEndpoint = buildResultEndpoint(endpointUrl)
          const polled = await pollGPTImageResult(first.id, apiKey, resultEndpoint)
          if (polled[0]?.url) {
            setGenResult(polled[0].url)
            update({ refImages: [...profile.refImages, polled[0].url] })
            setGenerating(false)
            return
          }
        }
        if (first?.url) {
          setGenResult(first.url)
          update({ refImages: [...profile.refImages, first.url] })
        } else {
          throw new Error('生成成功但未返回图像链接')
        }
      }
    } catch (err: any) {
      setGenError(err.message || '生成失败')
    } finally {
      setGenerating(false)
    }
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

      <Section id="itemRef" icon="📐" label="物品参考" expanded={expanded.itemRef} onToggle={toggle}>
        <div className="space-y-2">
          <p className="text-[11px] text-text-secondary leading-relaxed">
            基于物品属性自动构建描述，生成专业三视图参考（正视图、侧视图、俯视图）。生成结果将自动添加到参考图中。
          </p>
          <button
            type="button"
            className="btn btn-primary flex items-center gap-1.5 text-xs"
            onClick={handleGenerateItemRef}
            disabled={generating}
          >
            {generating ? (
              <><Loader2 size={14} className="animate-spin" /> 生成中…</>
            ) : (
              <><Box size={14} /> 一键生成物品参考</>
            )}
          </button>
          {genError && (
            <div className="text-[11px] text-red-400 break-words">{genError}</div>
          )}
          {genResult && !genError && (
            <img src={genResult} className="rounded border border-node-border/40 max-h-32 object-cover w-full" alt="物品参考图结果" />
          )}
        </div>
      </Section>
    </div>
  )
}
