import { useAssetStore } from '@/store/useAssetStore'
import { X } from 'lucide-react'

export default function AssetDetail() {
  const { assets, selectedAssetId, selectAsset } = useAssetStore()
  const asset = assets.find((a) => a.id === selectedAssetId)
  if (!asset) return null

  return (
    <div className="border-t border-node-border bg-bg-secondary p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold">素材详情</span>
        <button className="btn btn-ghost p-0.5" onClick={() => selectAsset(null)}><X size={12} /></button>
      </div>
      {asset.thumbnailPath && (
        <img src={asset.thumbnailPath} alt={asset.name} className="w-full rounded mb-2" style={{ maxHeight: 120, objectFit: 'cover' }} />
      )}
      <div className="text-xs space-y-1">
        <div className="flex justify-between"><span className="text-text-secondary">名称</span><span className="truncate ml-2 max-w-[140px]">{asset.name}</span></div>
        <div className="flex justify-between"><span className="text-text-secondary">类型</span><span>{asset.type}</span></div>
        {asset.width && asset.height && <div className="flex justify-between"><span className="text-text-secondary">尺寸</span><span>{asset.width}×{asset.height}</span></div>}
        {asset.size && <div className="flex justify-between"><span className="text-text-secondary">文件</span><span>{(asset.size / 1024 / 1024).toFixed(1)} MB</span></div>}
        <div className="flex justify-between"><span className="text-text-secondary">创建</span><span>{new Date(asset.createdAt).toLocaleDateString()}</span></div>
        {asset.prompt && (
          <div>
            <span className="text-text-secondary block mb-0.5">提示词</span>
            <p className="text-[10px] leading-relaxed bg-bg-primary p-1.5 rounded">{asset.prompt}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-1 mt-1">{asset.tags.map((tag) => <span key={tag} className="tag tag-blue">{tag}</span>)}</div>
      </div>
    </div>
  )
}
