import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { ScrollText } from 'lucide-react'
import type { NodeData } from '@/types/flow'

function ScriptNode({ data, selected }: NodeProps<NodeData>) {
  return (
    <div className={`node-container ${selected ? 'selected' : ''}`} style={{ borderColor: '#00cec9', minWidth: 200 }}>
      <Handle type="source" position={Position.Right} id="output" />
      <div className="node-header">
        <div className="node-icon" style={{ background: '#00cec9', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}><ScrollText size={14} color="#ffffff" /></div>
        <span>{data.label || '剧本'}</span>
      </div>
      <div className="node-body">
        {data.scriptSceneId ? (
          <div style={{ maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
            <span className="text-[10px] text-text-secondary">第{data.scriptSceneNumber}场 </span>
            {data.scriptSceneHeading || (data.scriptText as string)?.slice(0, 100)}
          </div>
        ) : data.scriptText ? (
          <div style={{ maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
            {(data.scriptText as string)?.slice(0, 120)}
            {(data.scriptText as string)?.length > 120 ? '...' : ''}
          </div>
        ) : (
          <span className="text-text-secondary">选择剧本场次...</span>
        )}
      </div>
    </div>
  )
}
export default memo(ScriptNode)
