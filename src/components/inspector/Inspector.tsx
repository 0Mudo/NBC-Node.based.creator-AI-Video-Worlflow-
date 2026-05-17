import type { ReactNode } from 'react'
import { useFlowStore } from '@/store/useFlowStore'
import type { AppNode } from '@/types/flow'
import { useAssetStore } from '@/store/useAssetStore'
import { useProjectStore } from '@/store/useProjectStore'
import { useStyleStore } from '@/store/useStyleStore'

import { Info, Settings, Trash2, Sparkles, RefreshCw } from 'lucide-react'
import { useCallback } from 'react'
import EmptyState from '@/components/shared/EmptyState'
import { nodeTypeLabels } from '@/nodes'
import type { Asset, AssetTag } from '@/types/asset'
import { ASPECT_RATIO_OPTIONS } from '@/utils/constants'
import PromptOptimizer from './PromptOptimizer'
import { useInspirationStore } from '@/store/useInspirationStore'
import { useNotificationStore } from '@/store/useNotificationStore'

function buildAssetOptions(
  assets: Asset[],
  tag: AssetTag,
  activeProjectId: string | null,
  projectNameMap: Map<string, string>
): ReactNode[] {
  const filtered = assets.filter((a) => a.type === 'text' && a.tags?.includes(tag))

  const presets = filtered.filter((a) => a.preset === true)
  const userAssets = filtered.filter((a) => a.preset !== true)

  const groups = new Map<string, Asset[]>()
  const unassigned: Asset[] = []

  for (const a of userAssets) {
    if (a.projectId) {
      if (!groups.has(a.projectId)) groups.set(a.projectId, [])
      groups.get(a.projectId)!.push(a)
    } else {
      unassigned.push(a)
    }
  }

  const nodes: ReactNode[] = []

  if (presets.length > 0) {
    nodes.push(
      <optgroup key={`${tag}_presets`} label="📋 预设模板">
        {presets.map((a) => (
          <option key={a.id} value={a.id}>{a.name}{a.thumbnailPath ? ' 📷' : ''}</option>
        ))}
      </optgroup>
    )
  }

  if (activeProjectId && groups.has(activeProjectId)) {
    nodes.push(
      <optgroup key={`${tag}_active`} label={`📂 当前项目 · ${projectNameMap.get(activeProjectId) || activeProjectId}`}>
        {groups.get(activeProjectId)!.map((a) => (
          <option key={a.id} value={a.id}>{a.name}{a.thumbnailPath ? ' 📷' : ''}</option>
        ))}
      </optgroup>
    )
    groups.delete(activeProjectId)
  }

  for (const [pid, pAssets] of groups) {
    nodes.push(
      <optgroup key={`${tag}_${pid}`} label={`📁 ${projectNameMap.get(pid) || pid}`}>
        {pAssets.map((a) => (
          <option key={a.id} value={a.id}>{a.name}{a.thumbnailPath ? ' 📷' : ''}</option>
        ))}
      </optgroup>
    )
  }

  if (unassigned.length > 0) {
    nodes.push(
      <optgroup key={`${tag}_unassigned`} label="📦 未分类">
        {unassigned.map((a) => (
          <option key={a.id} value={a.id}>{a.name}{a.thumbnailPath ? ' 📷' : ''}</option>
        ))}
      </optgroup>
    )
  }

  return nodes
}

interface CardFieldsConfig {
  assetIdField: string
  nameField: string
  nameLabel: string
  descField: string
  descLabel: string
  refImageField: string
  refImagePlaceholder: string
}

