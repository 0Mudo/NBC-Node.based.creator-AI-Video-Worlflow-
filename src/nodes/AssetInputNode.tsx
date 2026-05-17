import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Image } from 'lucide-react'
import type { NodeData } from '@/types/flow'

function AssetInputNode({ data, selected }: NodeProps<NodeData>) {
  return (
    <div className={`node-container ${selected ? 'selected' : ''}`} style={{ borderColor: '#4ecdc4' }}>
      <Handle type="source" position={Position.Right} id="output" />
      <div className="node-header">
        <div className="node-icon" style={{ background: '#4ecdc4', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}><Image size={14} style={{ color: 'rgb(var(--bg-primary))' }} /></div>
        <span>{data.label || '素材输入'}</span>
      </div>
      <div className="node-body">
        {data.assetId ? <span>📁 {data.assetId}</span> : <span className="text-text-secondary">拖入素材</span>}
      </div>
    </div>
  )
}
export default memo(AssetInputNode)
