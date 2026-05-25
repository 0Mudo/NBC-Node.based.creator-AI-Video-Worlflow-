import type { AppNode } from '@/types/flow'
import type { GenerationType } from '@/types/generation'
import { useFlowStore } from '@/store/useFlowStore'
import { useProjectStore } from '@/store/useProjectStore'
import { collectPrompt, collectImageRefs, collectNegativePrompt, collectConsistencySeed } from '@/engine/promptResolver'
import { generatorRegistry } from '@/engine/generatorRegistry'

export interface ExecutionContext {
  nodeId: string
  type: GenerationType
  mediaType: 'image' | 'video'
  label: string
  nodeLabel: string
  prompt: string
  imageRefs: string[]
  negativePrompt: string
  consistencySeed: number | undefined
  batchCount: number
  timelineRowId?: string
  timelineMediaType?: 'image' | 'video'
  projectId: string | null
  genParams: Record<string, unknown>
}

export function createExecutionContext(nodeId: string): ExecutionContext | null {
  const { nodes, edges } = useFlowStore.getState()
  const node = nodes.find(n => n.id === nodeId)
  if (!node) return null

  const type = node.type as GenerationType
  const adapter = generatorRegistry.get(type)
  if (!adapter) return null

  const prompt = collectPrompt(nodeId, nodes, edges)
  const imageRefs = collectImageRefs(
    nodeId,
    nodes,
    edges,
    type === 'seedance' ? ['characterCard'] : undefined,
  )
  const negativePrompt = collectNegativePrompt(nodeId, nodes, edges)
  const consistencySeed = collectConsistencySeed(nodeId, nodes, edges)
  const nodeLabel = (node.data.label as string) || type
  const batchCount = (node.data.batchCount as number) || 1

  const genParams = adapter.buildParams(node)
  genParams['prompt'] = prompt?.slice(0, 200) || ''

  return {
    nodeId,
    type,
    mediaType: adapter.mediaType,
    label: adapter.label,
    nodeLabel,
    prompt,
    imageRefs,
    negativePrompt,
    consistencySeed,
    batchCount,
    timelineRowId: node.data.timelineRowId as string | undefined,
    timelineMediaType: node.data.timelineMediaType as 'image' | 'video' | undefined,
    projectId: useProjectStore.getState().activeProjectId,
    genParams,
  }
}
