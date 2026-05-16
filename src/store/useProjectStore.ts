import { create } from 'zustand'
import type { Project, ProjectData } from '@/types/project'
import type { AppNode, AppEdge } from '@/types/flow'
import { emitNBCEvent } from '@/utils/nbcEvents'
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/utils/safeStorage'

const PROJECTS_KEY = 'nbc_projects'
const ACTIVE_KEY = 'nbc_active_project'
const projectDataKey = (id: string) => `nbc_project_${id}`

function loadProjects(): Project[] {
  try { return JSON.parse(safeGetItem(PROJECTS_KEY) || '[]') } catch { return [] }
}
function saveProjects(projects: Project[]) {
  safeSetItem(PROJECTS_KEY, JSON.stringify(projects))
}
function loadActiveId(): string | null {
  return safeGetItem(ACTIVE_KEY)
}
function saveActiveId(id: string | null) {
  if (id) safeSetItem(ACTIVE_KEY, id); else safeRemoveItem(ACTIVE_KEY)
}
function loadProjectData(id: string): ProjectData | null {
  try {
    const raw = safeGetItem(projectDataKey(id))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function saveProjectData(id: string, data: ProjectData) {
  safeSetItem(projectDataKey(id), JSON.stringify(data))
}
function removeProjectData(id: string) {
  safeRemoveItem(projectDataKey(id))
}

interface ProjectStore {
  projects: Project[]
  activeProjectId: string | null
  dirty: boolean
  lastSavedAt: string | null
  autoSaveInterval: number

  createProject: (name: string) => string
  deleteProject: (id: string) => void
  renameProject: (id: string, newName: string) => void
  switchProject: (id: string) => ProjectData | null
  getActiveProject: () => Project | null
  markDirty: () => void
  markSaved: () => void
  saveCurrentData: (nodes: AppNode[], edges: AppEdge[]) => void
  loadCurrentData: () => ProjectData | null
  importProject: (name: string, nodes: AppNode[], edges: AppEdge[]) => string
  setAutoSaveInterval: (minutes: number) => void
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: loadProjects(),
  activeProjectId: loadActiveId(),
  dirty: false,
  lastSavedAt: null,
  autoSaveInterval: Number(localStorage.getItem('nbc_project_autosave_interval')) || 0,

  createProject: (name) => {
    const id = Date.now().toString()
    const now = new Date().toISOString()
    const project: Project = { id, name, createdAt: now, updatedAt: now, nodeCount: 0 }
    const projects = [...get().projects, project]
    set({ projects, activeProjectId: id, dirty: false })
    saveProjects(projects)
    saveActiveId(id)
    saveProjectData(id, { nodes: [], edges: [] })
    emitNBCEvent('project:create', id, { summary: `创建了项目「${name}」` })
    return id
  },

  deleteProject: (id) => {
    const { projects, activeProjectId } = get()
    if (id === activeProjectId) return
    const p = projects.find((p) => p.id === id)
    const updated = projects.filter((p) => p.id !== id)
    set({ projects: updated })
    saveProjects(updated)
    removeProjectData(id)
    emitNBCEvent('project:delete', id, { summary: `删除了项目「${p?.name || id}」` })
  },

  renameProject: (id, newName) => {
    const old = get().projects.find((p) => p.id === id)
    const projects = get().projects.map((p) => p.id === id ? { ...p, name: newName, updatedAt: new Date().toISOString() } : p)
    set({ projects })
    saveProjects(projects)
    if (old && old.name !== newName) {
      emitNBCEvent('project:rename', id, { summary: `项目「${old.name}」重命名为「${newName}」` })
    }
  },

  switchProject: (id) => {
    const project = get().projects.find((p) => p.id === id)
    if (!project) return null
    set({ activeProjectId: id, dirty: false, lastSavedAt: project.updatedAt })
    saveActiveId(id)
    return loadProjectData(id)
  },

  getActiveProject: () => {
    const { projects, activeProjectId } = get()
    return projects.find((p) => p.id === activeProjectId) || null
  },

  markDirty: () => set({ dirty: true }),
  markSaved: () => set({ dirty: false, lastSavedAt: new Date().toISOString() }),

  saveCurrentData: (nodes, edges) => {
    const { activeProjectId, projects } = get()
    if (!activeProjectId) return
    saveProjectData(activeProjectId, { nodes, edges })
    const updated = projects.map((p) => p.id === activeProjectId ? { ...p, nodeCount: nodes.length, updatedAt: new Date().toISOString() } : p)
    set({ projects: updated, dirty: false, lastSavedAt: new Date().toISOString() })
    saveProjects(updated)
  },

  loadCurrentData: () => {
    const { activeProjectId } = get()
    if (!activeProjectId) return null
    return loadProjectData(activeProjectId)
  },

  importProject: (name, nodes, edges) => {
    const id = Date.now().toString()
    const now = new Date().toISOString()
    const project: Project = { id, name, createdAt: now, updatedAt: now, nodeCount: nodes.length }
    const projects = [...get().projects, project]
    set({ projects, activeProjectId: id, dirty: false })
    saveProjects(projects)
    saveActiveId(id)
    saveProjectData(id, { nodes, edges })
    emitNBCEvent('project:import', id, { summary: `导入了项目「${name}」（${nodes.length} 个节点，${edges.length} 条连线）` })
    return id
  },

  setAutoSaveInterval: (minutes) => {
    safeSetItem('nbc_project_autosave_interval', minutes.toString())
    set({ autoSaveInterval: minutes })
  }
}))
