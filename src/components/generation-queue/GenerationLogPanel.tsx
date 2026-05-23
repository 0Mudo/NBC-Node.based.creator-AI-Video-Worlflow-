import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useGenLogStore, type GenLogEntry } from '@/store/useGenLogStore'
import { X, Trash2, Image, Video, CheckCircle2, XCircle, Clock, Filter } from 'lucide-react'

const MODEL_GROUPS: { key: string; label: string; match: (model: string) => boolean; color: string }[] = [
  { key: 'all', label: '全部', match: () => true, color: '#888' },
  { key: 'banana', label: 'Nano Banana', match: (m) => m.startsWith('nano-banana'), color: '#f39c12' },
  { key: 'gptImage2', label: 'GPT Image 2', match: (m) => m.startsWith('gpt-image'), color: '#6c5ce7' },
  { key: 'seedance', label: 'Seedance', match: (m) => m.startsWith('doubao-seedance'), color: '#00b894' },
]

interface Props { open: boolean; onClose: () => void }

export default function GenerationLogPanel({ open, onClose }: Props) {
  const { entries, clearAll } = useGenLogStore()
  const [filterKey, setFilterKey] = useState('all')

  const filtered = useMemo(() => {
    const group = MODEL_GROUPS.find(g => g.key === filterKey) || MODEL_GROUPS[0]
    return entries.filter(e => group.match(e.model))
  }, [entries, filterKey])

  if (!open) return null

  const successCount = filtered.filter(e => e.status === 'success').length
  const failCount = filtered.filter(e => e.status === 'failure').length

  return createPortal(
    <div className="settings-overlay animate-fade-in" onClick={onClose}>
      <div className="settings-dialog w-[640px] h-[520px] flex flex-col !p-0 animate-reveal-scale" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-node-border/25 flex-shrink-0">
          <h2 className="text-sm font-semibold flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' }}>
              <Clock size={15} className="text-white" />
            </span>
            生成日志
          </h2>
          <div className="flex items-center gap-1.5">
            {entries.length > 0 && (
              <button className="btn btn-ghost text-[10px] py-0.5 px-2 flex items-center gap-1 border border-node-border text-red-400 hover:bg-red-400/10"
                onClick={() => { if (confirm('确定要清除所有生成日志吗？')) clearAll() }}>
                <Trash2 size={10} /> 清除
              </button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <div className="flex items-center gap-1 px-5 py-2 border-b border-node-border/20 bg-bg-secondary/50 flex-shrink-0 overflow-x-auto">
          {MODEL_GROUPS.map(g => (
            <button
              key={g.key}
              className={`text-[10px] px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 whitespace-nowrap ${
                filterKey === g.key ? 'text-white' : 'text-text-tertiary hover:text-text-primary'
              }`}
              style={filterKey === g.key ? { backgroundColor: g.color } : {}}
              onClick={() => setFilterKey(g.key)}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between px-5 py-1.5 text-[10px] text-text-tertiary border-b border-node-border/10 flex-shrink-0">
          <span className="flex items-center gap-1"><Filter size={10} /> 共 {filtered.length} 条</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-green-400" /> {successCount}</span>
            <span className="flex items-center gap-1"><XCircle size={10} className="text-red-400" /> {failCount}</span>
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
              <Clock size={32} className="opacity-20 mb-2" />
              <span className="text-xs">暂无生成日志</span>
            </div>
          ) : (
            filtered.map(entry => (
              <div key={entry.id} className="px-5 py-2.5 border-b border-node-border/10 hover:bg-bg-tertiary/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {entry.status === 'success' ? (
                      <CheckCircle2 size={14} className="text-green-400" />
                    ) : (
                      <XCircle size={14} className="text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium"
                        style={{ backgroundColor: MODEL_GROUPS.find(g => g.match(entry.model))?.color || '#888' }}
                      >
                        {entry.model}
                      </span>
                      <span className="text-[9px] text-text-tertiary">
                        {entry.type === 'image' ? <Image size={10} className="inline mr-0.5" /> : <Video size={10} className="inline mr-0.5" />}
                        {entry.type === 'image' ? '图片' : '视频'}
                      </span>
                      <span className="text-[9px] text-text-tertiary">
                        {entry.source === 'node_editor' ? '节点编辑器' : '灵感编辑器'}
                      </span>
                      {entry.aspectRatio && (
                        <span className="text-[9px] text-text-tertiary">{entry.aspectRatio}</span>
                      )}
                      {entry.imageSize && (
                        <span className="text-[9px] text-text-tertiary">{entry.imageSize}</span>
                      )}
                      <span className="text-[9px] text-text-tertiary ml-auto">
                        {new Date(entry.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-[10px] text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                      {entry.prompt}
                    </div>
                    {entry.error && (
                      <div className="text-[10px] text-red-400 mt-1 line-clamp-1">{entry.error}</div>
                    )}
                    {entry.resultUrl && entry.status === 'success' && (
                      <img src={entry.resultUrl} className="mt-1.5 rounded max-h-16 object-cover" alt="" />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
