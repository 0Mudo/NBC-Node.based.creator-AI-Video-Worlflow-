import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Clapperboard } from 'lucide-react'
import type { NodeData } from '@/types/flow'

function StoryboardNode({ data, selected }: NodeProps<NodeData>) {
  return (
    <div className={`node-container ${selected ? 'selected' : ''}`} style={{ borderColor: '#e17055', minWidth: 200 }}>
      <Handle type="source" position={Position.Right} id="output" />
      <div className="node-header">
        <div className="node-icon" style={{ background: '#e17055', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}><Clapperboard size={14} color="#ffffff" /></div>
        <span>{data.label || '分镜'}</span>
      </div>
      <div className="node-body">
        {data.storyboardShotDescription ? (
          <div style={{ maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
            <span className="text-[10px] text-text-secondary">镜{data.storyboardShotNumber} </span>
            {(data.storyboardShotDescription as string)?.slice(0, 100)}
            {(data.storyboardShotDescription as string)?.length > 100 ? '...' : ''}
          </div>
        ) : (
          <span className="text-text-secondary">选择分镜...</span>
        )}
        {data.storyboardDialogue && (
          <div className="text-[10px] text-accent mt-1 truncate" title={data.storyboardDialogue as string}>
            「{(data.storyboardDialogue as string).slice(0, 40)}」
          </div>
        )}
      </div>
    </div>
  )
}
export default memo(StoryboardNode)
