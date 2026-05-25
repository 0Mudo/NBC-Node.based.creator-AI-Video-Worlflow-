import { create } from 'zustand'
import {
  type Connection, addEdge, applyNodeChanges, applyEdgeChanges,
  type OnNodesChange, type OnEdgesChange, type OnConnect,
} from 'reactflow'
import type { AppNode, AppEdge, NodeGroup } from '@/types/flow'
import type { NbcFile } from '@/types/project'
import { useProjectStore } from './useProjectStore'
import { emitNBCEvent } from '@/utils/nbcEvents'
import { useInspirationStore } from './useInspirationStore'

const APP_VERSION = '1.0.0'

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
const AUTO_SAVE_DEBOUNCE = 400

function debouncedAutoSave(nodes: AppNode[], edges: AppEdge[]) {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    const { groups } = useFlowStore.getState()
    useProjectStore.getState().saveCurrentData(nodes, edges, groups)
  }, AUTO_SAVE_DEBOUNCE)
}

function normalizeNode(node: AppNode): AppNode {
  const width = typeof node.data?.nodeWidth === 'number' ? node.data.nodeWidth : undefined
  const height = typeof node.data?.nodeHeight === 'number' ? node.data.nodeHeight : undefined
  if (!width && !height) return node
  return {
    ...node,
    style: {
      ...(node.style || {}),
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
    },
  }
}

function edgeKey(edge: Pick<AppEdge, 'source' | 'target' | 'sourceHandle' | 'targetHandle'>): string {
  return `${edge.source}:${edge.sourceHandle || ''}->${edge.target}:${edge.targetHandle || ''}`
}

function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const GROUP_COLORS = ['#ff6b6b', '#f9ca24', '#4ecdc4', '#a29bfe', '#fd79a8', '#6c5ce7', '#00cec9', '#e67e22']

interface FlowStore {
  nodes: AppNode[]
  edges: AppEdge[]
  selectedNodeId: string | null

  viewportCenter: { x: number; y: number }
  setViewportCenter: (center: { x: number; y: number }) => void

  clipboardNodes: AppNode[]
  clipboardEdges: AppEdge[]
  copySelectedNodes: (nodeIds: string[]) => void
  pasteNodes: (position: { x: number; y: number }) => void

  groups: NodeGroup[]
  addGroup: (name: string, nodeIds: string[]) => void
  removeGroup: (groupId: string) => void
  updateGroupName: (groupId: string, name: string) => void
  setGroups: (groups: NodeGroup[]) => void

  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  addNode: (node: AppNode) => void
  addEdges: (edges: AppEdge[]) => void
  removeNode: (id: string) => void
  removeNodes: (ids: string[]) => void
  updateNodeData: (id: string, data: Record<string, unknown>) => void
  selectNode: (id: string | null) => void
  setNodes: (nodes: AppNode[]) => void
  setEdges: (edges: AppEdge[]) => void
  loadFromProject: (nodes: AppNode[], edges: AppEdge[]) => void
  newBlank: () => void
  exportToFile: () => NbcFile
  importFromFile: (file: NbcFile) => void
}

