import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Cpu, Play, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import type { NodeData } from '@/types/flow'
import { executeNode } from '@/store/useExecutionEngine'

function ComfyUINode({ data, selected }: NodeProps<NodeData>) {
  const status = data._execStatus as string | undefined

  const handleRun = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (status !== 'running') executeNode(data._nodeId as string || '')
  }

  return (
    <div className={`node-container ${selected ? 'selected' : ''} ${status === 'running' ? 'node-running' : ''}`} style={{ borderColor: '#00b894' }}>
      <Handle type="target" position={Position.Left} id="prompt" style={{ top: '30%' }} />
      <Handle type="target" position={Position.Left} id="image" style={{ top: '70%' }} />
      <Handle type="source" position={Position.Right} id="output" />
      <div className="node-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="node-icon" style={{ background: '#00b894' }}><Cpu size={14} color="#1a1a2e" /></div>
          <span>{data.label || 'ComfyUI'}</span>
        </div>
        <button className="btn btn-ghost p-0.5" onClick={handleRun} disabled={status === 'running'} title="生成">
          {status === 'running' ? <Loader2 size={14} className="animate-spin text-accent" />
           : status === 'done' ? <CheckCircle2 size={14} className="text-green-400" />
           : status === 'failed' ? <XCircle size={14} className="text-red-400" />
           : <Play size={14} />}
        </button>
      </div>
      <div className="node-body">
        {data.comfyWorkflow ? <span className="text-[10px]">{data.comfyWorkflow as string}</span> : <span className="text-text-secondary text-[10px]">未加载工作流</span>}
        {data._error ? <div className="text-[10px] text-red-400 mt-1 truncate">{data._error as string}</div> : null}
      </div>
    </div>
  )
}
export default memo(ComfyUINode)
