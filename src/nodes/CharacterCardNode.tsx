import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { User } from 'lucide-react'
import { useFlowStore } from '@/store/useFlowStore'
import { useAssetStore } from '@/store/useAssetStore'
import { characters } from '@/data/characters'
import type { NodeData } from '@/types/flow'
import type { Asset } from '@/types/asset'
import { MediaThumb, NodeFrame } from './shared'

function CharacterCardNode({ id, data, selected }: NodeProps<NodeData>) {
  const assetId = data.characterAssetId as string | undefined
  const assetImage = useAssetStore((s) => assetId ? s.assets.find(a => a.id === assetId)?.thumbnailPath : undefined)
  const refImage = (data.characterRefImage || assetImage) as string | undefined
  const multiNames = Array.isArray(data.characterNames) ? data.characterNames as string[] : []
  const multiAppearances = Array.isArray(data.characterAppearances) ? data.characterAppearances as string[] : []
  const multiImages = Array.isArray(data.characterRefImages) ? data.characterRefImages as string[] : []
  const cardNames = multiNames.length ? multiNames : (data.characterName ? [data.characterName as string] : [])
  const previewImages = Array.from(new Set([refImage, ...multiImages].filter(Boolean) as string[])).slice(0, 4)

  const characterName = data.characterName as string | undefined
  const knownCharacter = characterName ? characters.find((c) => c.name === characterName) : undefined
  const hasConsistency =
    !!(data.characterFacePrompt) ||
    !!(data.characterBodyPrompt) ||
    !!(data.characterNegativePrompt) ||
    data.characterConsistencySeed != null ||
    (knownCharacter && (
      knownCharacter.facePrompt ||
      knownCharacter.bodyPrompt ||
      knownCharacter.negativePrompt ||
      knownCharacter.consistencySeed != null
    )) ||
    (Array.isArray(data.characterRefImages) && (data.characterRefImages as string[]).length > 0)

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const dataStr = e.dataTransfer.getData('application/asset')
    if (dataStr) {
      try {
        const asset: Asset = JSON.parse(dataStr)
        useFlowStore.getState().updateNodeData(id, { characterRefImage: asset.path || asset.id })
      } catch (err) { console.warn('Failed to parse asset data', err) }
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <NodeFrame
      nodeId={id}
      selected={selected}
      borderColor="#ff6b6b"
      minWidth={220}
      minHeight={160}
    >
      <div
      className={`${hasConsistency ? 'node-consistent' : ''} h-full flex flex-col`}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <Handle type="source" position={Position.Right} id="output" />
      <div className="node-header">
        <div className="node-icon" style={{ background: '#ff6b6b', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}><User size={14} style={{ color: 'rgb(var(--bg-primary))' }} /></div>
        <span>{data.label || '角色卡'}</span>
        {hasConsistency && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-accent/15 text-accent font-medium ml-auto" title="已配置角色一致性数据">🎯一致性</span>
        )}
      </div>
      <div className="node-body flex-1 min-h-0 flex flex-col gap-2">
        <div className={`grid gap-2 ${previewImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} min-h-[88px] flex-1`}>
          {previewImages.length > 0 ? (
            previewImages.map((image, index) => (
              <div key={`${image}_${index}`} className="min-h-[40px]">
                <MediaThumb src={image} alt={cardNames[index] || cardNames[0] || ''} icon={<User size={20} opacity={0.3} />} />
              </div>
            ))
          ) : (
            <MediaThumb icon={<User size={20} opacity={0.3} />} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {cardNames.length > 0 ? (
            <>
              <div style={{ fontWeight: 600, color: '#ff6b6b' }}>
                {cardNames.length > 1 ? `${cardNames.length} 个角色` : cardNames[0]}
              </div>
              <div className="text-[10px] text-text-secondary leading-relaxed line-clamp-4">
                {(multiAppearances.length ? multiAppearances.join('；') : (data.characterAppearance as string) || '已选择角色').slice(0, 160)}
              </div>
              {cardNames.length > 1 && (
                <div className="mt-1 text-[10px] text-text-secondary line-clamp-2">
                  {cardNames.join('、')}
                </div>
              )}
            </>
          ) : (
            <span className="text-text-secondary" style={{ fontSize: 11 }}>未设置角色</span>
          )}
          </div>
        </div>
      </div>
    </NodeFrame>
  )
}
export default memo(CharacterCardNode)
