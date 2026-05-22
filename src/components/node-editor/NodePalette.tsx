import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp, User, Map, Box, FileText, Film, MessageSquare, Image, Video, ImageIcon, Download, Search } from 'lucide-react'
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
  {
    label: '卡片',
    icon: <User size={13} />,
    types: [
      { type: 'characterCard' as NodeType, icon: <User size={12} /> },
      { type: 'sceneCard' as NodeType, icon: <Map size={12} /> },
      { type: 'itemCard' as NodeType, icon: <Box size={12} /> },
    ]
  },
  {
    label: '文字',
    icon: <FileText size={13} />,
    types: [
      { type: 'script' as NodeType, icon: <FileText size={12} /> },
      { type: 'storyboard' as NodeType, icon: <Film size={12} /> },
      { type: 'prompt' as NodeType, icon: <MessageSquare size={12} /> },
    ]
  },
  {
    label: '生成',
    icon: <Image size={13} />,
    types: [
      { type: 'gptImage2' as NodeType, icon: <Image size={12} /> },
      { type: 'banana' as NodeType, icon: <ImageIcon size={12} /> },
      { type: 'seedance' as NodeType, icon: <Video size={12} /> },
    ]
  },
  {
    label: '输出',
    icon: <Download size={13} />,
    types: [
      { type: 'output' as NodeType, icon: <Download size={12} /> },
    ]
  },
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
      <div className="flex items-center justify-between px-3 py-3 border-b border-node-border/25">
        <span className="text-[10px] tracking-widest font-semibold text-text-secondary uppercase">节点面板</span>
        {onToggleCollapse && (
          <button className="btn btn-ghost btn-icon !p-1" onClick={onToggleCollapse}>
            <ChevronUp size={12} />
          </button>
        )}
      </div>
      <div className="overflow-y-auto flex-1 p-2 space-y-0.5">
        {nodeCategories.map((cat) => (
          <div key={cat.label}>
            <button
              className="flex items-center gap-2 w-full text-[11px] font-medium text-text-secondary px-2.5 py-2 rounded-lg hover:bg-node-border/20 hover:text-text-primary transition-all duration-200 group"
              onClick={() => setCatCollapsed((prev) => ({ ...prev, [cat.label]: !prev[cat.label] }))}
            >
              <span className="text-text-tertiary group-hover:text-accent transition-colors">{cat.icon}</span>
              <span className="tracking-wide uppercase text-[10px] flex-1 text-left">{cat.label}</span>
              <span className="text-[9px] text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                {cat.types.length}
              </span>
              {catCollapsed[cat.label] ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
            </button>
            {!catCollapsed[cat.label] && (
              <div className="ml-2 pl-2 border-l border-node-border/20 my-0.5">
                {cat.types.map(({ type, icon }) => (
                  <button key={type}
                    className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-md text-xs text-text-primary hover:bg-node-border/15 transition-all duration-200 group/item"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('application/reactflow', JSON.stringify({ type }))
                      event.dataTransfer.effectAllowed = 'move'
                    }}
                    onClick={() => handleAdd(type)}
                  >
                    <span
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `${nodeTypeColors[type]}18`,
                        color: nodeTypeColors[type],
                      }}
                    >
                      {icon}
                    </span>
                    <span className="truncate flex-1 font-medium">{nodeTypeLabels[type]}</span>
                    <Plus size={10} className="text-text-tertiary opacity-0 group-hover/item:opacity-100 transition-all group-hover/item:translate-x-0.5" />
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
