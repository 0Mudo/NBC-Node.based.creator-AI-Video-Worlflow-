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
  { label: '文字', types: ['script', 'storyboard', 'prompt'] as NodeType[] },
  { label: '生成', types: ['gptImage2', 'banana', 'seedance'] as NodeType[] },
  { label: '输出', types: ['output'] as NodeType[] },
]

export default function NodePalette({ collapsed: externalCollapsed, onToggleCollapse }: NodePaletteProps) {
  const [catCollapsed, setCatCollapsed] = useState<Record<string, boolean>>({})
  const addNode = useFlowStore((s) => s.addNode)
  const collapsed = externalCollapsed ?? false

  const handleAdd = (type: NodeType) => {
    const id = getId()
    const labelMap: Record<string, string> = { assetInput: '素材输入', characterCard: '角色卡', sceneCard: '场景卡', itemCard: '物品卡', script: '剧本', storyboard: '分镜', prompt: '提示词', gptImage2: 'GPT图像生成', banana: 'Banana图像生成', seedance: 'Seedance视频生成', output: '输出' }
    const sizeMap: Partial<Record<NodeType, { width: number; height: number }>> = {
      assetInput: { width: 220, height: 160 },
      characterCard: { width: 220, height: 180 },
      sceneCard: { width: 220, height: 180 },
      itemCard: { width: 220, height: 180 },
      prompt: { width: 280, height: 220 },
      script: { width: 240, height: 180 },
      storyboard: { width: 240, height: 180 },
      gptImage2: { width: 240, height: 180 },
      banana: { width: 240, height: 180 },
      seedance: { width: 240, height: 180 },
      output: { width: 220, height: 140 },
    }
    const size = sizeMap[type]
    addNode({
      id,
      type,
      position: { x: 250 + Math.random() * 200, y: 150 + Math.random() * 300 },
      data: {
        label: labelMap[type] || type,
        _nodeId: id,
        nodeWidth: size?.width,
        nodeHeight: size?.height,
      }
    })
  }

  if (collapsed) return null

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-node-border/30 uppercase text-[10px] tracking-widest font-semibold text-text-secondary">
        <span>节点面板</span>
        {onToggleCollapse && (
          <button className="btn btn-ghost btn-icon !p-1" onClick={onToggleCollapse}>
            <ChevronUp size={12} />
          </button>
        )}
      </div>
      <div className="overflow-y-auto flex-1 p-2 space-y-1">
        {nodeCategories.map((cat) => (
          <div key={cat.label}>
            <button
              className="flex items-center justify-between w-full text-[11px] font-medium text-text-secondary px-2 py-1.5 rounded-md hover:bg-node-border/30 transition-all duration-200"
              onClick={() => setCatCollapsed((prev) => ({ ...prev, [cat.label]: !prev[cat.label] }))}
            >
              <span className="tracking-wide uppercase text-[10px]">{cat.label}</span>
              {catCollapsed[cat.label] ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
            </button>
            {!catCollapsed[cat.label] && (
              <div className="mt-0.5">
                {cat.types.map((type) => (
                  <button key={type}
                    className="flex items-center gap-2.5 w-full text-left px-2.5 py-1.5 rounded-md text-xs text-text-primary hover:bg-node-border/20 transition-all duration-200 group"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('application/reactflow', JSON.stringify({ type }))
                      event.dataTransfer.effectAllowed = 'move'
                    }}
                    onClick={() => handleAdd(type)}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm"
                      style={{ background: nodeTypeColors[type], boxShadow: `0 0 6px ${nodeTypeColors[type]}40` }}
                    />
                    <span className="truncate">{nodeTypeLabels[type]}</span>
                    <Plus size={10} className="ml-auto text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
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
