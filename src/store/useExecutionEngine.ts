import { useFlowStore } from './useFlowStore'
import { useGenerationStore } from './useGenerationStore'
import { useNotificationStore } from './useNotificationStore'
import { useTimelineStore } from './useTimelineStore'
import { topoSort } from '@/engine/graph'
import type { GenerationTask } from '@/types/generation'
import { generatorRegistry } from '@/engine/generatorRegistry'
import { createExecutionContext } from '@/engine/executionContext'
import { onExecutionStart, onTaskFailed, onExecutionComplete, onExecutionFinish } from '@/engine/executionLifecycle'
import { commitResults } from '@/engine/resultPipeline'

let taskCounter = 0
function taskId(): string { return `gen_${++taskCounter}_${Date.now()}` }

export async function executeNode(nodeId: string) {
  const ctx = createExecutionContext(nodeId)
  if (!ctx) return

  const adapter = generatorRegistry.get(ctx.type)
  if (!adapter) return

  const { addTask, updateTask } = useGenerationStore.getState()
  const allTasks: GenerationTask[] = []

  for (let i = 0; i < ctx.batchCount; i++) {
    const task: GenerationTask = {
      id: taskId(),
      nodeId,
      type: ctx.type,
      status: 'running',
      progress: 0,
      startedAt: new Date().toISOString(),
      abortController: new AbortController(),
    }
    addTask(task)
    allTasks.push(task)
  }

  onExecutionStart(ctx, allTasks.map(t => t.id))

  const results = await Promise.allSettled(
    allTasks.map(async (task) => {
      try {
        if (task.abortController?.signal.aborted) throw new Error('AbortError')
        const url = await adapter.execute(
          useFlowStore.getState().nodes.find(n => n.id === nodeId)!,
          ctx.prompt,
          ctx.imageRefs,
          task.abortController?.signal,
        )
        updateTask(task.id, {
          status: 'completed',
          progress: 100,
          resultUrl: url,
          completedAt: new Date().toISOString(),
        })
        return url
      } catch (err: any) {
        if (err.message === 'AbortError') {
          updateTask(task.id, {
            status: 'failed',
            error: 'User cancelled',
            completedAt: new Date().toISOString(),
          })
          throw err
        }
        const errorMsg = err.message || String(err)
        updateTask(task.id, {
          status: 'failed',
          error: errorMsg,
          completedAt: new Date().toISOString(),
        })
        onTaskFailed(ctx, errorMsg)
        throw err
      }
    }),
  )

  const successfulUrls = results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => (r as PromiseFulfilledResult<string>).value)
  const failedCount = results.filter(r => r.status === 'rejected').length

  onExecutionComplete(ctx, successfulUrls, failedCount, allTasks.length)

  if (successfulUrls.length > 0) {
    await commitResults(ctx, successfulUrls)
  }

  onExecutionFinish()
}

export async function executeAll() {
  const { nodes } = useFlowStore.getState()
  const genTypes = new Set(generatorRegistry.types)
  const sorted = topoSort(nodes, useFlowStore.getState().edges)
  for (const nodeId of sorted) {
    const node = nodes.find(n => n.id === nodeId)
    if (node && genTypes.has(node.type || '')) {
      await executeNode(node.id)
    }
  }

  const tracks = useTimelineStore.getState().tracks
  const videoTrack = tracks.find(t => t.type === 'video')
  const unfilled = videoTrack ? videoTrack.clips.filter(c => c.status === 'empty') : []
  if (unfilled.length > 0) {
    useNotificationStore.getState().addNotification({
      type: 'warning',
      title: '时间线有未生成片段',
      message: `还有 ${unfilled.length} 个片段未生成，请检查时间线`,
    })
  }
}

export async function executeNodes(nodeIds: string[]) {
  const { nodes, edges } = useFlowStore.getState()
  const idSet = new Set(nodeIds)
  const genTypes = new Set(generatorRegistry.types)
  const sorted = topoSort(nodes, edges).filter(id => idSet.has(id))
  for (const nodeId of sorted) {
    const node = nodes.find(n => n.id === nodeId)
    if (node && genTypes.has(node.type || '')) {
      await executeNode(node.id)
    }
  }
}
