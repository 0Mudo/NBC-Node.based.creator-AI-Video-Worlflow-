import type { AppNode, AppEdge } from './flow'

export interface Workflow {
  id: string
  name: string
  description?: string
  nodes: AppNode[]
  edges: AppEdge[]
  createdAt: string
  updatedAt: string
  nodeCount: number
}
