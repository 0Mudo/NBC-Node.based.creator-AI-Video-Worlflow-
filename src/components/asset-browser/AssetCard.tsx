import type { Asset } from '@/types/asset'
import { ASSET_TAG_CN } from '@/types/asset'
import { Play, Trash2, Pencil, CheckSquare, Square, CloudOff } from 'lucide-react'
import VideoThumbnail from './VideoThumbnail'

interface AssetCardProps {
  asset: Asset
  selected: boolean
  onClick: () => void
  onView?: (asset: Asset) => void
  onDragStart?: (e: React.DragEvent) => void
  onDelete?: (asset: Asset) => void
  onEditTags?: (asset: Asset) => void
  onDeleteOss?: (asset: Asset) => void
  isMultiSelect?: boolean
  isChecked?: boolean
  onToggleSelect?: (id: string) => void
}

const TAG_CLASS: Record<string, string> = {
  'Character': 'tag-red',
  'Scene': 'tag-yellow',
  'GPT Image': 'tag-purple',
  'Seedance': 'tag-green',
  'Item': 'tag-orange',
  'Output': 'tag-blue',
  'ZzzMap': 'tag-green',
}

export default function AssetCard({ asset, selected, onClick, onView, onDragStart, onDelete, onEditTags, onDeleteOss, isMultiSelect, isChecked, onToggleSelect }: AssetCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
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

  const handleClick = () => {
    if (isMultiSelect && onToggleSelect) {
      onToggleSelect(asset.id)
    } else {
      onClick()
    }
  }

  return (
    <div
      className={`asset-card group relative ${selected && !isMultiSelect ? 'ring-2 ring-accent' : ''} ${isChecked ? 'ring-2 ring-accent/50 bg-accent/5' : ''}`}
      onClick={handleClick}
      draggable={!isMultiSelect}
      onDragStart={!isMultiSelect ? handleDragStart : undefined}
    >
      {/* Multi-select checkbox */}
      {isMultiSelect && (
        <div className="absolute top-1 left-1 z-20">
          <button
            className="p-0.5 rounded bg-bg-primary/90 hover:bg-bg-primary text-accent"
            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(asset.id) }}
          >
            {isChecked ? <CheckSquare size={16} /> : <Square size={16} className="text-text-tertiary" />}
          </button>
        </div>
      )}

      {/* Action buttons (hover) */}
      {!isMultiSelect && (
        <div className="absolute top-1 right-1 z-10 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEditTags && (
            <button
              className="p-0.5 rounded bg-accent/80 text-white hover:bg-accent"
              onClick={(e) => { e.stopPropagation(); onEditTags(asset) }}
              title="编辑标签"
            >
              <Pencil size={11} />
            </button>
          )}
          {asset.source === 'oss' && onDeleteOss && (
            <button
              className="p-0.5 rounded bg-orange-500/80 text-white hover:bg-orange-600"
              onClick={(e) => { e.stopPropagation(); onDeleteOss(asset) }}
              title="从 OSS 删除"
            >
              <CloudOff size={11} />
            </button>
          )}
          {onDelete && (
            <button
              className="p-0.5 rounded bg-red-500/80 text-white hover:bg-red-600"
              onClick={(e) => { e.stopPropagation(); onDelete(asset) }}
              title="删除素材"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      )}

      {/* Preview Area */}
      <div
        className="w-full aspect-square bg-bg-tertiary relative overflow-hidden flex items-center justify-center"
        onDoubleClick={(e) => { e.stopPropagation(); if (onView) onView(asset) }}
      >
        {asset.type === 'video' ? (
          <div className="relative w-full h-full">
            <VideoThumbnail src={asset.path} alt={asset.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
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
            <span key={tag} className={`tag ${TAG_CLASS[tag] || 'tag-blue'}`}>{ASSET_TAG_CN[tag] || tag}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
