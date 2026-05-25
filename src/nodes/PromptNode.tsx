import { memo, useState, useRef, useMemo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { FileText, Loader2, RefreshCw, Sparkles, Check, X, Image, Film, Plus } from 'lucide-react'
import type { NodeData } from '@/types/flow'
import { useFlowStore } from '@/store/useFlowStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { optimizePrompt } from '@/api/promptOptimize'
import { collectMediaRefsFromUpstream } from '@/engine/promptResolver'
import { AutoTextArea, NodeFrame } from './shared'

function getFileName(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  const name = parts[parts.length - 1] || path
  return name.length > 28 ? name.slice(0, 26) + '…' : name
}

function PromptNode({ id, data, selected }: NodeProps<NodeData>) {
  const { nodes, edges, updateNodeData } = useFlowStore()
  const [optimizing, setOptimizing] = useState(false)
  const [optimized, setOptimized] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const { imageRefs, videoRefs } = useMemo(() => {
    return collectMediaRefsFromUpstream(id, nodes, edges)
  }, [id, nodes, edges])

  const hasMediaRefs = imageRefs.length > 0 || videoRefs.length > 0

  const handleRefresh = () => {
    const upstreamNodeIds = new Set<string>()
    edges.filter((e) => e.target === id).forEach((e) => upstreamNodeIds.add(e.source))
    const upstreamNodes = nodes.filter((n) => upstreamNodeIds.has(n.id))
    const parts: string[] = []

    for (const un of upstreamNodes) {
      if (un.type === 'characterCard') {
        const names = Array.isArray(un.data.characterNames) ? un.data.characterNames.join('、') : (un.data.characterName as string) || ''
        const desc = Array.isArray(un.data.characterAppearances) ? un.data.characterAppearances.join('\n') : (un.data.characterAppearance as string) || ''
        if (names || desc) parts.push(`角色「${names}」：${desc}`)
      } else if (un.type === 'sceneCard') {
        const names = Array.isArray(un.data.sceneNames) ? un.data.sceneNames.join('、') : (un.data.sceneName as string) || ''
        const desc = Array.isArray(un.data.sceneDescriptions) ? un.data.sceneDescriptions.join('\n') : (un.data.sceneDescription as string) || ''
        if (names || desc) parts.push(`场景「${names}」：${desc}`)
      } else if (un.type === 'itemCard') {
        const names = Array.isArray(un.data.itemNames) ? un.data.itemNames.join('、') : (un.data.itemName as string) || ''
        const desc = Array.isArray(un.data.itemDescriptions) ? un.data.itemDescriptions.join('\n') : (un.data.itemDescription as string) || ''
        if (names || desc) parts.push(`物品「${names}」：${desc}`)
      } else if (un.type === 'script') {
        const text = (un.data.scriptText as string) || ''
        if (text) parts.push(`[剧本]\n${text}`)
      } else if (un.type === 'storyboard') {
        const desc = (un.data.storyboardShotDescription as string) || ''
        const shotType = (un.data.storyboardShotType as string) || ''
        const dialogue = (un.data.storyboardDialogue as string) || ''
        parts.push(`[分镜 ${shotType}]\n${desc}${dialogue ? `\n对白：「${dialogue}」` : ''}`)
      }
    }

    if (!parts.length && !hasMediaRefs) {
      useNotificationStore.getState().addNotification({
        type: 'warning',
        title: '无上游信息',
        message: '请先连入三卡、场次、分镜节点或素材节点。',
      })
      return
    }

    if (hasMediaRefs) {
      if (imageRefs.length > 0) {
        const names = imageRefs.map((ref, i) => `{{图片参考${i + 1}}}（${getFileName(ref)}）`).join('\n')
        parts.push(`【可用图片素材】\n${names}`)
      }
      if (videoRefs.length > 0) {
        const names = videoRefs.map((ref, i) => `{{视频参考${i + 1}}}（${getFileName(ref)}）`).join('\n')
        parts.push(`【可用视频素材】\n${names}`)
      }
    }

    updateNodeData(id, { promptText: parts.join('\n\n') })
  }

  const insertRef = (variableName: string) => {
    const currentText = (data.promptText as string) || ''
    const ta = textareaRef.current
    if (ta) {
      const start = ta.selectionStart ?? currentText.length
      const end = ta.selectionEnd ?? currentText.length
      const newText = currentText.slice(0, start) + variableName + currentText.slice(end)
      updateNodeData(id, { promptText: newText })
      requestAnimationFrame(() => {
        ta.focus()
        const newPos = start + variableName.length
        ta.setSelectionRange(newPos, newPos)
      })
    } else {
      updateNodeData(id, { promptText: currentText + variableName })
    }
  }

  const handleOptimize = async () => {
    const promptText = (data.promptText as string) || ''
    if (!promptText.trim()) return
    setOptimizing(true)
    try {
      const res = await optimizePrompt({ originalPrompt: promptText })
      if (res.error) {
        useNotificationStore.getState().addNotification({
          type: 'error',
          title: '提示词优化失败',
          message: res.error,
        })
      } else {
        setOptimized(res.optimized)
      }
    } finally {
      setOptimizing(false)
    }
  }

  return (
    <NodeFrame nodeId={id} selected={selected} borderColor="#a29bfe" minWidth={280} minHeight={200}>
      <Handle type="target" position={Position.Left} id="input" />
      <Handle type="source" position={Position.Right} id="output" />
      <div className="node-header">
        <div className="node-icon" style={{ background: '#a29bfe', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}><FileText size={14} style={{ color: 'rgb(var(--bg-primary))' }} /></div>
        <span>{data.label || '提示词'}</span>
      </div>
      <div className="node-body flex-1 min-h-0 flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <button
            className="btn btn-ghost text-[10px] px-2 py-1 border border-node-border hover:border-accent/50"
            onClick={handleRefresh}
          >
            <RefreshCw size={11} className="mr-1" /> 刷新状态
          </button>
          <button
            className="btn btn-ghost text-[10px] px-2 py-1 border border-node-border hover:border-accent/50"
            onClick={handleOptimize}
            disabled={optimizing}
          >
            {optimizing ? <Loader2 size={11} className="mr-1 animate-spin" /> : <Sparkles size={11} className="mr-1" />}
            AI 优化
          </button>
        </div>

        {hasMediaRefs && (
          <div className="flex flex-col gap-1">
            {imageRefs.length > 0 && (
              <div className="flex items-center gap-1">
                <Image size={10} className="text-text-tertiary flex-shrink-0" />
                <div className="flex flex-wrap gap-0.5">
                  {imageRefs.map((ref, i) => (
                    <button
                      key={`img-${i}`}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-accent/10 text-accent hover:bg-accent/25 transition-colors cursor-pointer"
                      title={`插入 {{图片参考${i + 1}}} — ${getFileName(ref)}`}
                      onClick={() => insertRef(`{{图片参考${i + 1}}}`)}
                    >
                      <Plus size={8} />
                      图{i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {videoRefs.length > 0 && (
              <div className="flex items-center gap-1">
                <Film size={10} className="text-text-tertiary flex-shrink-0" />
                <div className="flex flex-wrap gap-0.5">
                  {videoRefs.map((ref, i) => (
                    <button
                      key={`vid-${i}`}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-accent-secondary/10 text-accent-secondary hover:bg-accent-secondary/25 transition-colors cursor-pointer"
                      title={`插入 {{视频参考${i + 1}}} — ${getFileName(ref)}`}
                      onClick={() => insertRef(`{{视频参考${i + 1}}}`)}
                    >
                      <Plus size={8} />
                      视{i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <AutoTextArea
          value={(data.promptText as string) || ''}
          onChange={(value) => updateNodeData(id, { promptText: value })}
          inputRef={textareaRef}
          placeholder={hasMediaRefs
            ? "输入提示词…\n可用变量：{{图片参考1}} {{视频参考1}}（点击上方标签插入）"
            : "输入提示词…\n可用变量：{{character}} {{scene}} {{图片参考1}} {{视频参考1}}"
          }
        />
        {optimized && (
          <div className="border border-accent/30 rounded-md p-2 bg-accent/5 text-[10px] text-text-secondary space-y-2">
            <div className="max-h-24 overflow-auto whitespace-pre-wrap">{optimized}</div>
            <div className="flex items-center gap-1">
              <button className="btn btn-accent text-[10px] px-2 py-1" onClick={() => { updateNodeData(id, { promptText: optimized }); setOptimized(null) }}>
                <Check size={11} className="mr-1" /> 采用
              </button>
              <button className="btn btn-ghost text-[10px] px-2 py-1" onClick={() => setOptimized(null)}>
                <X size={11} className="mr-1" /> 关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </NodeFrame>
  )
}
export default memo(PromptNode)