export const useFlowStore = create<FlowStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,

  viewportCenter: { x: 250, y: 150 },
  setViewportCenter: (center) => set({ viewportCenter: center }),

  clipboardNodes: [],
  clipboardEdges: [],
  copySelectedNodes: (nodeIds) => {
    const { nodes, edges } = get()
    const selectedSet = new Set(nodeIds)
    const copiedNodes = nodes.filter(n => selectedSet.has(n.id))
    const copiedEdges = edges.filter(
      e => selectedSet.has(e.source) && selectedSet.has(e.target)
    )
    set({ clipboardNodes: copiedNodes, clipboardEdges: copiedEdges })
  },
  pasteNodes: (position) => {
    const { clipboardNodes, clipboardEdges, nodes: existingNodes, edges: existingEdges } = get()
    if (clipboardNodes.length === 0) return

    const idMap = new Map<string, string>()
    clipboardNodes.forEach(n => idMap.set(n.id, generateNodeId()))

    const minX = Math.min(...clipboardNodes.map(n => n.position.x))
    const minY = Math.min(...clipboardNodes.map(n => n.position.y))
    const offsetX = position.x - minX
    const offsetY = position.y - minY

    const newNodes: AppNode[] = clipboardNodes.map(n => ({
      ...JSON.parse(JSON.stringify(n)),
      id: idMap.get(n.id)!,
      position: { x: n.position.x + offsetX, y: n.position.y + offsetY },
      data: { ...n.data, _nodeId: idMap.get(n.id)! },
      selected: false,
    }))

    const newEdges: AppEdge[] = clipboardEdges.map(e => ({
      ...JSON.parse(JSON.stringify(e)),
      id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      source: idMap.get(e.source)!,
      target: idMap.get(e.target)!,
    }))

    const allNodes = [...existingNodes, ...newNodes]
    const allEdges = [...existingEdges, ...newEdges]
    set({ nodes: allNodes, edges: allEdges })
    debouncedAutoSave(allNodes, allEdges)
  },

  groups: [],
  addGroup: (name, nodeIds) => {
    const groups = [...get().groups]
    const colorIndex = groups.length % GROUP_COLORS.length
    const group: NodeGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      nodeIds,
      color: GROUP_COLORS[colorIndex],
    }
    set({ groups: [...groups, group] })
  },
  removeGroup: (groupId) => {
    set({ groups: get().groups.filter(g => g.id !== groupId) })
  },
  updateGroupName: (groupId, name) => {
    set({ groups: get().groups.map(g => g.id === groupId ? { ...g, name } : g) })
  },
  setGroups: (groups) => set({ groups }),

  onNodesChange: (changes) => {
    const nodes = (applyNodeChanges(changes, get().nodes) as AppNode[]).map(normalizeNode)
    set({ nodes })
    debouncedAutoSave(nodes, get().edges)
  },
  onEdgesChange: (changes) => {
    const edges = applyEdgeChanges(changes, get().edges) as AppEdge[]
    set({ edges })
    debouncedAutoSave(get().nodes, edges)
  },
  onConnect: (connection: Connection) => {
    const edges = addEdge(connection, get().edges) as AppEdge[]
    set({ edges })
    debouncedAutoSave(get().nodes, edges)
  },
  addNode: (node) => {
    const nodes = [...get().nodes, normalizeNode(node)]
    set({ nodes })
    debouncedAutoSave(nodes, get().edges)
    const pId = useProjectStore.getState().activeProjectId
    const nodeLabel = (node.data?.label as string) || node.type
    emitNBCEvent('workflow:node:add', pId || undefined, {
      summary: `添加了节点「${nodeLabel}」(${node.type})`,
      nodeType: node.type,
      nodeLabel,
    })
  },
  addEdges: (newEdges) => {
    const existing = get().edges
    const existingKeys = new Set(existing.map((edge) => edgeKey(edge)))
    const merged = [
      ...existing,
      ...newEdges.filter((edge) => !existingKeys.has(edgeKey(edge))),
    ]
    set({ edges: merged })
    debouncedAutoSave(get().nodes, merged)
  },
  removeNode: (id) => {
    const oldNode = get().nodes.find((n) => n.id === id)
    const nodes = get().nodes.filter((n) => n.id !== id)
    const edges = get().edges.filter((e) => e.source !== id && e.target !== id)
    set({ nodes, edges })
    debouncedAutoSave(nodes, edges)
    if (oldNode) {
      const pId = useProjectStore.getState().activeProjectId
      const nodeLabel = (oldNode.data?.label as string) || oldNode.type
      emitNBCEvent('workflow:node:remove', pId || undefined, {
        summary: `删除了节点「${nodeLabel}」(${oldNode.type})`,
        nodeType: oldNode.type,
        nodeLabel,
      })
    }
  },
  removeNodes: (ids) => {
    const idSet = new Set(ids)
    const nodes = get().nodes.filter((n) => !idSet.has(n.id))
    const edges = get().edges.filter((e) => !idSet.has(e.source) && !idSet.has(e.target))
    const groups = get().groups.map(g => ({
      ...g,
      nodeIds: g.nodeIds.filter(nid => !idSet.has(nid)),
    })).filter(g => g.nodeIds.length > 0)
    set({ nodes, edges, groups })
    debouncedAutoSave(nodes, edges)
  },
  updateNodeData: (id, data) => {
    const nodes = get().nodes.map((n) => n.id === id ? { ...n, data: { ...n.data, ...data } } : n)
    set({ nodes })
    debouncedAutoSave(nodes, get().edges)
  },
  selectNode: (id) => set({ selectedNodeId: id }),
  setNodes: (nodes) => {
    const normalized = nodes.map(normalizeNode)
    set({ nodes: normalized })
    debouncedAutoSave(normalized, get().edges)
  },
  setEdges: (edges) => {
    set({ edges })
    debouncedAutoSave(get().nodes, edges)
  },

  loadFromProject: (nodes, edges) => {
    const pId = useProjectStore.getState().activeProjectId
    let groups: NodeGroup[] = []
    if (pId) {
      const data = useProjectStore.getState().loadCurrentData()
      groups = data?.groups || []
    }
    set({ nodes: nodes.map(normalizeNode), edges, selectedNodeId: null, groups })
  },

  newBlank: () => {
    set({ nodes: [], edges: [], selectedNodeId: null, groups: [] })
  },

  exportToFile: () => {
    const { nodes, edges, groups } = get()
    const project = useProjectStore.getState().getActiveProject()
    const now = new Date().toISOString()
    const pId = project?.id
    
    let timelineData = null
    let inspirationData = null
    if (pId) {
      try {
        const raw = localStorage.getItem(`nbc_timeline_v2_${pId}`) || localStorage.getItem(`nbc_timeline_${pId}`)
        if (raw) timelineData = JSON.parse(raw)
      } catch {}
      
      try {
        inspirationData = useInspirationStore.getState().getProjectData(pId)
      } catch (e) {
        console.error('Failed to get inspiration data for export:', e)
      }
    }

    emitNBCEvent('workflow:export', pId, {
      summary: `导出了工作流「${project?.name || '未命名'}」（${nodes.length} 节点，${edges.length} 连线）`,
    })
    return {
      version: '1.0.0',
      projectName: project?.name || '未命名项目',
      nodes,
      edges,
      metadata: {
        createdAt: project?.createdAt || now,
        updatedAt: now,
        nodeCount: nodes.length,
        appVersion: APP_VERSION,
        groups,
        timeline: timelineData,
        inspiration: inspirationData
      },
    }
  },

  importFromFile: (file) => {
    set({ nodes: (file.nodes || []).map(normalizeNode), edges: file.edges || [], selectedNodeId: null, groups: file.metadata?.groups || [] })
    
    const pId = useProjectStore.getState().activeProjectId
    if (pId) {
      if (file.metadata?.timeline) {
        try {
          localStorage.setItem(`nbc_timeline_v2_${pId}`, JSON.stringify(file.metadata.timeline))
          window.dispatchEvent(new Event('timeline-imported'))
        } catch {}
      }
      
      if (file.metadata?.inspiration) {
        try {
          let srcPId = ''
          const itemIdKeys = Object.keys(file.metadata.inspiration.activeItemIds || {})
          if (itemIdKeys.length > 0) {
            const parts = itemIdKeys[0].split('_')
            if (parts.length >= 2) srcPId = parts.slice(0, -1).join('_')
          }
          useInspirationStore.getState().importProjectData(pId, file.metadata.inspiration, srcPId || undefined)
        } catch (e) {
          console.error('Failed to import inspiration data:', e)
        }
      }
    }
  },
}))