function CardAssetFields({
  tag,
  config,
  nodeData,
  handleChange,
  extra,
  assets,
  activeProjectId,
  projectNameMap,
}: {
  tag: AssetTag
  config: CardFieldsConfig
  nodeData: Record<string, unknown>
  handleChange: (field: string, value: unknown) => void
  extra?: ReactNode
  assets: Asset[]
  activeProjectId: string | null
  projectNameMap: Map<string, string>
}) {
  return (
    <>
      <div>
        <label className="text-[10px] text-text-secondary uppercase tracking-wider">
          <Sparkles size={10} className="inline mr-1 text-accent" />灵感库 <span className="opacity-50 font-normal">(从素材库选择)</span>
        </label>
        <select className="input mt-0.5"
          value={(nodeData[config.assetIdField] as string) || ''}
          onChange={(e) => {
            const assetId = e.target.value
            if (!assetId) {
              handleChange(config.assetIdField, '')
              return
            }
            const asset = assets.find((a) => a.id === assetId)
            if (asset) {
              handleChange(config.assetIdField, asset.id)
              handleChange(config.nameField, asset.name)
              handleChange(config.descField, asset.prompt || '')
              handleChange(config.refImageField, asset.thumbnailPath || '')
            }
          }}
        >
          <option value="">未选择...</option>
          {buildAssetOptions(assets, tag, activeProjectId, projectNameMap)}
        </select>
      </div>
      <div><label className="text-[10px] text-text-secondary uppercase tracking-wider">{config.nameLabel}</label><input className="input mt-0.5" value={(nodeData[config.nameField] as string) || ''} onChange={(e) => handleChange(config.nameField, e.target.value)} /></div>
      <div><label className="text-[10px] text-text-secondary uppercase tracking-wider">{config.descLabel}</label><textarea className="input mt-0.5" rows={4} value={(nodeData[config.descField] as string) || ''} onChange={(e) => handleChange(config.descField, e.target.value)} /></div>
      <div><label className="text-[10px] text-text-secondary uppercase tracking-wider">参考图片路径</label><input className="input mt-0.5" value={(nodeData[config.refImageField] as string) || ''} onChange={(e) => handleChange(config.refImageField, e.target.value)} placeholder={config.refImagePlaceholder} /></div>
      {extra}
    </>
  )
}

