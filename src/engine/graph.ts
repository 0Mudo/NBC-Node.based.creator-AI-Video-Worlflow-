import type { AppNode, AppEdge } from '@/types/flow'

export function findUpstream(
  nodeId: string,
  nodes: AppNode[],
  edges: AppEdge[],
  visited = new Set<string>()
): AppNode[] {
  if (visited.has(nodeId)) return []
  visited.add(nodeId)
  const upstream: AppNode[] = []
  const incoming = edges.filter((e) => e.target === nodeId && !visited.has(e.source))
  for (const e of incoming) {
    const node = nodes.find((n) => n.id === e.source)
    if (node) { upstream.push(node); upstream.push(...findUpstream(node.id, nodes, edges, visited)) }
  }
  return upstream
}

export function topoSort(nodes: AppNode[], edges: AppEdge[]): string[] {
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()
  
  for (const node of nodes) {
    inDegree.set(node.id, 0)
    adjacency.set(node.id, [])
  }
  
  for (const edge of edges) {
    const targets = adjacency.get(edge.source) || []
    targets.push(edge.target)
    adjacency.set(edge.source, targets)
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
  }
  
  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }
  
  const sorted: string[] = []
  while (queue.length) {
    const current = queue.shift()!
    sorted.push(current)
    const neighbors = adjacency.get(current) || []
    for (const neighbor of neighbors) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1
      inDegree.set(neighbor, newDeg)
      if (newDeg === 0) queue.push(neighbor)
    }
  }
  
  return sorted
}
