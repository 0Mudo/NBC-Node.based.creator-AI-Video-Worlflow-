import { create } from 'zustand'
import type { Workflow } from '@/types/workflow'
import type { AppNode, AppEdge } from '@/types/flow'

const STORAGE_KEY = 'nbc_workflows'

function loadWorkflows(): Workflow[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveWorkflows(workflows: Workflow[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows)) } catch {}
}

interface WorkflowStore {
  workflows: Workflow[]
  activeWorkflowId: string | null

  saveWorkflow: (name: string, nodes: AppNode[], edges: AppEdge[], description?: string) => string
  updateWorkflow: (id: string, nodes: AppNode[], edges: AppEdge[]) => void
  deleteWorkflow: (id: string) => void
  renameWorkflow: (id: string, newName: string) => void
  loadWorkflow: (id: string) => Workflow | null
  setActiveWorkflow: (id: string | null) => void
  getActiveWorkflow: () => Workflow | null
  importWorkflow: (workflow: Workflow) => string
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  workflows: loadWorkflows(),
  activeWorkflowId: null,

  saveWorkflow: (name, nodes, edges, description) => {
    const id = 'wf_' + Date.now()
    const now = new Date().toISOString()
    const workflow: Workflow = { id, name, description, nodes, edges, createdAt: now, updatedAt: now, nodeCount: nodes.length }
    const workflows = [...get().workflows, workflow]
    set({ workflows, activeWorkflowId: id })
    saveWorkflows(workflows)
    return id
  },

  updateWorkflow: (id, nodes, edges) => {
    const workflows = get().workflows.map((w) =>
      w.id === id ? { ...w, nodes, edges, nodeCount: nodes.length, updatedAt: new Date().toISOString() } : w
    )
    set({ workflows })
    saveWorkflows(workflows)
  },

  deleteWorkflow: (id) => {
    const workflows = get().workflows.filter((w) => w.id !== id)
    const activeWorkflowId = get().activeWorkflowId === id ? null : get().activeWorkflowId
    set({ workflows, activeWorkflowId })
    saveWorkflows(workflows)
  },

  renameWorkflow: (id, newName) => {
    const workflows = get().workflows.map((w) =>
      w.id === id ? { ...w, name: newName, updatedAt: new Date().toISOString() } : w
    )
    set({ workflows })
    saveWorkflows(workflows)
  },

  loadWorkflow: (id) => {
    const workflow = get().workflows.find((w) => w.id === id) || null
    if (workflow) set({ activeWorkflowId: id })
    return workflow
  },

  setActiveWorkflow: (id) => set({ activeWorkflowId: id }),

  getActiveWorkflow: () => {
    const { workflows, activeWorkflowId } = get()
    return workflows.find((w) => w.id === activeWorkflowId) || null
  },

  importWorkflow: (workflow) => {
    const id = 'wf_' + Date.now()
    const now = new Date().toISOString()
    const imported: Workflow = { ...workflow, id, createdAt: now, updatedAt: now }
    const workflows = [...get().workflows, imported]
    set({ workflows, activeWorkflowId: id })
    saveWorkflows(workflows)
    return id
  },
}))
