import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Image as ImageIcon, Play, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import type { NodeData } from '@/types/flow'
import { executeNode } from '@/store/useExecutionEngine'

function BananaNode({ data, selected }: NodeProps<NodeData>) {
  const status = data._execStatus as string | undefined
  const resultUrl = data._resultUrl as string | undefined
  const resultUrls = data._resultUrls as string[] | undefined

  const handleRun = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (status !== 'running') executeNode(data._nodeId as string || '')
  }

  return (
    <div className={`node-container ${selected ? 'selected' : ''} ${status === 'running' ? 'node-running' : ''}`} style={{ borderColor: '#f39c12' }}>
      <Handle type="target" position={Position.Left} id="prompt" style={{ top: '25%' }} />
      <Handle type="target" position={Position.Left} id="image" style={{ top: '55%' }} />
      <Handle type="source" position={Position.Right} id="output" />
      <div className="node-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="node-icon" style={{ background: '#f39c12' }}><ImageIcon size={14} color="#ffffff" /></div>
          <span>{data.label || 'Banana图像生成'}</span>
        </div>
        <button className="btn btn-ghost p-0.5" onClick={handleRun} disabled={status === 'running'} title="生成">
          {status === 'running' ? <Loader2 size={14} className="animate-spin text-accent" />
           : status === 'done' ? <CheckCircle2 size={14} className="text-green-400" />
           : status === 'failed' ? <XCircle size={14} className="text-red-400" />
           : <Play size={14} />}
        </button>
      </div>
      <div className="node-body">
        <div className="flex justify-between text-[10px]">
          <span>{data.bananaAspectRatio || '1024x1024'}</span>
          <span className="text-text-secondary">{data.bananaModel || 'gpt-image-2'}</span>
        </div>
        {resultUrls && resultUrls.length > 0 ? (
          <div className="flex gap-1 overflow-x-auto mt-1 custom-scrollbar pb-1">
            {resultUrls.map((url, i) => (
              <img key={i} src={url} className="rounded max-h-16 object-cover flex-shrink-0" alt={`生成结果 ${i + 1}`} />
            ))}
          </div>
        ) : resultUrl ? (
          <img src={resultUrl} className="rounded mt-1 max-h-16 object-cover w-full" alt="生成结果" />
        ) : null}
        {data._error ? <div className="text-[10px] text-red-400 mt-1 truncate" title={data._error as string}>{data._error as string}</div> : null}
      </div>
    </div>
  )
}
export default memo(BananaNode)
