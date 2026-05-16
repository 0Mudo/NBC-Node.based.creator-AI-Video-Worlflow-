import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Box } from 'lucide-react'
import { useFlowStore } from '@/store/useFlowStore'
import { useAssetStore } from '@/store/useAssetStore'
import type { NodeData } from '@/types/flow'
import type { Asset } from '@/types/asset'

function ItemCardNode({ id, data, selected }: NodeProps<NodeData>) {
  const assetId = data.itemAssetId as string | undefined
  const assetImage = useAssetStore((s) => assetId ? s.assets.find(a => a.id === assetId)?.thumbnailPath : undefined)
  const refImage = (data.itemRefImage || assetImage) as string | undefined

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const dataStr = e.dataTransfer.getData('application/asset')
    if (dataStr) {
      try {
        const asset: Asset = JSON.parse(dataStr)
        useFlowStore.getState().updateNodeData(id, { itemRefImage: asset.path || asset.id })
      } catch (err) { console.warn('Failed to parse asset data', err) }
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div 
      className={`node-container ${selected ? 'selected' : ''}`} 
      style={{ borderColor: '#e67e22', minWidth: 200 }}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <Handle type="source" position={Position.Right} id="output" />
      <div className="node-header">
        <div className="node-icon" style={{ background: '#e67e22' }}><Box size={14} color="#1a1a2e" /></div>
        <span>{data.label || '物品卡'}</span>
      </div>
      <div className="node-body">
        <div className="flex gap-2">
          {refImage ? (
            <div className="w-14 h-14 rounded overflow-hidden flex-shrink-0 bg-bg-tertiary">
              <img
                src={refImage.startsWith('http') || refImage.startsWith('data:') ? refImage : `file://${refImage}`}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                alt={data.itemName as string || ''}
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded overflow-hidden flex-shrink-0 bg-bg-tertiary flex items-center justify-center">
              <Box size={20} opacity={0.3} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {data.itemName ? (
              <>
                <div style={{ fontWeight: 600, color: '#e67e22' }}>{data.itemName}</div>
                <div style={{ marginTop: 2, maxHeight: 36, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 10 }}>
                  {(data.itemDescription as string)?.slice(0, 50)}...
                </div>
              </>
            ) : (
              <span className="text-text-secondary" style={{ fontSize: 11 }}>未设置物品</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
export default memo(ItemCardNode)
