import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { FileText } from 'lucide-react'
import type { NodeData } from '@/types/flow'

function PromptNode({ data, selected }: NodeProps<NodeData>) {
  return (
    <div className={`node-container ${selected ? 'selected' : ''}`} style={{ borderColor: '#a29bfe' }}>
      <Handle type="target" position={Position.Left} id="input" />
      <Handle type="source" position={Position.Right} id="output" />
      <div className="node-header">
        <div className="node-icon" style={{ background: '#a29bfe' }}><FileText size={14} color="#1a1a2e" /></div>
        <span>{data.label || '提示词'}</span>
      </div>
      <div className="node-body">
        {data.promptText ? (
          <div style={{ maxHeight: 40, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {(data.promptText as string)?.slice(0, 80)}...
          </div>
        ) : <span className="text-text-secondary">编辑提示词...</span>}
      </div>
    </div>
  )
}
export default memo(PromptNode)
