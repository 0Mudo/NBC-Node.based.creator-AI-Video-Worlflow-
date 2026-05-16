import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Film, Play, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import type { NodeData } from '@/types/flow'
import { executeNode } from '@/store/useExecutionEngine'

const MODE_LABELS: Record<string, string> = {
  'text-to-video': '文生视频',
  'image-to-video-first': '图生视频·首帧',
  'image-to-video-firstlast': '图生视频·首尾帧',
  'multi-modal': '多模态',
  'video-edit': '视频编辑',
  'video-extend': '视频延长',
}

function SeedanceNode({ data, selected }: NodeProps<NodeData>) {
  const status = data._execStatus as string | undefined
  const mode = (data.seedanceMode as string) || 'text-to-video'
  const resultUrl = data._resultUrl as string | undefined
  const resultUrls = data._resultUrls as string[] | undefined

  const handleRun = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (status !== 'running') executeNode(data._nodeId as string || '')
  }

  return (
    <div className={`node-container ${selected ? 'selected' : ''} ${status === 'running' ? 'node-running' : ''}`} style={{ borderColor: '#6c5ce7' }}>
      <Handle type="target" position={Position.Left} id="prompt" style={{ top: '20%' }} />
      <Handle type="target" position={Position.Left} id="image" style={{ top: '45%' }} />
      <Handle type="target" position={Position.Left} id="video" style={{ top: '70%' }} />
      <Handle type="source" position={Position.Right} id="output" />
      <div className="node-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="node-icon" style={{ background: '#6c5ce7' }}><Film size={14} color="white" /></div>
          <span>{data.label || 'Seedance视频生成'}</span>
        </div>
        <button className="btn btn-ghost p-0.5" onClick={handleRun} disabled={status === 'running'} title="生成">
          {status === 'running' ? <Loader2 size={14} className="animate-spin text-accent" />
           : status === 'done' ? <CheckCircle2 size={14} className="text-green-400" />
           : status === 'failed' ? <XCircle size={14} className="text-red-400" />
           : <Play size={14} />}
        </button>
      </div>
      <div className="node-body">
        <div className="text-[10px] space-y-0.5">
          <div>{MODE_LABELS[mode] || mode}</div>
          <div className="flex justify-between text-text-secondary">
            <span>{data.seedanceResolution || '720p'} · {data.seedanceRatio || '16:9'}</span>
            <span>{data.seedanceDuration || 5}秒</span>
          </div>
          <div>
            {(data.seedanceGenerateAudio) && <span className="tag tag-purple">有声</span>}
            {(data.seedanceReturnLastFrame) && <span className="tag tag-yellow ml-1">尾帧</span>}
          </div>
        </div>
        {resultUrls && resultUrls.length > 0 ? (
          <div className="flex gap-1 overflow-x-auto mt-1 custom-scrollbar pb-1">
            {resultUrls.map((url, i) => (
              <video key={i} src={url} className="rounded max-h-16 object-cover flex-shrink-0" autoPlay loop muted playsInline />
            ))}
          </div>
        ) : resultUrl ? (
          <video src={resultUrl} className="rounded mt-1 max-h-16 object-cover w-full" autoPlay loop muted playsInline />
        ) : null}
        {data._error ? <div className="text-[10px] text-red-400 mt-1 truncate" title={data._error as string}>{data._error as string}</div> : null}
      </div>
    </div>
  )
}
export default memo(SeedanceNode)
