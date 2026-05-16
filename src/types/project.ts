import type { AppNode, AppEdge } from './flow'

export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  nodeCount: number
}

export interface ProjectData {
  nodes: AppNode[]
  edges: AppEdge[]
}

export interface NbcFile {
  version: string
  projectName: string
  nodes: any[]
  edges: any[]
  metadata?: {
    createdAt: string
    updatedAt: string
    nodeCount: number
    appVersion: string
    timeline?: {
      slots: any[]
      clips: any[]
    }
    inspiration?: any
  }
}
