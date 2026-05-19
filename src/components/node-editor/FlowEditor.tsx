import { useCallback, useRef, useState } from 'react'
import ReactFlow, { Background, Controls, MiniMap, ReactFlowProvider, useReactFlow, useOnSelectionChange, type Node, type Edge } from 'reactflow'
import 'reactflow/dist/style.css'
import { useFlowStore } from '@/store/useFlowStore'
import { useProjectStore } from '@/store/useProjectStore'
import { nodeTypes, nodeTypeColors } from '@/nodes'
import type { NbcFile } from '@/types/project'
import type { Asset } from '@/types/asset'
import { Zap, Upload, Download, Trash2, Circle } from 'lucide-react'
import { executeAll } from '@/store/useExecutionEngine'

let nodeId = 0
function getId(): string { return `node_${++nodeId}_${Date.now()}` }

function FlowEditorInner() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, selectNode, selectedNodeId, removeNode,
    exportToFile, importFromFile } = useFlowStore()
  const { getActiveProject, dirty, lastSavedAt } = useProjectStore()
  const { screenToFlowPosition, deleteElements } = useReactFlow()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedNodes, setSelectedNodes] = useState<Node[]>([])
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([])

  useOnSelectionChange({
    onChange: ({ nodes, edges }) => {
      setSelectedNodes(nodes)
      setSelectedEdges(edges)
      // Keep zustand selectedNodeId in sync for Inspector
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

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-none flex items-center justify-between bg-bg-secondary border-b border-node-border px-3 py-2 z-10">
        <div className="flex items-center gap-2">
          {activeProject && (
            <div className="flex items-center gap-1.5 mr-2">
              <Circle size={8} className={dirty ? 'text-warning' : 'text-success'} />
              <span className="text-xs font-semibold text-text-primary">{activeProject.name}</span>
              {lastSavedAt && (
                <span className="text-[10px] text-text-secondary ml-1 hidden sm:inline">
                  {new Date(lastSavedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary text-xs flex items-center gap-1" onClick={() => useProjectStore.getState().saveCurrentData(nodes, edges)} title="保存项目"><Upload size={12} /> 保存项目</button>
          <button className="btn btn-secondary text-xs flex items-center gap-1" onClick={handleSaveToFile} title="导出工作流文件"><Upload size={12} /> 导出文件</button>
          <button className="btn btn-secondary text-xs flex items-center gap-1" onClick={handleLoadFromFile} title="导入工作流文件"><Download size={12} /> 导入文件</button>
          <input ref={fileInputRef} type="file" accept=".json,.nbc.json" className="hidden" onChange={onFileImport} />
          <div className="w-px h-4 bg-node-border mx-1" />
          <button className="btn btn-accent text-xs flex items-center gap-1" onClick={() => { if (confirm('确定运行所有生成节点？')) executeAll() }}><Zap size={12} /> 全部运行</button>
          <button className="btn btn-ghost text-xs flex items-center gap-1 text-text-secondary hover:text-red-400" onClick={() => { if (confirm('确定清空所有节点？此操作不可撤销。')) { useFlowStore.getState().setNodes([]); useFlowStore.getState().setEdges([]); } }}><Trash2 size={12} /> 清空画布</button>
          {(selectedNodes.length > 0 || selectedEdges.length > 0) && (
            <>
              <div className="w-px h-4 bg-node-border mx-1" />
              <button className="btn btn-ghost text-xs flex items-center gap-1 text-danger hover:text-danger" onClick={() => deleteElements({ nodes: selectedNodes, edges: selectedEdges })}><Trash2 size={12} /> 删除</button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
          onDragOver={onDragOver} onDrop={onDrop}
          nodeTypes={nodeTypes} fitView className="bg-bg-primary"
          style={{ width: '100%', height: '100%' }}
          deleteKeyCode={['Backspace', 'Delete']}>
          <Background color="#3a3a5c" gap={20} size={1} />
          <Controls className="!bg-bg-secondary !border-node-border" />
          <MiniMap className="!bg-bg-secondary !border-node-border"
            nodeColor={(n) => nodeTypeColors[n.type as keyof typeof nodeTypeColors] || '#3a3a5c'} />
        </ReactFlow>
      </div>
    </div>
  )
}

export default function FlowEditor() { return <ReactFlowProvider><FlowEditorInner /></ReactFlowProvider> }
