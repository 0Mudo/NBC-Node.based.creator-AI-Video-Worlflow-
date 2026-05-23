import { useState } from 'react'
import { ChevronDown, ChevronRight, RotateCcw, Users, Map, Box } from 'lucide-react'
import { useCardGenSettingsStore, CARD_GEN_DEFAULTS, type CardGenSettings, type CardGenProvider } from '@/store/useCardGenSettingsStore'
import { BANANA_MODEL_OPTIONS } from '@/utils/constants'

type CardType = 'character' | 'scene' | 'item'

const CARD_META: Record<CardType, { icon: React.ReactNode; label: string; color: string }> = {
  character: { icon: <Users size={14} />, label: '角色卡', color: '#ff6b6b' },
  scene: { icon: <Map size={14} />, label: '场景卡', color: '#f9ca24' },
  item: { icon: <Box size={14} />, label: '物品卡', color: '#e67e22' },
}

const BANANA_ASPECT_OPTIONS = [
  { value: 'auto', label: '自动' },
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '3:2', label: '3:2' },
  { value: '2:3', label: '2:3' },
  { value: '5:4', label: '5:4' },
  { value: '4:5', label: '4:5' },
  { value: '21:9', label: '21:9' },
  { value: '2:1', label: '2:1' },
]

const GPT_IMAGE_MODELS = [
  { value: 'gpt-image-2', label: 'GPT Image 2' },
  { value: 'gpt-image-2-vip', label: 'GPT Image 2 VIP' },
]

const BANANA_RES_OPTIONS = ['1K', '2K', '4K']

function CardGenSettingsEditor({ cardType }: { cardType: CardType }) {
  const { getSettings, updateCardGenSettings, resetCardGenSettings } = useCardGenSettingsStore()
  const settings = getSettings(cardType)
  const meta = CARD_META[cardType]
  const [expanded, setExpanded] = useState(false)

  const update = (partial: Partial<CardGenSettings>) => {
    updateCardGenSettings(cardType, partial)
  }

  const providerOptions: { value: CardGenProvider; label: string }[] = [
    { value: 'banana', label: 'Nano Banana' },
    { value: 'gptImage2', label: 'GPT Image 2' },
  ]

  return (
    <div className="border border-node-border/20 rounded-lg overflow-hidden bg-bg-primary/50">
      <button
        className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-node-border/10 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
        <span className="flex items-center gap-1.5 text-xs font-medium">
          {meta.icon}
          {meta.label}
        </span>
        <span className="text-[10px] text-text-tertiary ml-auto mr-2">
          {settings.provider === 'banana' ? 'Banana' : 'GPT Image 2'} · {settings.model}
        </span>
        {expanded ? <ChevronDown size={12} className="text-text-tertiary" /> : <ChevronRight size={12} className="text-text-tertiary" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-node-border/20 space-y-3 pt-3">
          <div>
            <label className="text-[10px] text-text-secondary uppercase tracking-wider">API Provider</label>
            <select
              className="input mt-0.5 w-full"
              value={settings.provider}
              onChange={(e) => update({ provider: e.target.value as CardGenProvider })}
            >
              {providerOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-text-secondary uppercase tracking-wider">模型</label>
            {settings.provider === 'banana' ? (
              <select
                className="input mt-0.5 w-full"
                value={settings.model}
                onChange={(e) => update({ model: e.target.value })}
              >
                {BANANA_MODEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <select
                className="input mt-0.5 w-full"
                value={settings.model}
                onChange={(e) => update({ model: e.target.value })}
              >
                {GPT_IMAGE_MODELS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-text-secondary uppercase tracking-wider">
                {settings.provider === 'banana' ? '比例' : '画面比例'}
              </label>
              <select
                className="input mt-0.5 w-full"
                value={settings.aspectRatio}
                onChange={(e) => update({ aspectRatio: e.target.value })}
              >
                {BANANA_ASPECT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-text-secondary uppercase tracking-wider">分辨率</label>
              <select
                className="input mt-0.5 w-full"
                value={settings.imageSize}
                onChange={(e) => update({ imageSize: e.target.value })}
              >
                {BANANA_RES_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-text-secondary uppercase tracking-wider">
              提示词模板 ({cardType === 'scene' ? '使用 {SCENE_DESCRIPTION} 占位符' : cardType === 'item' ? '使用 {OBJECT_DESCRIPTION} 占位符' : '角色描述通过参数拼接，不使用占位符'})
            </label>
            <textarea
              className="input mt-0.5 w-full resize-none text-[11px]"
              rows={4}
              value={settings.promptTemplate}
              onChange={(e) => update({ promptTemplate: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[10px] text-text-secondary uppercase tracking-wider">负面提示词</label>
            <textarea
              className="input mt-0.5 w-full resize-none text-[11px]"
              rows={2}
              value={settings.negativePrompt}
              onChange={(e) => update({ negativePrompt: e.target.value })}
            />
          </div>

          <button
            className="btn btn-ghost text-[10px] py-1 px-2 flex items-center gap-1 border border-node-border text-text-tertiary hover:text-text-primary"
            onClick={() => resetCardGenSettings(cardType)}
          >
            <RotateCcw size={10} /> 恢复默认
          </button>
        </div>
      )}
    </div>
  )
}

export default function CardGenSettingsPanel() {
  return (
    <div>
      <h3 className="text-[11px] font-semibold mb-3 text-text-secondary uppercase tracking-wider flex items-center gap-2">
        <span className="w-1 h-3 rounded-full bg-green-400/50" />
        三卡一键生成配置
      </h3>
      <div className="bg-bg-tertiary p-3 rounded-lg border border-node-border space-y-2">
        <p className="text-[10px] text-text-tertiary mb-2">
          分别为角色卡、场景卡、物品卡的一键生成功能配置模型、提示词和参数。与画布中生成节点的配置相互独立。
        </p>
        <CardGenSettingsEditor cardType="character" />
        <CardGenSettingsEditor cardType="scene" />
        <CardGenSettingsEditor cardType="item" />
      </div>
    </div>
  )
}
