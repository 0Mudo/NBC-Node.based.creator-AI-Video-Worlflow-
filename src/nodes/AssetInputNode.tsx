import { memo, useMemo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Film, Image, Video } from 'lucide-react'
import type { NodeData } from '@/types/flow'
import { useFlowStore } from '@/store/useFlowStore'
import { useAssetStore } from '@/store/useAssetStore'
import { findUpstream } from '@/engine/graph'
import { MediaThumb, NodeFrame } from './shared'

function isVideoByExtension(path: string): boolean {
  return /\.(mp4|mov|avi|webm|mkv|flv|wmv|m4v)$/i.test(path)
}

function computeRefLabel(
  nodeId: string,
  nodes: ReturnType<typeof useFlowStore.getState>['nodes'],
  edges: ReturnType<typeof useFlowStore.getState>['edges'],
): string | null {
  const currentNode = nodes.find(n => n.id === nodeId)
  if (!currentNode) return null

  const isVideo = (n: typeof nodes[number]): boolean => {
    if (!n.data.assetId) return false
    const asset = useAssetStore.getState().assets.find(a => a.id === n.data.assetId || a.path === n.data.assetId)
    if (asset) return asset.type === 'video'
    return isVideoByExtension(n.data.assetId as string)
  }

  for (const promptNode of nodes) {
    if (promptNode.type !== 'prompt') continue
    const upstream = findUpstream(promptNode.id, nodes, edges)
    const assetNodes = upstream.filter(n => n.type === 'assetInput')
    if (!assetNodes.some(n => n.id === nodeId)) continue

    const sorted = assetNodes.slice().sort((a, b) => {
      if (a.position.y !== b.position.y) return a.position.y - b.position.y
      return a.position.x - b.position.x
    })

    const imageNodes = sorted.filter(n => !isVideo(n))
    const videoNodes = sorted.filter(n => isVideo(n))

    const imgIdx = imageNodes.findIndex(n => n.id === nodeId)
    if (imgIdx >= 0) return `图片参考${imgIdx + 1}`

    const vidIdx = videoNodes.findIndex(n => n.id === nodeId)
    if (vidIdx >= 0) return `视频参考${vidIdx + 1}`
  }

  return null
}

function AssetInputNode({ id, data, selected }: NodeProps<NodeData>) {
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)
  const asset = useAssetStore((s) => s.assets.find((item) => item.id === data.assetId || item.path === data.assetId))
  const preview = asset?.thumbnailPath || asset?.path || (data.assetId as string | undefined)
  const isVideo = asset?.type === 'video' || isVideoByExtension((asset?.path || (data.assetId as string) || ''))

  const refLabel = useMemo(() => computeRefLabel(id, nodes, edges), [id, nodes, edges])

  const name = asset?.name || (data.assetId as string) || '拖入素材'

  return (
    <NodeFrame nodeId={id} selected={selected} borderColor="#4ecdc4" minWidth={180} minHeight={140}>
      <Handle type="source" position={Position.Right} id="output" />
      <div className="node-header flex items-center gap-2 min-w-0">
        <div className="node-icon flex-shrink-0" style={{ background: '#4ecdc4', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          {isVideo ? <Video size={14} style={{ color: 'rgb(var(--bg-primary))' }} /> : <Image size={14} style={{ color: 'rgb(var(--bg-primary))' }} />}
        </div>
        <span className="truncate flex-1 min-w-0">{data.label || '素材输入'}</span>
        {refLabel && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
            style={{
              backgroundColor: isVideo ? '#6c5ce722' : '#4ecdc422',
              color: isVideo ? '#6c5ce7' : '#4ecdc4',
              border: `1px solid ${isVideo ? '#6c5ce744' : '#4ecdc444'}`,
            }}
          >
            {refLabel}
          </span>
        )}
      </div>
      <div className="node-body flex-1 min-h-0 flex flex-col gap-2">
        <div className="flex-1 min-h-[72px]">
          <MediaThumb
            src={preview}
            alt={name}
            icon={isVideo ? <Film size={24} opacity={0.35} /> : <Image size={24} opacity={0.35} />}
          />
        </div>
        <div className="text-[10px] text-text-secondary truncate">
          {name}
        </div>
      </div>
    </NodeFrame>
  )
}
export default memo(AssetInputNode)
