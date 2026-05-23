import type { ExecutionContext } from '@/engine/executionContext'
import type { GenerationTask } from '@/types/generation'
import { useFlowStore } from '@/store/useFlowStore'
import { useGenerationStore } from '@/store/useGenerationStore'
import { useLogStore } from '@/store/useLogStore'
import { useGenLogStore } from '@/store/useGenLogStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useProviderStore } from '@/store/useProviderStore'
import { useTimelineStore } from '@/store/useTimelineStore'
import { emitNBCEvent } from '@/utils/nbcEvents'

export function onExecutionStart(ctx: ExecutionContext, taskIds: string[]) {
  const { updateNodeData } = useFlowStore.getState()
  const { setProcessing } = useGenerationStore.getState()

  updateNodeData(ctx.nodeId, {
    _negativePrompt: ctx.negativePrompt || undefined,
    _consistencySeed: ctx.consistencySeed,
    _execStatus: 'running',
    _error: undefined,
    _taskIds: taskIds,
  })

  if (ctx.timelineRowId && ctx.timelineMediaType) {
    useTimelineStore.getState().setRowGenerating(ctx.timelineRowId, ctx.timelineMediaType, true)
  }

  setProcessing(true)

  useNotificationStore.getState().addNotification({
    type: 'info',
    title: `${ctx.label} 开始生成`,
    message: `节点「${ctx.nodeLabel}」已开始执行 (${ctx.batchCount}个并发)`,
  })

  emitNBCEvent('generation:start', ctx.projectId || undefined, {
    summary: `${ctx.label} 开始生成: ${ctx.nodeLabel}`,
    nodeType: ctx.type,
    nodeLabel: ctx.nodeLabel,
    generationType: ctx.type,
    generationParams: ctx.genParams,
  })
}

export function onTaskFailed(ctx: ExecutionContext, errorMsg: string) {
  emitNBCEvent('generation:fail', ctx.projectId || undefined, {
    summary: `${ctx.label} 生成失败: ${ctx.nodeLabel}`,
    nodeType: ctx.type,
    nodeLabel: ctx.nodeLabel,
    generationType: ctx.type,
    generationParams: ctx.genParams,
    error: errorMsg,
    success: false,
  })

  useLogStore.getState().addReport({
    nodeType: ctx.label,
    nodeLabel: ctx.nodeLabel,
    prompt: ctx.prompt || undefined,
    error: errorMsg,
    details: JSON.stringify(
      { hasApiKey: !!useProviderStore.getState().getProvider(ctx.type)?.endpoints[0]?.apiKey },
      null,
      2
    ),
  })

  useGenLogStore.getState().addEntry({
    model: (ctx.genParams.model || ctx.genParams.modelId) as string || ctx.type,
    type: ctx.mediaType,
    status: 'failure',
    prompt: ctx.prompt,
    negativePrompt: ctx.negativePrompt || undefined,
    error: errorMsg,
    source: 'node_editor',
    nodeLabel: ctx.nodeLabel,
    aspectRatio: ctx.genParams.aspectRatio as string || undefined,
    imageSize: ctx.genParams.imageSize as string || undefined,
  })
}

export function onExecutionComplete(
  ctx: ExecutionContext,
  successfulUrls: string[],
  failedCount: number,
  totalCount: number
) {
  const { updateNodeData } = useFlowStore.getState()

  if (successfulUrls.length > 0) {
    updateNodeData(ctx.nodeId, {
      _execStatus: 'done',
      _resultUrls: successfulUrls,
      _resultUrl: successfulUrls[0],
    })

    if (ctx.timelineRowId && ctx.timelineMediaType) {
      useTimelineStore.getState().setRowGenerating(ctx.timelineRowId, ctx.timelineMediaType, false)
    }

    useNotificationStore.getState().addNotification({
      type: 'success',
      title: `${ctx.label} 生成完成`,
      message: `节点「${ctx.nodeLabel}」生成了 ${successfulUrls.length} 个结果`,
    })

    for (const url of successfulUrls) {
      useGenLogStore.getState().addEntry({
        model: (ctx.genParams.model || ctx.genParams.modelId) as string || ctx.type,
        type: ctx.mediaType,
        status: 'success',
        prompt: ctx.prompt,
        negativePrompt: ctx.negativePrompt || undefined,
        resultUrl: url,
        source: 'node_editor',
        nodeLabel: ctx.nodeLabel,
        aspectRatio: ctx.genParams.aspectRatio as string || undefined,
        imageSize: ctx.genParams.imageSize as string || undefined,
      })
    }
  } else if (failedCount > 0) {
    updateNodeData(ctx.nodeId, {
      _execStatus: 'failed',
      _error: `所有 ${totalCount} 个并发请求均失败或被取消`,
    })

    if (ctx.timelineRowId && ctx.timelineMediaType) {
      useTimelineStore
        .getState()
        .setRowGenerating(ctx.timelineRowId, ctx.timelineMediaType, false, `所有 ${totalCount} 个并发请求均失败或被取消`)
    }

    useNotificationStore.getState().addNotification({
      type: 'error',
      title: `${ctx.label} 生成失败`,
      message: `节点「${ctx.nodeLabel}」的所有请求均失败`,
    })
  }
}

export function onExecutionFinish() {
  useGenerationStore.getState().setProcessing(false)
}
