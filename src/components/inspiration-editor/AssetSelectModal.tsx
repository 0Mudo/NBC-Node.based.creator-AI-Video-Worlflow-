import React, { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Search } from 'lucide-react'
import { useAssetStore } from '@/store/useAssetStore'
import type { Asset, AssetTag } from '@/types/asset'

interface AssetSelectModalProps {
  open: boolean
  onClose: () => void
  onSelect: (asset: Asset) => void
  assetTypeTag: AssetTag // e.g. 'Character', 'Scene', 'Item'
}

export default function AssetSelectModal({ open, onClose, onSelect, assetTypeTag }: AssetSelectModalProps) {
  const { assets } = useAssetStore()
  const [search, setSearch] = useState('')

  const filteredAssets = assets.filter(a => {
    if (!a.tags.includes(assetTypeTag)) return false
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Reset search when opened
  useEffect(() => {
    if (open) setSearch('')
  }, [open])

  return (
    <Dialog.Root open={open} onOpenChange={(val) => !val && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-secondary border border-node-border rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col z-50 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between p-4 border-b border-node-border shrink-0">
            <Dialog.Title className="text-sm font-medium">
              选择 {assetTypeTag === 'Character' ? '角色' : assetTypeTag === 'Scene' ? '场景' : '物品'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-text-secondary hover:text-text-primary">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>
          
          <div className="p-4 border-b border-node-border shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input 
                className="input pl-8 w-full" 
                placeholder="搜索名称..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {filteredAssets.length === 0 ? (
              <div className="text-center text-text-tertiary text-sm py-10">
                未找到相关卡片资产
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredAssets.map(asset => (
                  <div 
                    key={asset.id} 
                    className="p-3 bg-bg-primary border border-node-border rounded hover:border-accent cursor-pointer transition-colors flex gap-3 h-28"
                    onClick={() => onSelect(asset)}
                  >
                    {/* Thumbnail Column */}
                    <div className="w-20 h-full bg-bg-secondary rounded flex items-center justify-center shrink-0 overflow-hidden border border-node-border/50">
                      {asset.thumbnailPath || (asset.type === 'image' && asset.path) ? (
                        <img src={asset.thumbnailPath || asset.path} alt={asset.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-text-tertiary text-[10px]">无图像</span>
                      )}
                    </div>
                    {/* Text Column */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="font-medium text-xs mb-1 truncate text-text-primary">{asset.name}</div>
                      <div className="text-[10px] text-text-secondary line-clamp-4 leading-relaxed whitespace-pre-wrap">
                        {asset.prompt || '(无文本内容)'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
