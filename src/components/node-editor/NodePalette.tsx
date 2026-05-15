import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import type { NodeType } from '@/types/flow'
import { nodeTypeLabels, nodeTypeColors } from '@/nodes'
import { useFlowStore } from '@/store/useFlowStore'

let nodeId = 0
function getId(): string { return `node_${++nodeId}_${Date.now()}` }

interface NodePaletteProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

const nodeCategories = [
  { label: '卡片', types: ['characterCard', 'sceneCard', 'itemCard'] as NodeType[] },
  { label: '文字', types: ['script', 'prompt'] as NodeType[] },
  { label: '生成', types: ['gptImage2', 'banana', 'seedance', 'comfyUI'] as NodeType[] },
  { label: '输出', types: ['output'] as NodeType[] },
]

export default function NodePalette({ collapsed: externalCollapsed, onToggleCollapse }: NodePaletteProps) {
  const [catCollapsed, setCatCollapsed] = useState<Record<string, boolean>>({})
  const addNode = useFlowStore((s) => s.addNode)
  const collapsed = externalCollapsed ?? false

  const handleAdd = (type: NodeType) => {
    const id = getId()
    const labelMap: Record<string, string> = { assetInput: '素材输入', characterCard: '角色卡', sceneCard: '场景卡', itemCard: '物品卡', script: '剧本/分镜', prompt: '提示词', gptImage2: 'GPT图像生成', banana: 'Banana图像生成', seedance: 'Seedance视频生成', comfyUI: 'ComfyUI', output: '输出' }
    addNode({ id, type, position: { x: 250 + Math.random() * 200, y: 150 + Math.random() * 300 }, data: { label: labelMap[type] || type, _nodeId: id } })
  }

  if (collapsed) return null

  return (
    <div className="flex flex-col">
      <div className="text-[10px] text-text-secondary px-2 py-1.5 font-semibold uppercase tracking-wider border-b border-node-border flex items-center justify-between">
        节点面板
        {onToggleCollapse && (
          <button className="btn btn-ghost p-0.5" onClick={onToggleCollapse}><ChevronUp size={10} /></button>
        )}
      </div>
      <div className="overflow-y-auto flex-1 p-1.5">
        {nodeCategories.map((cat) => (
          <div key={cat.label} className="mb-0.5">
            <button
              className="flex items-center justify-between w-full text-[11px] text-text-secondary px-1 py-0.5 hover:bg-node-border rounded"
              onClick={() => setCatCollapsed((prev) => ({ ...prev, [cat.label]: !prev[cat.label] }))}
            >
              <span>{cat.label}</span>
              {catCollapsed[cat.label] ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
            </button>
            {!catCollapsed[cat.label] && (
              <div className="space-y-0.5 mt-0.5">
                {cat.types.map((type) => (
                  <button key={type}
                    className="flex items-center gap-2 w-full text-left px-2 py-1 rounded text-xs hover:bg-node-border transition-colors"
                    onClick={() => handleAdd(type)}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: nodeTypeColors[type] }} />
                    <span className="truncate">{nodeTypeLabels[type]}</span>
                    <Plus size={10} className="ml-auto text-text-secondary" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
