import type { Asset } from '@/types/asset'
import { Play } from 'lucide-react'

interface AssetCardProps {
  asset: Asset
  selected: boolean
  onClick: () => void
  onDragStart?: (e: React.DragEvent) => void
}

const TAG_CLASS: Record<string, string> = {
  'Character': 'tag-red',
  'Scene': 'tag-yellow',
  'GPT Image': 'tag-purple',
  'Seedance': 'tag-green',
  'ComfyUI': 'tag-blue',
  'Item': 'tag-orange',
  'Output': 'tag-blue',
  'ZzzMap': 'tag-green',
}

export default function AssetCard({ asset, selected, onClick, onDragStart }: AssetCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    // Determine the type for drop processing
    const isLocal = asset.path.startsWith('blob:') || asset.path.startsWith('file://') || asset.path.startsWith('local://')
    let dropType = 'asset'
    
    if (asset.type === 'text') {
      if (asset.tags.includes('Character')) dropType = 'character-card'
      else if (asset.tags.includes('Scene')) dropType = 'scene-card'
      else if (asset.tags.includes('Item')) dropType = 'item-card'
      else dropType = 'text-card'
    }

    const payload = {
      type: dropType,
      url: asset.path,
      assetType: asset.type,
      isLocal,
      name: asset.name,
      prompt: asset.prompt
    }
    
    e.dataTransfer.setData('application/reactflow', JSON.stringify(payload))
    e.dataTransfer.setData('application/asset', JSON.stringify(asset))
    e.dataTransfer.effectAllowed = 'move'
    onDragStart?.(e)
  }

  return (
    <div
      className={`asset-card group ${selected ? 'ring-2 ring-accent' : ''}`}
      onClick={onClick}
      draggable
      onDragStart={handleDragStart}
    >
      {/* Preview Area */}
      <div className="w-full aspect-square bg-bg-tertiary relative overflow-hidden flex items-center justify-center">
        {asset.type === 'video' ? (
          <div className="relative w-full h-full">
            {asset.thumbnailPath ? (
              <img src={asset.thumbnailPath} className="w-full h-full object-cover" alt="thumbnail" />
            ) : (
              <video src={asset.path} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Play size={24} className="text-white opacity-80" />
            </div>
          </div>
        ) : asset.type === 'text' ? (
          asset.thumbnailPath ? (
            <img src={asset.thumbnailPath} alt={asset.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full p-2 overflow-hidden bg-bg-secondary text-xs text-text-secondary whitespace-pre-wrap break-words">
              {asset.prompt ? asset.prompt.substring(0, 100) + (asset.prompt.length > 100 ? '...' : '') : '文本卡片'}
            </div>
          )
        ) : (
          <img src={asset.thumbnailPath || asset.path} alt={asset.name} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="asset-card-info">
        <div className="asset-card-name" title={asset.name}>
          {asset.name}
        </div>
        <div className="asset-card-tags">
          {asset.tags.slice(0, 2).map((tag) => (
            <span key={tag} className={`tag ${TAG_CLASS[tag] || 'tag-blue'}`}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
