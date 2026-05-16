import { useState } from 'react'
import { Sparkles, Check, X, RefreshCw, Loader2 } from 'lucide-react'
import { optimizePrompt } from '@/api/promptOptimize'
import { useFlowStore } from '@/store/useFlowStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { AppNode } from '@/types/flow'

interface Props {
  node: AppNode
}

export default function PromptOptimizer({ node }: Props) {
  const { nodes, edges, updateNodeData } = useFlowStore()
  const [optimizing, setOptimizing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleOptimize = async () => {
    const promptText = node.data.promptText as string
    if (!promptText?.trim()) return

    setOptimizing(true)
    setResult(null)
    setError(null)

    const upstream = findUpstream(node.id, nodes, edges)

    let characterContext = ''
    let sceneContext = ''
    let itemContext = ''
    let scriptContext = ''

    for (const n of upstream) {
      if (n.type === 'characterCard') {
        const name = n.data.characterName || ''
        const appearance = n.data.characterAppearance || ''
        if (name || appearance) characterContext += `角色名：${name}\n外观：${appearance}\n\n`
      }
      if (n.type === 'sceneCard') {
        const name = n.data.sceneName || ''
        const desc = n.data.sceneDescription || ''
        if (name || desc) sceneContext += `场景名：${name}\n描述：${desc}\n\n`
      }
      if (n.type === 'itemCard') {
        const name = n.data.itemName || ''
        const desc = n.data.itemDescription || ''
        if (name || desc) itemContext += `物品名：${name}\n描述：${desc}\n\n`
      }
      if (n.type === 'script' && n.data.scriptText) {
        scriptContext += `${n.data.scriptText}\n\n`
      }
    }

    const res = await optimizePrompt({
      originalPrompt: promptText,
      characterContext: characterContext.trim() || undefined,
      sceneContext: sceneContext.trim() || undefined,
      itemContext: itemContext.trim() || undefined,
      scriptContext: scriptContext.trim() || undefined,
    })

    setOptimizing(false)

    if (res.error) {
      setError(res.error)
      useNotificationStore.getState().addNotification({
        type: 'error',
        title: '提示词优化失败',
        message: res.error,
      })
    } else {
      setResult(res.optimized)
    }
  }

  const handleAccept = () => {
    if (result) {
      updateNodeData(node.id, { promptText: result })
      setResult(null)
      useNotificationStore.getState().addNotification({
        type: 'success',
        title: '提示词已更新',
        message: 'AI优化后的提示词已应用',
      })
    }
  }

  const handleDismiss = () => {
    setResult(null)
    setError(null)
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1.5">
        <button
          className="btn btn-secondary disabled:opacity-50 text-[11px] flex items-center gap-1 flex-1"
          onClick={handleOptimize}
          disabled={optimizing || !(node.data.promptText as string)?.trim()}
        >
          {optimizing ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          {optimizing ? '优化中...' : 'AI 优化提示词'}
        </button>
      </div>

      {error && (
        <div className="text-[11px] text-danger bg-danger/10 rounded px-2 py-1.5">
          {error}
        </div>
      )}

      {result && (
        <div className="border border-accent/30 rounded-md p-2 space-y-2 bg-accent/5">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider">优化结果</div>
          <div className="text-xs leading-relaxed max-h-32 overflow-y-auto">{result}</div>
          <div className="flex gap-1.5">
            <button
              className="btn btn-accent text-[11px] flex items-center gap-1 flex-1"
              onClick={handleAccept}
            >
              <Check size={12} /> 采用
            </button>
            <button
              className="btn btn-secondary text-[11px] flex items-center gap-1"
              onClick={handleOptimize}
              disabled={optimizing}
            >
              <RefreshCw size={12} /> 再试
            </button>
            <button
              className="btn btn-ghost text-[11px] flex items-center gap-1"
              onClick={handleDismiss}
            >
              <X size={12} /> 放弃
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function findUpstream(
  nodeId: string,
  nodes: AppNode[],
  edges: Array<{ source: string; target: string }>,
  visited = new Set<string>()
): AppNode[] {
  if (visited.has(nodeId)) return []
  visited.add(nodeId)
  const upstream: AppNode[] = []
  const incoming = edges.filter((e) => e.target === nodeId && !visited.has(e.source))
  for (const e of incoming) {
    const node = nodes.find((n) => n.id === e.source)
    if (node) {
      upstream.push(node)
      upstream.push(...findUpstream(node.id, nodes, edges, visited))
    }
  }
  return upstream
}
