import { create } from 'zustand'
import {
  type Connection, addEdge, applyNodeChanges, applyEdgeChanges,
  type OnNodesChange, type OnEdgesChange, type OnConnect,
} from 'reactflow'
import type { AppNode, AppEdge } from '@/types/flow'
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
    useProjectStore.getState().saveCurrentData(nodes, edges)
  }, AUTO_SAVE_DEBOUNCE)
}

interface FlowStore {
  nodes: AppNode[]
  edges: AppEdge[]
  selectedNodeId: string | null

  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  addNode: (node: AppNode) => void
  removeNode: (id: string) => void
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

  onNodesChange: (changes) => {
    const nodes = applyNodeChanges(changes, get().nodes) as AppNode[]
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
    const nodes = [...get().nodes, node]
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
  updateNodeData: (id, data) => {
    const nodes = get().nodes.map((n) => n.id === id ? { ...n, data: { ...n.data, ...data } } : n)
    set({ nodes })
    debouncedAutoSave(nodes, get().edges)
  },
  selectNode: (id) => set({ selectedNodeId: id }),
  setNodes: (nodes) => {
    set({ nodes })
    debouncedAutoSave(nodes, get().edges)
  },
  setEdges: (edges) => {
    set({ edges })
    debouncedAutoSave(get().nodes, edges)
  },

  loadFromProject: (nodes, edges) => {
    set({ nodes, edges, selectedNodeId: null })
  },

  newBlank: () => {
    set({ nodes: [], edges: [], selectedNodeId: null })
  },

  exportToFile: () => {
    const { nodes, edges } = get()
    const project = useProjectStore.getState().getActiveProject()
    const now = new Date().toISOString()
    const pId = project?.id
    
    // Save timeline slots with workflow export
    let timelineData = null
    let inspirationData = null
    if (pId) {
      try {
        const raw = localStorage.getItem(`nbc_timeline_${pId}`)
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
        timeline: timelineData,
        inspiration: inspirationData
      },
    }
  },

  importFromFile: (file) => {
    set({ nodes: file.nodes || [], edges: file.edges || [], selectedNodeId: null })
    
    const pId = useProjectStore.getState().activeProjectId
    if (pId) {
      // Import timeline data if it exists in the metadata
      if (file.metadata?.timeline) {
        try {
          localStorage.setItem(`nbc_timeline_${pId}`, JSON.stringify(file.metadata.timeline))
          window.dispatchEvent(new Event('timeline-imported'))
        } catch {}
      }
      
      // Import inspiration data if it exists in the metadata
      if (file.metadata?.inspiration) {
        try {
          // Extract source project ID from the key prefix in activeItemIds
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
