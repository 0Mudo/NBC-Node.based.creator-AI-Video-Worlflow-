import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Film, Image } from 'lucide-react'
import type { NodeData } from '@/types/flow'
import { useAssetStore } from '@/store/useAssetStore'
import { MediaThumb, NodeFrame } from './shared'

function AssetInputNode({ id, data, selected }: NodeProps<NodeData>) {
  const asset = useAssetStore((s) => s.assets.find((item) => item.id === data.assetId || item.path === data.assetId))
  const preview = asset?.thumbnailPath || asset?.path || (data.assetId as string | undefined)
  const isVideo = asset?.type === 'video' || /\.(mp4|mov|avi|webm|mkv)$/i.test((asset?.path || (data.assetId as string) || ''))

  return (
    <NodeFrame nodeId={id} selected={selected} borderColor="#4ecdc4" minWidth={180} minHeight={140}>
      <Handle type="source" position={Position.Right} id="output" />
      <div className="node-header">
        <div className="node-icon" style={{ background: '#4ecdc4', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}><Image size={14} style={{ color: 'rgb(var(--bg-primary))' }} /></div>
        <span>{data.label || '素材输入'}</span>
      </div>
      <div className="node-body flex-1 min-h-0 flex flex-col gap-2">
        <div className="flex-1 min-h-[72px]">
          <MediaThumb
            src={preview}
            alt={asset?.name || (data.label as string)}
            icon={isVideo ? <Film size={24} opacity={0.35} /> : <Image size={24} opacity={0.35} />}
          />
        </div>
        <div className="text-[10px] text-text-secondary truncate">
          {asset?.name || (data.assetId as string) || '拖入素材'}
        </div>
      </div>
    </NodeFrame>
  )
}
export default memo(AssetInputNode)
