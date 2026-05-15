import { useGenerationStore } from '@/store/useGenerationStore'
import { Clock, CheckCircle2, XCircle, Loader2, Play, Trash2 } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = { gptImage2: 'GPT图像生成', seedance: 'Seedance视频生成', comfyUI: 'ComfyUI', banana: 'Banana图像生成' }
const STATUS_LABELS: Record<string, string> = { queued: '排队中', running: '运行中', completed: '已完成', failed: '失败' }

export default function GenerationQueue() {
  const { tasks, clearCompleted, cancelTask } = useGenerationStore()

  return (
    <div className="flex flex-col h-full panel">
      <div className="panel-header">
        <span className="flex items-center gap-1.5">
          <Play size={14} /> 生成队列
          {tasks.length > 0 && <span className="text-[10px] bg-accent px-1.5 py-0.5 rounded-full">{tasks.length}</span>}
        </span>
        <div className="flex items-center gap-1">
          {tasks.length > 0 && (
            <button className="btn btn-ghost p-0.5 text-text-secondary hover:text-accent" onClick={clearCompleted} title="清除已完成">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-secondary text-xs">
            <div className="text-center">
              <Play size={20} className="mx-auto mb-1 opacity-40" />
              <p>暂无生成任务</p>
              <p className="opacity-70 mt-0.5">运行生成节点后将在此显示</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {tasks.map((task) => (
              <div key={task.id} className="queue-item flex items-start gap-2 relative group">
                {task.status === 'completed' ? <CheckCircle2 size={14} className="text-green-400 mt-0.5" />
                 : task.status === 'failed' ? <XCircle size={14} className="text-red-400 mt-0.5" />
                 : task.status === 'running' ? <Loader2 size={14} className="text-accent animate-spin mt-0.5" />
                 : <Clock size={14} className="text-text-secondary mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate">{TYPE_LABELS[task.type] || task.type}</span>
                    <span className="text-[10px] text-text-secondary">{STATUS_LABELS[task.status] || task.status}</span>
                  </div>
                  {(task.status === 'running' || task.status === 'queued') && (
                    <div className="queue-progress mt-1"><div className="queue-progress-bar" style={{ width: `${task.progress}%` }} /></div>
                  )}
                  {task.resultUrl && <img src={task.resultUrl} alt="生成结果" className="rounded max-h-12 object-cover mt-1" />}
                  {task.error && <div className="text-[10px] text-red-400 mt-0.5 truncate" title={task.error}>{task.error}</div>}
                </div>
                {task.status === 'running' && (
                  <button 
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 btn btn-ghost p-0.5 text-text-secondary hover:text-red-400 transition-opacity" 
                    onClick={() => cancelTask(task.id)}
                    title="取消请求"
                  >
                    <XCircle size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