function ScriptInspector({ node, handleChange }: { node: AppNode; handleChange: (field: string, value: unknown) => void }) {
  const { getActiveData } = useInspirationStore()
  const scriptData = getActiveData('script')
  const scenes = scriptData?.scriptScenes || []

  const handleSceneSelect = (sceneId: string) => {
    if (!sceneId) {
      handleChange('scriptSceneId', undefined)
      handleChange('scriptSceneNumber', undefined)
      handleChange('scriptSceneHeading', undefined)
      handleChange('scriptText', '')
      return
    }
    const scene = scenes.find((s) => s.id === sceneId)
    if (scene) {
      handleChange('scriptSceneId', scene.id)
      handleChange('scriptSceneNumber', scene.sceneNumber)
      handleChange('scriptSceneHeading', scene.heading)
      handleChange('scriptText', scene.action || scene.heading)
    }
  }

  return (
    <>
      <div>
        <label className="text-[10px] text-text-secondary uppercase tracking-wider">灵感编辑器场次</label>
        <select
          className="input mt-0.5"
          value={(node.data.scriptSceneId as string) || ''}
          onChange={(e) => handleSceneSelect(e.target.value)}
        >
          <option value="">-- 手动输入 --</option>
          {scenes.map((s) => (
            <option key={s.id} value={s.id}>
              第{s.sceneNumber}场 {s.heading}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[10px] text-text-secondary uppercase tracking-wider">剧本内容</label>
        <textarea
          className="input mt-0.5"
          rows={8}
          value={(node.data.scriptText as string) || ''}
          onChange={(e) => handleChange('scriptText', e.target.value)}
          placeholder="选择灵感编辑器场次自动填充，或手动输入剧本内容..."
        />
      </div>
    </>
  )
}

function StoryboardInspector({ node, handleChange }: { node: AppNode; handleChange: (field: string, value: unknown) => void }) {
  const { getActiveData } = useInspirationStore()
  const storyboardData = getActiveData('storyboard')
  const shots = storyboardData?.storyboardShots || []

  const handleShotSelect = (shotId: string) => {
    if (!shotId) {
      handleChange('storyboardShotId', undefined)
      handleChange('storyboardShotNumber', undefined)
      handleChange('storyboardShotDescription', undefined)
      handleChange('storyboardShotType', undefined)
      handleChange('storyboardDialogue', undefined)
      handleChange('storyboardCharacterIds', undefined)
      handleChange('storyboardSceneId', undefined)
      handleChange('storyboardItemIds', undefined)
      return
    }
    const shot = shots.find((s) => s.id === shotId)
    if (shot) {
      handleChange('storyboardShotId', shot.id)
      handleChange('storyboardShotNumber', shot.shotNumber)
      handleChange('storyboardShotDescription', shot.description)
      handleChange('storyboardShotType', shot.shotType)
      handleChange('storyboardDialogue', shot.dialogue)
      handleChange('storyboardCharacterIds', shot.characterIds)
      handleChange('storyboardSceneId', shot.sceneId)
      handleChange('storyboardItemIds', shot.itemIds)
    }
  }

  return (
    <>
      <div>
        <label className="text-[10px] text-text-secondary uppercase tracking-wider">灵感编辑器分镜</label>
        <select
          className="input mt-0.5"
          value={(node.data.storyboardShotId as string) || ''}
          onChange={(e) => handleShotSelect(e.target.value)}
        >
          <option value="">-- 选择分镜 --</option>
          {shots.map((s) => (
            <option key={s.id} value={s.id}>
              镜{s.shotNumber} {s.shotType} {s.description?.slice(0, 30)}
            </option>
          ))}
        </select>
      </div>
      {node.data.storyboardShotId && (
        <div className="bg-bg-tertiary/50 rounded p-2 space-y-1 text-[10px]">
          <div className="flex justify-between">
            <span className="text-text-secondary">镜头号</span>
            <span>{node.data.storyboardShotNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">景别</span>
            <span>{node.data.storyboardShotType as string}</span>
          </div>
          {node.data.storyboardDialogue && (
            <div className="flex justify-between">
              <span className="text-text-secondary">对白</span>
              <span className="text-accent truncate max-w-[180px]">「{node.data.storyboardDialogue as string}」</span>
            </div>
          )}
          <div className="text-text-secondary leading-relaxed">{node.data.storyboardShotDescription as string}</div>
        </div>
      )}
    </>
  )
}

function PromptInspector({ node, handleChange }: { node: AppNode; handleChange: (field: string, value: unknown) => void }) {
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)

  const handleRefreshFromUpstream = useCallback(() => {
    const upstreamNodeIds = new Set<string>()
    edges.filter((e) => e.target === node.id).forEach((e) => upstreamNodeIds.add(e.source))
    const upstreamNodes = nodes.filter((n) => upstreamNodeIds.has(n.id))

    const parts: string[] = []

    for (const un of upstreamNodes) {
      if (un.type === 'characterCard') {
        const name = un.data.characterName
        const appearance = un.data.characterAppearance
        if (name && appearance) parts.push(`角色「${name}」：${appearance}`)
        else if (name) parts.push(`角色「${name}」`)
      } else if (un.type === 'sceneCard') {
        const name = un.data.sceneName
        const desc = un.data.sceneDescription
        if (name && desc) parts.push(`场景「${name}」：${desc}`)
        else if (name) parts.push(`场景「${name}」`)
      } else if (un.type === 'itemCard') {
        const name = un.data.itemName
        const desc = un.data.itemDescription
        if (name && desc) parts.push(`物品「${name}」：${desc}`)
        else if (name) parts.push(`物品「${name}」`)
      } else if (un.type === 'script') {
        const heading = un.data.scriptSceneHeading
        const text = un.data.scriptText
        if (heading && text) parts.push(`[剧本·第${un.data.scriptSceneNumber}场 ${heading}]\n${text}`)
        else if (text) parts.push(`[剧本]\n${text as string}`)
      } else if (un.type === 'storyboard') {
        const shotNum = un.data.storyboardShotNumber
        const desc = un.data.storyboardShotDescription
        const dialogue = un.data.storyboardDialogue
        const shotType = un.data.storyboardShotType
        let sb = `[分镜·镜${shotNum}`
        if (shotType) sb += ` ${shotType}`
        sb += ']'
        if (desc) sb += `\n${desc}`
        if (dialogue) sb += `\n对白：「${dialogue}」`
        parts.push(sb)
      }
    }

    if (parts.length === 0) {
      useNotificationStore.getState().addNotification({
        type: 'warning',
        title: '无上游信息',
        message: '请先将角色卡/场景卡/物品卡/剧本/分镜节点连线到提示词节点。',
      })
      return
    }

    const text = parts.join('\n\n')
    handleChange('promptText', text)
    useNotificationStore.getState().addNotification({
      type: 'success',
      title: '已刷新提示词',
      message: `已从 ${parts.length} 个上游节点收集信息并写入提示词文本框。`,
    })
  }, [node.id, nodes, edges, handleChange])

  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <label className="text-[10px] text-text-secondary uppercase tracking-wider">提示词文本</label>
        <button
          className="btn btn-ghost text-[10px] py-0.5 px-2 flex items-center gap-1 border border-node-border hover:border-accent/50 transition-colors"
          onClick={handleRefreshFromUpstream}
          title="从上游节点拉取信息自动写入"
        >
          <RefreshCw size={10} /> 刷新状态
        </button>
      </div>
      <textarea
        className="input mt-0.5"
        rows={6}
        value={(node.data.promptText as string) || ''}
        onChange={(e) => handleChange('promptText', e.target.value)}
        placeholder="输入提示词，或点击「刷新状态」从上游节点自动拉取..."
      />
      <PromptOptimizer node={node} />
    </div>
  )
}

export default function Inspector() {
  const { nodes, selectedNodeId, updateNodeData, removeNode, selectNode } = useFlowStore()
  const assets = useAssetStore((s) => s.assets)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const projects = useProjectStore((s) => s.projects)
  const { styles, activeStyleId, setActiveStyle } = useStyleStore()
  const projectNameMap = new Map(projects.map((p) => [p.id, p.name]))
  const node = nodes.find((n) => n.id === selectedNodeId)

  if (!node) {
    return (
      <div className="h-full panel">
        <EmptyState icon={Info} title="选择节点查看属性" subtitle="属性将在此显示" />
      </div>
    )
  }

  const typeLabel = nodeTypeLabels[node.type || 'assetInput']
  const handleChange = (field: string, value: unknown) => updateNodeData(node.id, { [field]: value })

  return (
    <div className="flex flex-col h-full panel">
      <div className="panel-header">
        <span className="flex items-center gap-1.5"><Settings size={14} />属性</span>
        <button className="btn btn-ghost p-0.5 text-text-secondary hover:text-accent" onClick={() => { removeNode(node.id); selectNode(null) }}>
          <Trash2 size={12} />
        </button>
      </div>

      <div className="panel-content flex-1 space-y-3">
        <div>
          <label className="text-[10px] text-text-secondary uppercase tracking-wider">类型</label>
          <div className="text-xs mt-0.5">{typeLabel}</div>
        </div>
        <div>
          <label className="text-[10px] text-text-secondary uppercase tracking-wider">标签</label>
          <input className="input mt-0.5" value={(node.data.label as string) || ''} onChange={(e) => handleChange('label', e.target.value)} />
        </div>

        {/* --- Character Card --- */}
        {node.type === 'characterCard' && (
          <>
            <CardAssetFields
              tag="Character"
              config={{
                assetIdField: 'characterAssetId',
                nameField: 'characterName',
                nameLabel: '名称',
                descField: 'characterAppearance',
                descLabel: '外观描述',
                refImageField: 'characterRefImage',
                refImagePlaceholder: '本地路径或URL...',
              }}
              nodeData={node.data}
              handleChange={handleChange}
              assets={assets}
              activeProjectId={activeProjectId}
              projectNameMap={projectNameMap}
              extra={
                <div><label className="text-[10px] text-text-secondary uppercase tracking-wider">多角色（逗号分隔ID）</label><textarea className="input mt-0.5" rows={2} value={(node.data.characterCards as string) || ''} onChange={(e) => handleChange('characterCards', e.target.value)} placeholder="fade, luna, rush" /></div>
              }
            />

            <div className="pt-1 border-t border-node-border mt-2">
              <p className="text-[10px] text-text-secondary mb-2">角色一致性设置</p>
              <div>
                <label className="text-[10px] text-text-secondary uppercase tracking-wider">面部一致性提示词</label>
                <textarea className="input mt-0.5 h-16" rows={2} value={(node.data.characterFacePrompt as string) || ''} onChange={(e) => handleChange('characterFacePrompt', e.target.value)} placeholder="描述面部特征以保持一致性..." />
              </div>
              <div>
                <label className="text-[10px] text-text-secondary uppercase tracking-wider">体型/着装一致性</label>
                <textarea className="input mt-0.5 h-16" rows={2} value={(node.data.characterBodyPrompt as string) || ''} onChange={(e) => handleChange('characterBodyPrompt', e.target.value)} placeholder="描述体型和着装以保持一致性..." />
              </div>
              <div>
                <label className="text-[10px] text-text-secondary uppercase tracking-wider">负面提示词</label>
                <textarea className="input mt-0.5 h-16" rows={2} value={(node.data.characterNegativePrompt as string) || ''} onChange={(e) => handleChange('characterNegativePrompt', e.target.value)} placeholder="要避免的元素..." />
              </div>
              <div>
                <label className="text-[10px] text-text-secondary uppercase tracking-wider">推荐种子</label>
                <input className="input mt-0.5" type="number" value={(node.data.characterConsistencySeed as number) || ''} onChange={(e) => handleChange('characterConsistencySeed', e.target.value ? parseInt(e.target.value) : undefined)} />
              </div>
              <div>
                <label className="text-[10px] text-text-secondary uppercase tracking-wider">参考图URLs</label>
                <textarea className="input mt-0.5 h-16" rows={2} value={Array.isArray(node.data.characterRefImages) ? (node.data.characterRefImages as string[]).join('\n') : ((node.data.characterRefImages as string | undefined) || '')} onChange={(e) => handleChange('characterRefImages', e.target.value.split('\n').filter(line => line.trim()))} placeholder="每行一个URL" />
              </div>
            </div>

            <div className="pt-1 border-t border-node-border mt-2">
              <p className="text-[10px] text-text-secondary mb-2">TTS 语音设置</p>
              <div>
                <label className="text-[10px] text-text-secondary uppercase tracking-wider">TTS音色ID</label>
                <input className="input mt-0.5" value={(node.data.characterTTSVoiceId as string) || ''} onChange={(e) => handleChange('characterTTSVoiceId', e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] text-text-secondary uppercase tracking-wider">TTS语速</label>
                <input className="input mt-0.5" type="number" step={0.1} min={0.5} max={2.0} value={(node.data.characterTTSSpeed as number) || ''} onChange={(e) => handleChange('characterTTSSpeed', e.target.value ? parseFloat(e.target.value) : undefined)} />
              </div>
              <div>
                <label className="text-[10px] text-text-secondary uppercase tracking-wider">TTS音调</label>
                <input className="input mt-0.5" type="number" step={1} min={-20} max={20} value={(node.data.characterTTSPitch as number) || ''} onChange={(e) => handleChange('characterTTSPitch', e.target.value ? parseInt(e.target.value) : undefined)} />
              </div>
            </div>
          </>
        )}

        {/* --- Scene Card --- */}
        {node.type === 'sceneCard' && (
          <CardAssetFields
            tag="Scene"
            config={{
              assetIdField: 'sceneAssetId',
              nameField: 'sceneName',
              nameLabel: '名称',
              descField: 'sceneDescription',
              descLabel: '场景描述',
              refImageField: 'sceneRefImage',
              refImagePlaceholder: '本地全景图路径或URL...',
            }}
            nodeData={node.data}
            handleChange={handleChange}
            assets={assets}
            activeProjectId={activeProjectId}
            projectNameMap={projectNameMap}
          />
        )}

        {/* --- Item Card --- */}
        {node.type === 'itemCard' && (
          <CardAssetFields
            tag="Item"
            config={{
              assetIdField: 'itemAssetId',
              nameField: 'itemName',
              nameLabel: '名称',
              descField: 'itemDescription',
              descLabel: '物品描述',
              refImageField: 'itemRefImage',
              refImagePlaceholder: '本地图片路径或URL...',
            }}
            nodeData={node.data}
            handleChange={handleChange}
            assets={assets}
            activeProjectId={activeProjectId}
            projectNameMap={projectNameMap}
          />
        )}

        {/* --- Script --- */}
        {node.type === 'script' && <ScriptInspector node={node} handleChange={handleChange} />}

        {/* --- Storyboard --- */}
        {node.type === 'storyboard' && <StoryboardInspector node={node} handleChange={handleChange} />}

        {/* --- Prompt --- */}
        {node.type === 'prompt' && <PromptInspector node={node} handleChange={handleChange} />}

        {/* --- GPT Image 2 --- */}
        {node.type === 'gptImage2' && (
          <>
            <div><label className="text-[10px] text-text-secondary uppercase tracking-wider">模型 (Model)</label>
              <select className="input mt-0.5" value={(node.data.gptImageModel as string) || 'gpt-image-2-vip'} onChange={(e) => handleChange('gptImageModel', e.target.value)}>
                <option value="gpt-image-2-vip">gpt-image-2-vip (推荐)</option>
                <option value="gpt-image-2">gpt-image-2</option>
              </select></div>
            <div><label className="text-[10px] text-text-secondary uppercase tracking-wider">画面比例 / 分辨率</label>
              <select className="input mt-0.5" value={(node.data.gptImageAspectRatio as string) || '1:1'} onChange={(e) => handleChange('gptImageAspectRatio', e.target.value)}>
                <optgroup label="预设比例">
                  {ASPECT_RATIO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </optgroup>
                <optgroup label="分辨率 (VIP)">
                  <option value="1024x1024">1k (1024x1024)</option>
                  <option value="2048x2048">2k (2048x2048)</option>
                  <option value="4096x4096">4k (4096x4096)</option>
                </optgroup>
              </select></div>
            <div><label className="text-[10px] text-text-secondary uppercase tracking-wider">图片质量 (Quality)</label>
              <select className="input mt-0.5" value={(node.data.gptImageQuality as string) || 'auto'} onChange={(e) => handleChange('gptImageQuality', e.target.value)}>
                <option value="auto">自动 (Auto)</option>
                <option value="high">高 (High)</option>
                <option value="medium">中 (Medium)</option>
                <option value="low">低 (Low)</option>
              </select></div>
            <div><label className="text-[10px] text-text-secondary uppercase tracking-wider">参考图URL（每行一个）</label>
              <textarea className="input mt-0.5" rows={3} value={(node.data.gptImageUrls as string) || ''} onChange={(e) => handleChange('gptImageUrls', e.target.value)} placeholder="https://example.com/ref1.jpg" /></div>
            <div><label className="text-[10px] text-text-secondary uppercase tracking-wider">并发数量 (Batch Count)</label>
              <input className="input mt-0.5" type="number" min={1} max={10} value={(node.data.batchCount as number) || 1} onChange={(e) => handleChange('batchCount', parseInt(e.target.value) || 1)} /></div>
            <div className="pt-1 border-t border-node-border">
              <label className="text-[10px] text-text-secondary uppercase tracking-wider">风格选择</label>
              <select className="input mt-0.5" value={(node.data.activeStyleId as string) || activeStyleId || ''} onChange={(e) => { handleChange('activeStyleId', e.target.value === '' ? undefined : e.target.value); setActiveStyle(e.target.value || null) }}>
                <option value="">无风格</option>
                {styles.map((style) => (
                  <option key={style.id} value={style.id}>{style.name}</option>
                ))}
              </select>
              {(() => { const sid = (node.data.activeStyleId as string) || activeStyleId; const current = sid ? styles.find((s) => s.id === sid) : undefined; return current ? <div className="text-[10px] text-accent mt-1">{current.name}</div> : null })()}
            </div>
          </>
        )}

        {/* --- Banana Image --- */}
        {node.type === 'banana' && (
          <>
            <div><label className="text-[10px] text-text-secondary uppercase tracking-wider">模型 (Model)</label>
              <input className="input mt-0.5" value={(node.data.bananaModel as string) || 'gpt-image-2'} onChange={(e) => handleChange('bananaModel', e.target.value)} placeholder="gpt-image-2" />
            </div>
            <div><label className="text-[10px] text-text-secondary uppercase tracking-wider">画面比例 / 分辨率</label>
              <select className="input mt-0.5" value={(node.data.bananaAspectRatio as string) || '1024x1024'} onChange={(e) => handleChange('bananaAspectRatio', e.target.value)}>
                <optgroup label="预设比例">
                  {ASPECT_RATIO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </optgroup>
                <optgroup label="分辨率 (像素)">
                  <option value="1024x1024">1024x1024</option>
                  <option value="2048x2048">2048x2048</option>
                  <option value="4096x4096">4096x4096</option>
                  <option value="1774x887">1774x887</option>
                  <option value="2048x1152">2048x1152</option>
                  <option value="3840x2160">3840x2160</option>
                  <option value="887x1774">887x1774</option>
                  <option value="1152x2048">1152x2048</option>
                  <option value="2160x3840">2160x3840</option>
                </optgroup>
              </select></div>
            <div><label className="text-[10px] text-text-secondary uppercase tracking-wider">参考图URL（每行一个）</label>
              <textarea className="input mt-0.5" rows={3} value={(node.data.bananaUrls as string) || ''} onChange={(e) => handleChange('bananaUrls', e.target.value)} placeholder="https://example.com/ref1.jpg" /></div>
            <div><label className="text-[10px] text-text-secondary uppercase tracking-wider">并发数量 (Batch Count)</label>
              <input className="input mt-0.5" type="number" min={1} max={10} value={(node.data.batchCount as number) || 1} onChange={(e) => handleChange('batchCount', parseInt(e.target.value) || 1)} /></div>
            <div className="pt-1 border-t border-node-border">
              <label className="text-[10px] text-text-secondary uppercase tracking-wider">风格选择</label>
              <select className="input mt-0.5" value={(node.data.activeStyleId as string) || activeStyleId || ''} onChange={(e) => { handleChange('activeStyleId', e.target.value === '' ? undefined : e.target.value); setActiveStyle(e.target.value || null) }}>
                <option value="">无风格</option>
                {styles.map((style) => (
                  <option key={style.id} value={style.id}>{style.name}</option>
                ))}
              </select>
              {(() => { const sid = (node.data.activeStyleId as string) || activeStyleId; const current = sid ? styles.find((s) => s.id === sid) : undefined; return current ? <div className="text-[10px] text-accent mt-1">{current.name}</div> : null })()}
            </div>
          </>
        )}

        {/* --- Seedance 2.0 --- */}
        {node.type === 'seedance' && (
          <>
            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-wider">模型</label>
              <select className="input mt-0.5" value={(node.data.seedanceModelId as string) || 'doubao-seedance-2-0-260128'} onChange={(e) => handleChange('seedanceModelId', e.target.value)}>
                <option value="doubao-seedance-2-0-260128">Seedance 2.0（品质优先）</option>
                <option value="doubao-seedance-2-0-fast-260128">Seedance 2.0 Fast（速度优先）</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-wider">生成模式</label>
              <select className="input mt-0.5" value={(node.data.seedanceMode as string) || 'text-to-video'} onChange={(e) => handleChange('seedanceMode', e.target.value)}>
                <option value="text-to-video">文生视频</option>
                <option value="image-to-video-first">图生视频 · 首帧</option>
                <option value="image-to-video-firstlast">图生视频 · 首尾帧</option>
                <option value="multi-modal">多模态参考</option>
                <option value="video-edit">视频编辑</option>
                <option value="video-extend">视频延长</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-wider">分辨率</label>
              <select className="input mt-0.5" value={(node.data.seedanceResolution as string) || '720p'} onChange={(e) => handleChange('seedanceResolution', e.target.value)}>
                <option value="480p">480p</option>
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-wider">宽高比</label>
              <select className="input mt-0.5" value={(node.data.seedanceRatio as string) || '16:9'} onChange={(e) => handleChange('seedanceRatio', e.target.value)}>
                <option value="21:9">21:9</option>
                <option value="16:9">16:9</option>
                <option value="4:3">4:3</option>
                <option value="1:1">1:1</option>
                <option value="3:4">3:4</option>
                <option value="9:16">9:16</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-wider">时长（秒）</label>
              <input className="input mt-0.5" type="number" min={4} max={15} value={(node.data.seedanceDuration as number) || 5} onChange={(e) => handleChange('seedanceDuration', parseInt(e.target.value) || 5)} />
            </div>
            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-wider">推理模式</label>
              <select className="input mt-0.5" value={(node.data.seedanceServiceTier as string) || 'default'} onChange={(e) => handleChange('seedanceServiceTier', e.target.value)}>
                <option value="default">在线推理</option>
                <option value="flex">离线推理（flex）</option>
              </select>
            </div>

            <div className="space-y-2 pt-1 border-t border-node-border">
              <p className="text-[10px] text-text-secondary">高级选项</p>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={(node.data.seedanceGenerateAudio as boolean) || false} onChange={(e) => handleChange('seedanceGenerateAudio', e.target.checked)} className="accent-accent" />
                生成有声视频
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={(node.data.seedanceReturnLastFrame as boolean) || false} onChange={(e) => handleChange('seedanceReturnLastFrame', e.target.checked)} className="accent-accent" />
                返回尾帧图
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={(node.data.seedanceWebSearch as boolean) || false} onChange={(e) => handleChange('seedanceWebSearch', e.target.checked)} className="accent-accent" />
                启用联网搜索
              </label>
            </div>

            <div className="space-y-2 pt-1 border-t border-node-border">
              <p className="text-[10px] text-text-secondary">并发设置</p>
              <div>
                <label className="text-[10px] text-text-secondary uppercase tracking-wider">并发数量 (Batch Count)</label>
                <input className="input mt-0.5" type="number" min={1} max={10} value={(node.data.batchCount as number) || 1} onChange={(e) => handleChange('batchCount', parseInt(e.target.value) || 1)} />
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-node-border">
              <p className="text-[10px] text-text-secondary">参考素材数量（用于连线规划）</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-text-secondary">图片(0-9)</label>
                  <input className="input mt-0.5" type="number" min={0} max={9} value={(node.data.seedanceReferenceImageCount as number) || 0} onChange={(e) => handleChange('seedanceReferenceImageCount', parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="text-[10px] text-text-secondary">视频(0-3)</label>
                  <input className="input mt-0.5" type="number" min={0} max={3} value={(node.data.seedanceReferenceVideoCount as number) || 0} onChange={(e) => handleChange('seedanceReferenceVideoCount', parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="text-[10px] text-text-secondary">音频(0-3)</label>
                  <input className="input mt-0.5" type="number" min={0} max={3} value={(node.data.seedanceReferenceAudioCount as number) || 0} onChange={(e) => handleChange('seedanceReferenceAudioCount', parseInt(e.target.value) || 0)} />
                </div>
              </div>
            </div>
            <div className="pt-1 border-t border-node-border">
              <label className="text-[10px] text-text-secondary uppercase tracking-wider">风格选择</label>
              <select className="input mt-0.5" value={(node.data.activeStyleId as string) || activeStyleId || ''} onChange={(e) => { handleChange('activeStyleId', e.target.value === '' ? undefined : e.target.value); setActiveStyle(e.target.value || null) }}>
                <option value="">无风格</option>
                {styles.map((style) => (
                  <option key={style.id} value={style.id}>{style.name}</option>
                ))}
              </select>
              {(() => { const sid = (node.data.activeStyleId as string) || activeStyleId; const current = sid ? styles.find((s) => s.id === sid) : undefined; return current ? <div className="text-[10px] text-accent mt-1">{current.name}</div> : null })()}
            </div>
          </>
        )}

        {/* --- Output --- */}
        {node.type === 'output' && (
          <>
            <label className="text-[10px] text-text-secondary uppercase tracking-wider block mb-1">保存选项</label>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={(node.data.outputSaveLocal as boolean) || false} onChange={(e) => handleChange('outputSaveLocal', e.target.checked)} className="accent-accent" />保存到本地</label>
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={(node.data.outputUploadOss as boolean) || false} onChange={(e) => handleChange('outputUploadOss', e.target.checked)} className="accent-accent" />上传到 OSS</label>
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={(node.data.outputSyncFeishu as boolean) || false} onChange={(e) => handleChange('outputSyncFeishu', e.target.checked)} className="accent-accent" />同步到飞书</label>
            </div>
          </>
        )}

        {/* --- Asset Input --- */}
        {node.type === 'assetInput' && (
          <div><label className="text-[10px] text-text-secondary uppercase tracking-wider">素材 ID</label>
            <div className="text-xs mt-0.5 opacity-70">{(node.data.assetId as string) || '未关联素材'}</div></div>
        )}
      </div>
    </div>
  )
}
