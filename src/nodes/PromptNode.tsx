import { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { FileText, Loader2, RefreshCw, Sparkles, Check, X } from 'lucide-react'
import type { NodeData } from '@/types/flow'
import { useFlowStore } from '@/store/useFlowStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { optimizePrompt } from '@/api/promptOptimize'
import { AutoTextArea, NodeFrame } from './shared'

function PromptNode({ id, data, selected }: NodeProps<NodeData>) {
  const { nodes, edges, updateNodeData } = useFlowStore()
  const [optimizing, setOptimizing] = useState(false)
  const [optimized, setOptimized] = useState<string | null>(null)

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

    if (!parts.length) {
      useNotificationStore.getState().addNotification({
        type: 'warning',
        title: '无上游信息',
        message: '请先连入三卡、场次或分镜节点。',
      })
      return
    }

    updateNodeData(id, { promptText: parts.join('\n\n') })
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
    <NodeFrame nodeId={id} selected={selected} borderColor="#a29bfe" minWidth={260} minHeight={180}>
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
        <AutoTextArea
          value={(data.promptText as string) || ''}
          onChange={(value) => updateNodeData(id, { promptText: value })}
          placeholder="直接在节点内输入提示词..."
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
