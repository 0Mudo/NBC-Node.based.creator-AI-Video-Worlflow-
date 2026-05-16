import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { ScrollText } from 'lucide-react'
import type { NodeData } from '@/types/flow'

function ScriptNode({ data, selected }: NodeProps<NodeData>) {
  return (
    <div className={`node-container ${selected ? 'selected' : ''}`} style={{ borderColor: '#00cec9', minWidth: 200 }}>
      <Handle type="source" position={Position.Right} id="output" />
      <div className="node-header">
        <div className="node-icon" style={{ background: '#00cec9' }}><ScrollText size={14} color="#1a1a2e" /></div>
        <span>{data.label || '剧本/分镜'}</span>
      </div>
      <div className="node-body">
        {data.scriptText ? (
          <div style={{ maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
            {(data.scriptText as string)?.slice(0, 120)}{(data.scriptText as string)?.length > 120 ? '...' : ''}
          </div>
        ) : (
          <span className="text-text-secondary">输入剧本或分镜...</span>
        )}
      </div>
    </div>
  )
}
export default memo(ScriptNode)
