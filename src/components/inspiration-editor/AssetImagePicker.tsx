import React, { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Search, Image, Film } from 'lucide-react'
import { useAssetStore } from '@/store/useAssetStore'
import type { Asset } from '@/types/asset'

interface AssetImagePickerProps {
  open: boolean
  onClose: () => void
  onSelect: (asset: Asset) => void
}

export default function AssetImagePicker({ open, onClose, onSelect }: AssetImagePickerProps) {
  const { assets } = useAssetStore()
  const [search, setSearch] = useState('')

  const filteredAssets = assets.filter(a => {
    if (a.type !== 'image' && a.type !== 'video') return false
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  useEffect(() => {
    if (open) setSearch('')
  }, [open])

  return (
    <Dialog.Root open={open} onOpenChange={(val) => !val && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-secondary border border-node-border rounded-lg shadow-xl w-[640px] max-h-[80vh] flex flex-col z-50 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between p-4 border-b border-node-border shrink-0">
            <Dialog.Title className="text-sm font-medium">
              从素材库选择图片
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
                placeholder="搜索素材..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {filteredAssets.length === 0 ? (
              <div className="text-center text-text-tertiary text-sm py-10">
                素材库中没有图片或视频素材
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {filteredAssets.map(asset => (
                  <div
                    key={asset.id}
                    className="bg-bg-primary border border-node-border rounded-lg overflow-hidden hover:border-accent cursor-pointer transition-colors group"
                    onClick={() => onSelect(asset)}
                  >
                    <div className="aspect-square bg-bg-secondary relative flex items-center justify-center overflow-hidden">
                      {asset.type === 'video' ? (
                        <>
                          {asset.thumbnailPath ? (
                            <img src={asset.thumbnailPath} className="w-full h-full object-cover" alt={asset.name} />
                          ) : (
                            <video src={asset.path} className="w-full h-full object-cover" muted />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Film size={20} className="text-white/80" />
                          </div>
                        </>
                      ) : (
                        <img
                          src={asset.thumbnailPath || asset.path}
                          className="w-full h-full object-cover"
                          alt={asset.name}
                        />
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs truncate text-text-primary" title={asset.name}>{asset.name}</p>
                      <p className="text-[10px] text-text-tertiary mt-0.5 truncate">
                        {asset.type === 'video' ? <Film size={10} className="inline mr-0.5" /> : <Image size={10} className="inline mr-0.5" />}
                        {asset.tags.slice(0, 2).join(', ')}
                      </p>
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
