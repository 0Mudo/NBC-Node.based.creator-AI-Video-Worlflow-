import { useState, useCallback } from 'react'
import { useAssetStore } from '@/store/useAssetStore'
import { useProjectStore } from '@/store/useProjectStore'
import { useProviderStore } from '@/store/useProviderStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { X, Trash2, Pencil } from 'lucide-react'
import type { Asset } from '@/types/asset'
import { ASSET_TAG_CN } from '@/types/asset'
import TagEditor from './TagEditor'

const TAG_CLASS: Record<string, string> = {
  'Character': 'tag-red',
  'Scene': 'tag-yellow',
  'GPT Image': 'tag-purple',
  'Seedance': 'tag-green',
  'Item': 'tag-orange',
  'Output': 'tag-blue',
  'ZzzMap': 'tag-green',
}

export default function AssetDetail() {
  const { assets, selectedAssetId, selectAsset, removeAsset, updateAssetTags, updateAssetProject } = useAssetStore()
  const { projects } = useProjectStore()
  const asset = assets.find((a) => a.id === selectedAssetId)
  const [showTagEditor, setShowTagEditor] = useState(false)

  const handleDelete = useCallback(async () => {
    if (!asset) return
    if (asset.source === 'oss') {
      if (!window.confirm(`确定要从 OSS 永久删除 "${asset.name}" 吗？\n\n此操作不可撤销。`)) return
      try {
        if (window.electronAPI?.deleteOss) {
          const provider = useProviderStore.getState().getProvider('oss')
          const endpoint = (provider?.endpoints[0] || {}) as any
          if (endpoint.accessKeyId && endpoint.accessKeySecret && endpoint.bucket) {
            const config = { accessKeyId: endpoint.accessKeyId, accessKeySecret: endpoint.accessKeySecret, bucket: endpoint.bucket, region: endpoint.region }
            const key = asset.ossKey || asset.id
            const resultStr = await window.electronAPI.deleteOss(config as any, key)
            const result = JSON.parse(resultStr)
            if (result.success) {
              removeAsset(asset.id)
              useNotificationStore.getState().addNotification({ type: 'success', title: 'OSS 删除成功', message: `已从 OSS 删除 "${asset.name}"` })
            } else {
              useNotificationStore.getState().addNotification({ type: 'error', title: 'OSS 删除失败', message: result.error || '未知错误' })
              return
            }
          }
        }
      } catch (e: any) {
        useNotificationStore.getState().addNotification({ type: 'error', title: 'OSS 删除失败', message: e.message })
        return
      }
    } else {
      removeAsset(asset.id)
    }
    selectAsset(null)
  }, [asset, removeAsset, selectAsset])

  if (!asset) return null

  return (
    <div className="border-t border-node-border bg-bg-secondary p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold">素材详情</span>
        <div className="flex items-center gap-1">
          <button
            className="btn btn-ghost p-0.5 text-text-secondary hover:text-accent hover:bg-accent/10"
            onClick={() => setShowTagEditor(true)}
            title="编辑标签"
          >
            <Pencil size={12} />
          </button>
          <button
            className="btn btn-ghost p-0.5 text-text-secondary hover:text-red-500 hover:bg-red-500/10"
            onClick={handleDelete}
            title="删除素材"
          >
            <Trash2 size={12} />
          </button>
          <button className="btn btn-ghost p-0.5" onClick={() => selectAsset(null)}><X size={12} /></button>
        </div>
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
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">标签</span>
          <button
            className="text-[10px] text-accent hover:underline"
            onClick={() => setShowTagEditor(true)}
          >
            编辑
          </button>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {asset.tags.map((tag) => (
            <span key={tag} className={`tag text-[10px] ${TAG_CLASS[tag] || 'tag-blue'}`}>
              {ASSET_TAG_CN[tag] || tag}
            </span>
          ))}
          {asset.tags.length === 0 && (
            <span className="text-[10px] text-text-tertiary">无标签</span>
          )}
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-text-secondary">项目</span>
          <select
            className="text-[10px] bg-bg-primary border border-node-border rounded px-1 py-0.5 max-w-[140px]"
            value={asset.projectId || 'none'}
            onChange={(e) => {
              const val = e.target.value
              updateAssetProject(asset.id, val === 'none' ? undefined : val)
            }}
          >
            <option value="none">未分配</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {asset.source && (
          <div className="flex justify-between">
            <span className="text-text-secondary">来源</span>
            <span className="text-[10px] text-text-tertiary">{asset.source}</span>
          </div>
        )}
      </div>

      {showTagEditor && (
        <TagEditor
          asset={asset}
          onSave={updateAssetTags}
          onClose={() => setShowTagEditor(false)}
        />
      )}
    </div>
  )
}
