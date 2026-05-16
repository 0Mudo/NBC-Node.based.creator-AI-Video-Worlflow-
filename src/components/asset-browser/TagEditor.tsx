import { useState, useCallback } from 'react'
import type { Asset, AssetTag } from '@/types/asset'
import { ALL_PRESET_TAGS, ASSET_TAG_CN } from '@/types/asset'
import { X, Plus } from 'lucide-react'

interface TagEditorProps {
  asset: Asset
  onSave: (id: string, tags: AssetTag[]) => void
  onClose: () => void
}

const TAG_CLASS_MAP: Record<string, string> = {
  'GPT Image': 'tag-purple',
  'Seedance': 'tag-green',
  'ZzzMap': 'tag-green',
  'Character': 'tag-red',
  'Scene': 'tag-yellow',
  'Item': 'tag-orange',
  'Output': 'tag-blue',
  '本地': 'tag-gray',
  'OSS': 'tag-gray',
  '预设': 'tag-gray',
  '飞书云盘': 'tag-gray',
}

export default function TagEditor({ asset, onSave, onClose }: TagEditorProps) {
  const [selectedTags, setSelectedTags] = useState<AssetTag[]>([...asset.tags])

  const toggleTag = useCallback((tag: AssetTag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }, [])

  const handleSave = () => {
    onSave(asset.id, selectedTags)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-bg-primary border border-node-border rounded-lg shadow-xl w-[360px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-node-border">
          <span className="text-sm font-semibold">编辑素材标签</span>
          <button className="btn btn-ghost p-1 hover:bg-bg-tertiary" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="px-4 py-2 border-b border-node-border/50">
          <span className="text-[11px] text-text-secondary truncate block">{asset.name}</span>
        </div>

        <div className="px-4 py-3 overflow-y-auto">
          <div className="text-[11px] text-text-secondary mb-2 font-medium">预设标签</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {ALL_PRESET_TAGS.map((tag) => {
              const isActive = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                    isActive
                      ? `border-current ${TAG_CLASS_MAP[tag] || 'tag-blue'}`
                      : 'border-node-border text-text-secondary hover:border-text-secondary'
                  }`}
                  onClick={() => toggleTag(tag)}
                >
                  {ASSET_TAG_CN[tag] || tag}
                </button>
              )
            })}
          </div>

          <div className="text-[11px] text-text-secondary mb-2 font-medium">当前标签预览</div>
          <div className="flex flex-wrap gap-1 min-h-[28px] p-2 bg-bg-secondary rounded border border-node-border/50">
            {selectedTags.length === 0 ? (
              <span className="text-[11px] text-text-tertiary">暂无标签</span>
            ) : (
              selectedTags.map((tag) => (
                <span key={tag} className={`tag text-[10px] ${TAG_CLASS_MAP[tag] || 'tag-blue'}`}>
                  {ASSET_TAG_CN[tag] || tag}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-node-border">
          <button className="btn btn-ghost text-xs" onClick={onClose}>取消</button>
          <button className="btn btn-primary text-xs" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  )
}
