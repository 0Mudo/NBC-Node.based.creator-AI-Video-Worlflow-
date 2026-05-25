import type { AppNode, AppEdge, NodeGroup } from './flow'

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
  groups?: NodeGroup[]
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
    groups?: NodeGroup[]
    timeline?: {
      slots: any[]
      clips: any[]
    }
    inspiration?: any
  }
}
