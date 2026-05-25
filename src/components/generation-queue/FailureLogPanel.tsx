import { useState } from 'react'
import { useLogStore } from '@/store/useLogStore'
import { useGenerationStore } from '@/store/useGenerationStore'
import { AlertTriangle, Trash2, ClipboardList, Copy, X } from 'lucide-react'
import EmptyState from '@/components/shared/EmptyState'

function safeCopy(text: string): Promise<void> {
  if (navigator.clipboard && document.hasFocus()) {
    return navigator.clipboard.writeText(text)
  }
  return new Promise<void>((resolve, reject) => {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      if (success) resolve()
      else reject(new Error('execCommand copy failed'))
    } catch (e) {
      reject(e)
    }
  })
}

export default function FailureLogPanel() {
  const { reports, clearAll, exportLogs } = useLogStore()
  const failedTasks = useGenerationStore(s => s.tasks.filter(t => t.status === 'failed'))
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Combine store reports + generation queue failures
  const allFailures = [
    ...reports,
    ...failedTasks.map(t => ({
      id: t.id,
      timestamp: t.completedAt || t.startedAt || '',
      nodeType: t.type === 'gptImage2' ? 'GPT图像生成' : t.type === 'banana' ? 'Banana图像生成' : t.type === 'seedance' ? 'Seedance视频生成' : t.type,
      nodeLabel: t.nodeId,
      error: t.error || '未知错误',
      details: undefined,
    })),
  ]

  const handleCopyReport = (r: typeof allFailures[0]) => {
    const text = `失败报告\n======\n时间: ${new Date(r.timestamp).toLocaleString()}\n类型: ${r.nodeType}\n节点: ${r.nodeLabel}\n错误: ${r.error}\n${r.details ? `详情: ${r.details}\n` : ''}`
    safeCopy(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(console.error)
  }

  const typeColors: Record<string, string> = { 'GPT图像生成': 'bg-node-gpt', 'Seedance视频生成': 'bg-node-seedance' }

  return (
    <div className="flex flex-col h-full panel">
      <div className="panel-header">
        <span className="flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-danger" /> 失败日志
          {allFailures.length > 0 && <span className="text-[10px] bg-accent px-1.5 py-0.5 rounded-full">{allFailures.length}</span>}
        </span>
        <div className="flex items-center gap-1">
          {allFailures.length > 0 && (
            <>
              <button className="btn btn-ghost p-0.5 text-text-secondary hover:text-accent" onClick={() => { safeCopy(exportLogs()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(console.error) }} title="导出日志">
                {copied ? <Copy size={12} className="text-success" /> : <ClipboardList size={12} />}
              </button>
              <button className="btn btn-ghost p-0.5 text-text-secondary hover:text-accent" onClick={() => { if (confirm('清除所有失败日志？')) clearAll() }}>
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {allFailures.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="暂无失败记录" subtitle="生成失败时自动记录" />
        ) : (
          <div className="space-y-2">
            {allFailures.map((r) => (
              <div key={r.id} className="bg-bg-tertiary rounded-lg p-2.5 border border-node-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${typeColors[r.nodeType] || 'bg-danger'}`} />
                      <span className="text-xs font-medium">{r.nodeType}</span>
                      <span className="text-[10px] text-text-secondary">{new Date(r.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-danger text-[11px] cursor-pointer hover:underline" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                      {r.error.length > 80 ? r.error.slice(0, 80) + '...' : r.error}
                    </div>
                    {expanded === r.id && (
                      <div className="mt-2 text-[10px] text-text-secondary bg-bg-primary rounded p-2 max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {r.error}
                        {r.details && <div className="mt-1 pt-1 border-t border-node-border">{r.details}</div>}
                      </div>
                    )}
                  </div>
                  <button className="btn btn-ghost p-0.5 flex-shrink-0 text-text-secondary" onClick={() => handleCopyReport(r)} title="复制报告">
                    <Copy size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
