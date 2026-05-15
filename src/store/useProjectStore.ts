import { create } from 'zustand'
import type { Project, ProjectData } from '@/types/project'
import type { AppNode, AppEdge } from '@/types/flow'
import { emitNBCEvent } from '@/utils/nbcEvents'

const PROJECTS_KEY = 'nbc_projects'
const ACTIVE_KEY = 'nbc_active_project'
const projectDataKey = (id: string) => `nbc_project_${id}`

function loadProjects(): Project[] {
  try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]') } catch { return [] }
}
function saveProjects(projects: Project[]) {
  try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects)) } catch {}
}
function loadActiveId(): string | null {
  try { return localStorage.getItem(ACTIVE_KEY) } catch { return null }
}
function saveActiveId(id: string | null) {
  try { if (id) localStorage.setItem(ACTIVE_KEY, id); else localStorage.removeItem(ACTIVE_KEY) } catch {}
}
function loadProjectData(id: string): ProjectData | null {
  try {
    const raw = localStorage.getItem(projectDataKey(id))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function saveProjectData(id: string, data: ProjectData) {
  try { localStorage.setItem(projectDataKey(id), JSON.stringify(data)) } catch {}
}
function removeProjectData(id: string) {
  try { localStorage.removeItem(projectDataKey(id)) } catch {}
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
    localStorage.setItem('nbc_project_autosave_interval', minutes.toString())
    set({ autoSaveInterval: minutes })
  }
}))
