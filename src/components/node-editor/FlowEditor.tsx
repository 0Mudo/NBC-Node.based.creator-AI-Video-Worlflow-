import { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import ReactFlow, { Background, Controls, MiniMap, ReactFlowProvider, useReactFlow, useOnSelectionChange, useViewport, type Node, type Edge } from 'reactflow'
import 'reactflow/dist/style.css'
import { useFlowStore } from '@/store/useFlowStore'
import { useProjectStore } from '@/store/useProjectStore'
import { nodeTypes, nodeTypeColors } from '@/nodes'
import type { NbcFile } from '@/types/project'
import type { Asset } from '@/types/asset'
import type { AppNode, NodeGroup } from '@/types/flow'
import { Zap, Upload, Download, Trash2, FolderOpen, Copy, ClipboardPaste, Group, X, Play } from 'lucide-react'
import { executeAll, executeNodes } from '@/store/useExecutionEngine'

let nodeId = 0
function getId(): string { return `node_${++nodeId}_${Date.now()}` }

const GROUP_PADDING = 28
const GROUP_HEADER_HEIGHT = 24

function GroupOverlay() {
  const groups = useFlowStore((s) => s.groups)
  const nodes = useFlowStore((s) => s.nodes)
  const removeGroup = useFlowStore((s) => s.removeGroup)
  const viewport = useViewport()

  const groupBounds = useMemo(() => {
    return groups.map(group => {
      const groupNodes = group.nodeIds
        .map(id => nodes.find(n => n.id === id))
        .filter(Boolean) as AppNode[]

      if (groupNodes.length === 0) return null

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const node of groupNodes) {
        const w = (node.data?.nodeWidth as number) || (node.style?.width as number) || 220
        const h = (node.data?.nodeHeight as number) || (node.style?.height as number) || 140
        minX = Math.min(minX, node.position.x)
        minY = Math.min(minY, node.position.y)
        maxX = Math.max(maxX, node.position.x + w)
        maxY = Math.max(maxY, node.position.y + h)
      }

      return {
        group,
        minX: minX - GROUP_PADDING,
        minY: minY - GROUP_PADDING - GROUP_HEADER_HEIGHT,
        maxX: maxX + GROUP_PADDING,
        maxY: maxY + GROUP_PADDING,
      }
    }).filter(Boolean) as { group: NodeGroup; minX: number; minY: number; maxX: number; maxY: number }[]
  }, [groups, nodes])

  if (groupBounds.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-20" style={{ overflow: 'visible' }}>
      {groupBounds.map(({ group, minX, minY, maxX, maxY }) => {
        const screenX = minX * viewport.zoom + viewport.x
        const screenY = minY * viewport.zoom + viewport.y
        const screenW = (maxX - minX) * viewport.zoom
        const screenH = (maxY - minY) * viewport.zoom
        const headerH = GROUP_HEADER_HEIGHT * viewport.zoom

        return (
          <div
            key={group.id}
            className="absolute pointer-events-none"
            style={{
              left: screenX,
              top: screenY,
              width: screenW,
              height: screenH,
            }}
          >
            <div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                border: `2px dashed ${group.color}55`,
                backgroundColor: `${group.color}08`,
                boxShadow: `0 0 30px ${group.color}10`,
              }}
            />
            <div
              className="absolute top-0 left-0 right-0 flex items-center gap-1.5 pointer-events-auto"
              style={{
                height: headerH,
                paddingLeft: 12 * viewport.zoom,
                paddingRight: 6 * viewport.zoom,
                background: `linear-gradient(135deg, ${group.color}22, ${group.color}0D)`,
                borderBottom: `1px solid ${group.color}33`,
                borderRadius: '12px 12px 0 0',
                fontSize: 11 * viewport.zoom,
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: group.color, width: 8 * viewport.zoom, height: 8 * viewport.zoom }}
              />
              <span
                className="font-medium truncate flex-1"
                style={{ color: group.color }}
              >
                {group.name}
              </span>
              <span
                className="opacity-50 flex-shrink-0"
                style={{ color: group.color, fontSize: 9 * viewport.zoom }}
              >
                ({group.nodeIds.length})
              </span>
              <button
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md flex-shrink-0 transition-colors"
                style={{
                  backgroundColor: `${group.color}22`,
                  color: group.color,
                  fontSize: 10 * viewport.zoom,
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  executeNodes(group.nodeIds)
                }}
                title={`运行组「${group.name}」`}
              >
                <Play size={10 * viewport.zoom} />
                运行
              </button>
              <button
                className="flex-shrink-0 rounded-full p-0.5 transition-colors"
                style={{ color: group.color, opacity: 0.7, fontSize: 10 * viewport.zoom }}
                onClick={(e) => {
                  e.stopPropagation()
                  removeGroup(group.id)
                }}
                title="解散组"
              >
                <X size={10 * viewport.zoom} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FlowEditorInner() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, selectNode, selectedNodeId, removeNode, removeNodes,
    exportToFile, importFromFile, setViewportCenter, copySelectedNodes, pasteNodes,
    groups, addGroup, removeGroup, clipboardNodes } = useFlowStore()
  const { getActiveProject, dirty, lastSavedAt } = useProjectStore()
  const { screenToFlowPosition, deleteElements } = useReactFlow()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedNodes, setSelectedNodes] = useState<Node[]>([])
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([])
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null)
  const [pendingGroupNodeIds, setPendingGroupNodeIds] = useState<Set<string>>(new Set())

  useOnSelectionChange({
    onChange: ({ nodes, edges }) => {
      setSelectedNodes(nodes)
      setSelectedEdges(edges)
      if (nodes.length > 0) selectNode(nodes[0].id)
      else selectNode(null)
    }
  })

  const activeProject = getActiveProject()

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
  }, [])
  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const reactflowDataStr = event.dataTransfer.getData('application/reactflow')
    console.log('onDrop! reactflowDataStr:', reactflowDataStr)
    if (reactflowDataStr) {
      try {
        const parsedData = JSON.parse(reactflowDataStr)
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
        const type = parsedData.type
        console.log('Parsed type:', type, 'parsedData:', parsedData)

        // handle character-card, scene-card, item-card drops from asset browser text cards
        if (['character-card', 'scene-card', 'item-card'].includes(type)) {
          const id = getId()
          const newNode: any = {
            id,
            type: type === 'character-card' ? 'characterCard' : type === 'scene-card' ? 'sceneCard' : 'itemCard',
            position,
            data: {
              // map generic text cards to specific node data
              characterId: 'custom',
              name: parsedData.name || '新建卡片',
              appearance: parsedData.prompt || '',
              description: parsedData.prompt || '',
              weapons: '',
              role: '',
              tags: [],
              refImage: '',
              _nodeId: id
            }
          }
          addNode(newNode)
          return
        }

        // fallback to application/asset if reactflow payload missing or if we want to create an asset input node
        if (type === 'asset' || !type) {
          const asset: Asset = parsedData.url ? { name: parsedData.name, path: parsedData.url, id: parsedData.url } as Asset : parsedData as Asset
          const id = getId()
          console.log('Adding asset input node:', asset)
          addNode({
            id,
            type: 'assetInput',
            position,
            data: {
              label: asset.name || '素材',
              assetId: asset.id,
              _nodeId: id,
              nodeWidth: 220,
              nodeHeight: 160,
            }
          } as any)
          return
        }

        // regular node drop
        const newNode: any = {
          id: getId(),
          type: type as any,
          position,
          data: { label: `${type} node` }
        }
        addNode(newNode)
        return
      } catch(e) {
        console.error('reactflowDataStr parse error:', e)
      }
    }

    // fallback to application/asset if reactflow payload missing
    const dataStr = event.dataTransfer.getData('application/asset')
    console.log('Fallback dataStr:', dataStr)
    if (!dataStr) return
    try {
      const parsedData = JSON.parse(dataStr)
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      
      const asset: Asset = parsedData
      const id = getId()
      addNode({
        id,
        type: 'assetInput',
        position,
        data: {
          label: asset.name,
          assetId: asset.id,
          _nodeId: id,
          nodeWidth: 220,
          nodeHeight: 160,
        }
      } as any)
    } catch (e) { console.warn('Drop parse error:', e) }
  }, [addNode, screenToFlowPosition])

  const handleSaveToFile = async () => {
    const fileData = exportToFile()
    const json = JSON.stringify(fileData, null, 2)
    if (window.electronAPI) {
      const result = await window.electronAPI.saveToFile(json, activeProject?.name || 'workflow')
      if (result.success) {
        console.log('Saved to:', result.filePath)
      }
    } else {
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeProject?.name || 'workflow'}.nbc.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleLoadFromFile = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.loadFromFile()
      if (result.data) {
        try {
          const file: NbcFile = JSON.parse(result.data)
          importFromFile(file)
        } catch { alert('无效的工作流文件') }
      }
    } else {
      fileInputRef.current?.click()
    }
  }

  const onFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed: NbcFile = JSON.parse(reader.result as string)
        importFromFile(parsed)
      } catch { alert('无效的工作流文件') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const onMoveEnd = useCallback((_event: any, viewport: { x: number; y: number; zoom: number }) => {
    setViewportCenter({ x: -viewport.x / viewport.zoom + 500, y: -viewport.y / viewport.zoom + 300 })
  }, [setViewportCenter])

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault()
    setCtxMenu({ x: event.clientX, y: event.clientY, nodeId: node.id })
  }, [])

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (_event.ctrlKey || _event.metaKey) {
      _event.preventDefault()
      setPendingGroupNodeIds(prev => {
        const next = new Set(prev)
        if (next.has(node.id)) {
          next.delete(node.id)
        } else {
          next.add(node.id)
        }
        return next
      })
    }
  }, [])

  const onPaneClick = useCallback(() => {
    setCtxMenu(null)
    setPendingGroupNodeIds(new Set())
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault()
          const nodeIds = selectedNodes.map(n => n.id)
          if (nodeIds.length > 0) {
            copySelectedNodes(nodeIds)
          }
        } else if (e.key === 'v' || e.key === 'V') {
          e.preventDefault()
          const center = useFlowStore.getState().viewportCenter
          pasteNodes({ x: center.x, y: center.y })
        } else if (e.key === 'g' || e.key === 'G') {
          e.preventDefault()
          if (pendingGroupNodeIds.size >= 2) {
            const ids = Array.from(pendingGroupNodeIds)
            addGroup(`节点组 ${groups.length + 1}`, ids)
            setPendingGroupNodeIds(new Set())
          } else if (selectedNodes.length >= 2) {
            addGroup(`节点组 ${groups.length + 1}`, selectedNodes.map(n => n.id))
          }
        }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodes.length > 0) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
        e.preventDefault()
        const nodeIds = selectedNodes.map(n => n.id)
        removeNodes(nodeIds)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodes, pendingGroupNodeIds, groups, copySelectedNodes, pasteNodes, addGroup, removeNodes])

  const handleCtxCopy = useCallback(() => {
    if (ctxMenu) {
      copySelectedNodes([ctxMenu.nodeId])
      setCtxMenu(null)
    }
  }, [ctxMenu, copySelectedNodes])

  const handleCtxPaste = useCallback(() => {
    const center = useFlowStore.getState().viewportCenter
    const pos = screenToFlowPosition({ x: ctxMenu?.x || 500, y: ctxMenu?.y || 300 })
    pasteNodes(pos)
    setCtxMenu(null)
  }, [ctxMenu, pasteNodes, screenToFlowPosition])

  const handleCtxDelete = useCallback(() => {
    if (ctxMenu) {
      removeNodes([ctxMenu.nodeId])
      setCtxMenu(null)
    }
  }, [ctxMenu, removeNodes])

  const handleCtxAddToGroup = useCallback(() => {
    if (ctxMenu) {
      setPendingGroupNodeIds(prev => {
        const next = new Set(prev)
        next.add(ctxMenu.nodeId)
        return next
      })
      setCtxMenu(null)
    }
  }, [ctxMenu])

  const handleExecuteGroup = useCallback((groupNodeIds: string[]) => {
    executeNodes(groupNodeIds)
  }, [])

  const nodeIdsInGroups = new Set(groups.flatMap(g => g.nodeIds))

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-none flex items-center justify-between toolbar-glass px-3 py-2 z-10">
        <div className="flex items-center gap-2">
          {activeProject && (
            <div className="flex items-center gap-2 mr-2 px-2.5 py-1 rounded-md bg-node-border/10 border border-node-border/20">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dirty ? 'bg-warning animate-breathe' : 'bg-success'}`} />
                <span className="text-xs font-semibold text-text-primary">{activeProject.name}</span>
              </div>
              {lastSavedAt && (
                <span className="text-[10px] text-text-tertiary hidden sm:inline">
                  · {new Date(lastSavedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="btn-group">
            <button className="btn btn-ghost btn-icon text-xs flex items-center gap-1.5" onClick={() => useProjectStore.getState().saveCurrentData(nodes, edges, groups)} title="保存项目">
              <Upload size={13} />
            </button>
            <button className="btn btn-ghost btn-icon text-xs flex items-center gap-1.5" onClick={handleSaveToFile} title="导出工作流文件">
              <Download size={13} />
            </button>
            <button className="btn btn-ghost btn-icon text-xs flex items-center gap-1.5" onClick={handleLoadFromFile} title="导入工作流文件">
              <FolderOpen size={13} />
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept=".json,.nbc.json" className="hidden" onChange={onFileImport} />
          <div className="w-px h-5 bg-node-border/30 mx-0.5" />
          <button className="btn btn-accent text-xs flex items-center gap-1.5 px-3 shadow-md shadow-accent/20 hover:shadow-lg hover:shadow-accent/30 transition-all" onClick={() => { if (confirm('确定运行所有生成节点？')) executeAll() }}>
            <Zap size={13} className="animate-breathe" /> 全部运行
          </button>
          <div className="w-px h-5 bg-node-border/30 mx-0.5" />
          <button className="btn btn-ghost text-xs flex items-center gap-1.5 text-text-secondary hover:text-danger transition-colors" onClick={() => { if (confirm('确定清空所有节点？此操作不可撤销。')) { useFlowStore.getState().setNodes([]); useFlowStore.getState().setEdges([]); } }}>
            <Trash2 size={13} /> 清空
          </button>
          {(selectedNodes.length > 0 || selectedEdges.length > 0) && (
            <button className="btn btn-ghost text-xs flex items-center gap-1.5 text-danger hover:text-danger transition-colors" onClick={() => deleteElements({ nodes: selectedNodes, edges: selectedEdges })}>
              <Trash2 size={13} /> 删除选中
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <GroupOverlay />
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
          onDragOver={onDragOver} onDrop={onDrop}
          onMoveEnd={onMoveEnd}
          onNodeContextMenu={onNodeContextMenu}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes} fitView className="bg-bg-primary"
          style={{ width: '100%', height: '100%' }}
          deleteKeyCode={null}>
          <Background color="#3a3a5c" gap={20} size={1} />
          <Controls className="!bg-bg-secondary !border-node-border" />
          <MiniMap className="!bg-bg-secondary !border-node-border"
            nodeColor={(n) => nodeTypeColors[n.type as keyof typeof nodeTypeColors] || '#3a3a5c'} />
        </ReactFlow>

        {ctxMenu && (
          <div
            className="fixed z-50 bg-bg-secondary border border-node-border rounded-lg shadow-xl py-1 min-w-[160px]"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-primary hover:bg-node-border/30 transition-colors"
              onClick={handleCtxCopy}
            >
              <Copy size={12} /> 复制
            </button>
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-primary hover:bg-node-border/30 transition-colors"
              onClick={handleCtxPaste}
            >
              <ClipboardPaste size={12} /> 粘贴
            </button>
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-primary hover:bg-node-border/30 transition-colors"
              onClick={handleCtxAddToGroup}
            >
              <Group size={12} /> 加入组选择
            </button>
            <div className="border-t border-node-border/30 my-1" />
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-danger hover:bg-danger/10 transition-colors"
              onClick={handleCtxDelete}
            >
              <Trash2 size={12} /> 删除
            </button>
          </div>
        )}

        {pendingGroupNodeIds.size > 0 && (
          <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2 bg-accent/90 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
            <Group size={12} />
            <span>已选 {pendingGroupNodeIds.size} 个节点</span>
            <button
              className="ml-1 px-2 py-0.5 bg-white/20 rounded hover:bg-white/30 transition-colors"
              onClick={() => {
                const ids = Array.from(pendingGroupNodeIds)
                addGroup(`节点组 ${groups.length + 1}`, ids)
                setPendingGroupNodeIds(new Set())
              }}
            >
              建组
            </button>
            <button
              className="px-2 py-0.5 bg-white/10 rounded hover:bg-white/20 transition-colors"
              onClick={() => setPendingGroupNodeIds(new Set())}
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {groups.length > 0 && (
        <div className="flex-none flex items-center gap-1.5 px-3 py-1.5 border-t border-node-border/20 bg-bg-secondary/50 overflow-x-auto">
          <span className="text-[10px] text-text-tertiary mr-1 whitespace-nowrap">节点组:</span>
          {groups.map(group => (
            <div
              key={group.id}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity"
              style={{ backgroundColor: group.color + '22', border: `1px solid ${group.color}44`, color: group.color }}
              title={`双击运行组「${group.name}」(${group.nodeIds.length} 个节点)`}
              onDoubleClick={() => handleExecuteGroup(group.nodeIds)}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
              <span>{group.name}</span>
              <span className="opacity-50">({group.nodeIds.length})</span>
              <button
                className="ml-1 hover:bg-white/10 rounded-full p-0.5"
                onClick={(e) => { e.stopPropagation(); removeGroup(group.id) }}
                title="解散组"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FlowEditor() { return <ReactFlowProvider><FlowEditorInner /></ReactFlowProvider> }
