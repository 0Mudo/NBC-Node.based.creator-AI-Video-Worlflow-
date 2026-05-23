import type { ExecutionContext } from '@/engine/executionContext'
import type { Asset } from '@/types/asset'
import type { GenerationType } from '@/types/generation'
import { useFlowStore } from '@/store/useFlowStore'
import { useTimelineStore } from '@/store/useTimelineStore'
import { useAssetStore } from '@/store/useAssetStore'
import { emitNBCEvent } from '@/utils/nbcEvents'
import { saveLocalViaElectron, saveGeneratedAsset } from '@/api/saveManager'

export async function commitResults(ctx: ExecutionContext, successfulUrls: string[]) {
  for (const url of successfulUrls) {
    emitNBCEvent('generation:complete', ctx.projectId || undefined, {
      summary: `${ctx.label} 生成完成: ${ctx.nodeLabel}`,
      nodeType: ctx.type,
      nodeLabel: ctx.nodeLabel,
      generationType: ctx.type,
      generationParams: ctx.genParams,
      resultFile: url,
      success: true,
    })

    if (ctx.timelineRowId && ctx.timelineMediaType) {
      useTimelineStore.getState().bindMediaToRow(ctx.timelineRowId, ctx.timelineMediaType, {
        kind: 'generated',
        type: ctx.timelineMediaType,
        sourceUrl: url,
        thumbnail: url,
        sourceNodeId: ctx.nodeId,
        status: 'done',
      })
    } else {
      useTimelineStore.getState().addLegacyClip({
        nodeId: ctx.nodeId,
        nodeLabel: ctx.nodeLabel,
        type: ctx.mediaType,
        url,
      })
    }
  }

  const assetSavePromises = successfulUrls.map(async (url) => {
    try {
      const ext = ctx.mediaType === 'video' ? '.mp4' : '.png'
      const filename = `${ctx.type}_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`
      const pId = ctx.projectId

      let base64Data: string | null = null
      if (window.electronAPI) {
        const resp = await fetch(url)
        const blob = await resp.blob()
        const buffer = await blob.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        base64Data = btoa(binary)
      }

      const savedPath = await saveLocalViaElectron(url, filename, base64Data)
      if (savedPath) {
        const { assets, setAssets } = useAssetStore.getState()
        const newAsset: Asset = {
          id: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
          name: filename,
          type: ctx.mediaType,
          path: `nbc://assets/${encodeURIComponent(filename)}?path=${encodeURIComponent(savedPath)}`,
          prompt: ctx.prompt?.substring(0, 200) || '',
          tags: [ctx.type === 'seedance' ? 'Seedance' : ('GPT Image' as Asset['tags'][number])],
          createdAt: new Date().toISOString(),
          thumbnailPath: `nbc://assets/${encodeURIComponent(filename)}?path=${encodeURIComponent(savedPath)}`,
          projectId: pId || undefined,
        }
        setAssets([...assets, newAsset])
      }
    } catch (e) {
      console.error('Auto-save to local asset library failed:', e)
    }
  })

  const outputSyncPromise = syncOutputNodes(ctx.nodeId, successfulUrls, ctx.type)

  await Promise.all([...assetSavePromises, outputSyncPromise])
}

async function syncOutputNodes(sourceNodeId: string, successfulUrls: string[], type: GenerationType) {
  const { nodes, edges, updateNodeData } = useFlowStore.getState()
  const connectedOutputs = nodes
    .filter(n => n.type === 'output')
    .filter(o => edges.some(e => e.target === o.id && e.source === sourceNodeId))

  if (connectedOutputs.length === 0) return

  const outputPromises = connectedOutputs.flatMap(outNode =>
    successfulUrls.map(async (url) => {
      const ext = type === 'seedance' ? '.mp4' : '.png'
      const filename = `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`
      try {
        const r = await saveGeneratedAsset({
          resultUrl: url,
          filename,
          saveLocal: !!outNode.data.outputSaveLocal,
          uploadOss: !!outNode.data.outputUploadOss,
          syncFeishu: !!outNode.data.outputSyncFeishu,
        })
        if (r.localPath) updateNodeData(outNode.id, { _localPath: r.localPath })
        if (r.ossUrl) updateNodeData(outNode.id, { _ossUrl: r.ossUrl })
        if (r.errors.length) updateNodeData(outNode.id, { _saveErrors: r.errors.join('; ') })
      } catch {
        // saveGeneratedAsset handles its own errors internally
      }
    })
  )

  await Promise.all(outputPromises)
}
