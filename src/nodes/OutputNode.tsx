import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Download, ExternalLink, Image as ImageIcon, Video } from 'lucide-react'
import type { NodeData } from '@/types/flow'

function OutputNode({ data, selected }: NodeProps<NodeData>) {
  const saveLocal = data.outputSaveLocal as boolean
  const uploadOss = data.outputUploadOss as boolean
  const syncFeishu = data.outputSyncFeishu as boolean
  const hasOutput = saveLocal || uploadOss || syncFeishu
  
  const localPath = data._localPath as string | undefined
  const ossUrl = data._ossUrl as string | undefined
  const resultUrl = data._resultUrl as string | undefined
  const resultUrls = data._resultUrls as string[] | undefined
  const openTarget = localPath || ossUrl || resultUrl

  const isVideo = resultUrl?.endsWith('.mp4') || localPath?.endsWith('.mp4')

  const handleOpen = () => {
    if (openTarget && window.electronAPI) {
      window.electronAPI.openInShell(openTarget)
    } else if (openTarget) {
      window.open(openTarget, '_blank')
    }
  }

  return (
    <div className={`node-container ${selected ? 'selected' : ''}`} style={{ borderColor: '#e17055', minWidth: 200, padding: 0, overflow: 'hidden' }}>
      <Handle type="target" position={Position.Left} id="input" />
      
      {/* Header */}
      <div className="node-header justify-between bg-bg-secondary px-3 py-2 m-0 border-b border-node-border">
        <div className="flex items-center gap-1.5">
          <div className="node-icon" style={{ background: '#e17055' }}><Download size={14} color="white" /></div>
          <span>{data.label || '输出'}</span>
        </div>
        {openTarget && (
          <button 
            className="btn btn-primary px-2 py-1 h-6 text-[10px] flex items-center gap-1" 
            onClick={handleOpen}
            title="打开文件"
          >
            <ExternalLink size={10} /> 打开
          </button>
        )}
      </div>

      {/* Body */}
      <div className="node-body p-3">
        {hasOutput ? (
          <div className="flex gap-1.5 mb-2">
            {saveLocal && <span className="tag tag-green">本地</span>}
            {uploadOss && <span className="tag tag-blue">OSS</span>}
            {syncFeishu && <span className="tag tag-purple">飞书</span>}
          </div>
        ) : (
          <span className="text-text-secondary block mb-2">未配置输出动作...</span>
        )}

        {/* Preview Area */}
        {resultUrls && resultUrls.length > 0 ? (
          <div className="mt-2 flex gap-1 overflow-x-auto custom-scrollbar pb-1">
            {resultUrls.map((url, i) => (
              url.endsWith('.mp4') ? 
                <video key={i} src={url} controls className="rounded max-h-32 object-contain flex-shrink-0" /> :
                <img key={i} src={url} alt={`Preview ${i}`} className="rounded max-h-32 object-contain flex-shrink-0" />
            ))}
          </div>
        ) : resultUrl && (
          <div className="mt-2 rounded-md overflow-hidden border border-node-border bg-black/50 relative group">
            {isVideo ? (
              <video src={resultUrl} controls className="w-full h-auto max-h-32 object-contain" />
            ) : (
              <img src={resultUrl} alt="Preview" className="w-full h-auto max-h-32 object-contain" />
            )}
          </div>
        )}
        
        <div className="mt-2 space-y-1 text-[10px]">
          {localPath && <div className="text-green-400 truncate" title={localPath}>💾 {localPath}</div>}
          {ossUrl && <div className="text-blue-400 truncate" title={ossUrl}>☁️ {ossUrl}</div>}
          {data._saveErrors && <div className="text-red-400 truncate" title={data._saveErrors as string}>❌ {data._saveErrors as string}</div>}
        </div>
      </div>
    </div>
  )
}
export default memo(OutputNode)
