import { Trash2, EyeOff, X } from 'lucide-react'
import type { Asset } from '@/types/asset'

interface DeleteConfirmDialogProps {
  asset: Asset
  onClose: () => void
  onRemoveOnly: (asset: Asset) => void
  onDeleteFile: (asset: Asset) => void
}

export default function DeleteConfirmDialog({ asset, onClose, onRemoveOnly, onDeleteFile }: DeleteConfirmDialogProps) {
  const isLocal = asset.source === 'local' && asset.path.startsWith('nbc://')
  const isOss = asset.source === 'oss'

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-bg-secondary rounded-lg p-4 w-80 shadow-xl border border-node-border/30"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm font-medium mb-1">确认删除</p>
        <p className="text-xs text-text-secondary mb-1 break-all line-clamp-2" title={asset.name}>
          {asset.name}
        </p>

        {isOss ? (
          <>
            <p className="text-[10px] text-red-400 mb-3">此操作将同时删除 OSS 云端的文件，不可撤销。</p>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost text-xs px-3 py-1" onClick={onClose}>取消</button>
              <button
                className="btn text-xs px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white flex items-center gap-1"
                onClick={() => onDeleteFile(asset)}
              >
                <Trash2 size={12} /> 从OSS删除
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[10px] text-text-tertiary mb-3">请选择删除方式：</p>
            <div className="flex flex-col gap-2">
              <button
                className="btn bg-bg-tertiary hover:bg-bg-tertiary/80 text-xs px-3 py-2 rounded border border-node-border flex items-center gap-2 justify-start"
                onClick={() => onRemoveOnly(asset)}
              >
                <EyeOff size={14} className="text-text-tertiary" />
                <div className="text-left">
                  <span className="font-medium">仅从NBC移除</span>
                  <p className="text-[10px] text-text-tertiary">不在素材库中显示，本地文件保留</p>
                </div>
              </button>
              {isLocal && (
                <button
                  className="btn bg-red-500/10 hover:bg-red-500/20 text-xs px-3 py-2 rounded border border-red-500/20 flex items-center gap-2 justify-start"
                  onClick={() => onDeleteFile(asset)}
                >
                  <Trash2 size={14} className="text-red-400" />
                  <div className="text-left">
                    <span className="font-medium text-red-400">放入回收站</span>
                    <p className="text-[10px] text-text-tertiary">从NBC移除并删除本地文件</p>
                  </div>
                </button>
              )}
            </div>
            <div className="flex justify-end mt-2">
              <button className="btn btn-ghost text-xs px-3 py-1" onClick={onClose}>取消</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
