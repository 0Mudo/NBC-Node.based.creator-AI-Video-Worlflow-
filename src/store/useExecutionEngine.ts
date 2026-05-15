import { useFlowStore } from './useFlowStore'
import { useGenerationStore } from './useGenerationStore'
import { useLogStore } from './useLogStore'
import { useProviderStore } from './useProviderStore'
import { useNotificationStore } from './useNotificationStore'
import { useTimelineStore } from './useTimelineStore'
import { useAssetStore } from './useAssetStore'
import { useProjectStore } from './useProjectStore'
import { collectPrompt, collectImageRefs } from '@/engine/promptResolver'
import { topoSort } from '@/engine/graph'
import type { GenerationTask, GenerationType } from '@/types/generation'
import type { Asset } from '@/types/asset'
import type { ProviderCapability } from '@/types/provider'
import { generateGPTImageStream } from '@/api/gptImage2'
import { submitSeedanceTask, pollSeedanceTask, type SeedanceOptions } from '@/api/seedance'
import { submitComfyUIWorkflow, pollComfyUIResult } from '@/api/comfyui'
import { generateBananaImage } from '@/api/banana'
import { saveGeneratedAsset, saveLocalViaElectron } from '@/api/saveManager'
import { emitNBCEvent } from '@/utils/nbcEvents'

let taskCounter = 0
function taskId(): string { return `gen_${++taskCounter}_${Date.now()}` }

const TYPE_LABELS: Record<string, string> = {
  gptImage2: 'GPT图像', seedance: 'Seedance视频', comfyUI: 'ComfyUI', banana: 'Banana图像'
}

function getGenerationParams(node: any, type: string): Record<string, unknown> {
  const params: Record<string, unknown> = { batchCount: (node.data.batchCount as number) || 1 }
  switch (type) {
    case 'gptImage2':
      params['quality'] = (node.data.gptImageQuality as string) || 'auto'
      params['aspectRatio'] = (node.data.gptImageAspectRatio as string) || '1:1'
      break
    case 'banana':
      params['model'] = (node.data.bananaModel as string) || 'gpt-image-2'
      params['aspectRatio'] = (node.data.bananaAspectRatio as string) || '1024x1024'
      break
    case 'seedance':
      params['modelId'] = (node.data.seedanceModelId as string) || 'doubao-seedance-2-0-260128'
      params['mode'] = (node.data.seedanceMode as string) || 'text-to-video'
      params['duration'] = (node.data.seedanceDuration as number) || 5
      params['ratio'] = (node.data.seedanceRatio as string) || ''
      params['generateAudio'] = (node.data.seedanceGenerateAudio as boolean) || false
      break
  }
  return params
}

function getProviderForType(type: string) {
  const ps = useProviderStore.getState()
  const typeMap: Record<string, { capability: ProviderCapability; fallbackId: string }> = {
    gptImage2: { capability: 'text-to-image', fallbackId: 'gptImage2' },
    banana: { capability: 'text-to-image', fallbackId: 'banana' },
    seedance: { capability: 'text-to-video', fallbackId: 'seedance' },
    comfyUI: { capability: 'workflow', fallbackId: 'comfyUI' },
  }
  const { capability, fallbackId } = typeMap[type] || { capability: '', fallbackId: type }
  const enabled = ps.getEnabledProviders().filter(p => p.capabilities.includes(capability))
  return enabled.find(p => p.endpoints.some(e => !!e.apiKey))
    || enabled[0]
    || ps.getProvider(fallbackId)
}

async function execGptImage2(node: any, prompt: string, imageRefs: string[], signal?: AbortSignal) {
  const provider = getProviderForType('gptImage2')
  const endpoint = provider?.endpoints.find(e => e.isDefault) || provider?.endpoints[0]
  const rawUrls = node.data.gptImageUrls as string | undefined
  const refUrls = rawUrls ? rawUrls.split(/[\r\n]+/).filter(Boolean) : []
  const combinedUrls = Array.from(new Set(
    [...refUrls, ...imageRefs].filter(u => u.startsWith('http://') || u.startsWith('https://'))
  ))
  const results = await generateGPTImageStream({
    prompt,
    model: (node.data.gptImageModel as string) || 'gpt-image-2-vip',
    aspectRatio: (node.data.gptImageAspectRatio as string) || '1:1',
    quality: (node.data.gptImageQuality as 'auto' | 'low' | 'medium' | 'high') || 'auto',
    urls: combinedUrls.length ? combinedUrls : undefined,
    shutProgress: true,
    webHook: '-1',
    apiKey: endpoint?.apiKey || '',
    endpoint: endpoint?.url,
  }, () => {}, signal)
  const result = results[0]
  if (!result?.url) throw new Error('生成成功但未返回图像链接，请检查 API 响应')
  return result.url
}

async function execSeedance(node: any, prompt: string, imageRefs: string[], signal?: AbortSignal) {
  const provider = getProviderForType('seedance')
  const endpoint = provider?.endpoints.find(e => e.isDefault) || provider?.endpoints[0]
  const refImages = imageRefs
    .filter(img => img && (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('asset://')))
    .map(url => ({ url, role: 'reference_image' as const }))
  if (signal?.aborted) throw new Error('AbortError')
  const tid = await submitSeedanceTask({
    modelId: (node.data.seedanceModelId as string) || 'doubao-seedance-2-0-260128',
    mode: (node.data.seedanceMode as SeedanceOptions['mode']) || 'text-to-video',
    prompt,
    resolution: (node.data.seedanceResolution as SeedanceOptions['resolution']),
    ratio: (node.data.seedanceRatio as SeedanceOptions['ratio']),
    duration: (node.data.seedanceDuration as number) || 5,
    generateAudio: (node.data.seedanceGenerateAudio as boolean) || false,
    returnLastFrame: (node.data.seedanceReturnLastFrame as boolean) || false,
    serviceTier: (node.data.seedanceServiceTier as SeedanceOptions['serviceTier']),
    webSearch: (node.data.seedanceWebSearch as boolean) || false,
    referenceImages: refImages.length ? refImages : undefined,
    apiKey: endpoint?.apiKey || '',
    endpoint: endpoint?.url,
  })
  const seedResult = await pollSeedanceTask(tid, endpoint?.apiKey || '', () => {}, endpoint?.url, signal)
  if (!seedResult.videoUrl) throw new Error('生成成功但未返回视频链接，请检查 API 响应格式')
  return seedResult.videoUrl
}

async function execComfyUI(node: any, _prompt: string, _imageRefs: string[], signal?: AbortSignal) {
  const provider = getProviderForType('comfyUI')
  const endpoint = provider?.endpoints.find(e => e.isDefault) || provider?.endpoints[0]
  if (!node.data.comfyWorkflow) throw new Error('No workflow configured')
  const workflow = JSON.parse(localStorage.getItem(`nbc_comfy_${node.data.comfyWorkflow}`) || '{}')
  if (!Object.keys(workflow).length) throw new Error('Workflow not found')
  const pid = await submitComfyUIWorkflow({ workflow, endpoint: endpoint?.url })
  const comfyResult = await pollComfyUIResult(pid, () => {}, endpoint?.url, signal)
  if (comfyResult.images && comfyResult.images.length > 0) {
    return `${endpoint?.url || 'http://localhost:8188'}/view?filename=${comfyResult.images[0]}&type=output`
  }
  throw new Error('生成成功但未返回图像链接')
}

async function execBanana(node: any, prompt: string, imageRefs: string[], signal?: AbortSignal) {
  const provider = getProviderForType('banana')
  const endpoint = provider?.endpoints.find(e => e.isDefault) || provider?.endpoints[0]
  const rawUrls = node.data.bananaUrls as string | undefined
  const refUrls = rawUrls ? rawUrls.split(/[\r\n]+/).filter(Boolean) : []
  const combinedUrls = Array.from(new Set(
    [...refUrls, ...imageRefs].filter(u => u.startsWith('http://') || u.startsWith('https://'))
  ))
  const result = await generateBananaImage({
    prompt,
    model: (node.data.bananaModel as string) || 'gpt-image-2',
    aspectRatio: (node.data.bananaAspectRatio as string) || '1024x1024',
    images: combinedUrls.length ? combinedUrls : undefined,
    apiKey: endpoint?.apiKey || '',
    endpoint: endpoint?.url,
  }, () => {}, signal)
  if (!result.results?.[0]?.url) throw new Error('生成成功但未返回图像链接，请检查 API 响应')
  return result.results[0].url
}

const EXECUTORS: Record<string, (node: any, prompt: string, imageRefs: string[], signal?: AbortSignal) => Promise<string>> = {
  gptImage2: execGptImage2,
  seedance: execSeedance,
  comfyUI: execComfyUI,
  banana: execBanana,
}

export async function executeNode(nodeId: string) {
  const { nodes, edges, updateNodeData } = useFlowStore.getState()
  const { addTask, updateTask, setProcessing } = useGenerationStore.getState()
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return
  const type = node.type as GenerationType
  if (!EXECUTORS[type]) return

  const prompt = collectPrompt(nodeId, nodes, edges)
  const imageRefs = collectImageRefs(nodeId, nodes, edges)
  const batchCount = (node.data.batchCount as number) || 1
  const allTasks: GenerationTask[] = []
  const nodeLabel = (node.data.label as string) || type

  for (let i = 0; i < batchCount; i++) {
    const task: GenerationTask = {
      id: taskId(), nodeId, type, status: 'running', progress: 0,
      startedAt: new Date().toISOString(), abortController: new AbortController()
    }
    addTask(task)
    allTasks.push(task)
  }

  setProcessing(true)
  updateNodeData(nodeId, { _execStatus: 'running', _error: undefined, _taskIds: allTasks.map(t => t.id) })

  const label = TYPE_LABELS[type] || type
  useNotificationStore.getState().addNotification({
    type: 'info', title: `${label} 开始生成`,
    message: `节点「${nodeLabel}」已开始执行 (${batchCount}个并发)`,
  })

  const genParams = getGenerationParams(node, type)
  genParams['prompt'] = prompt?.slice(0, 200) || ''
  const pId = useProjectStore.getState().activeProjectId
  emitNBCEvent('generation:start', pId || undefined, {
    summary: `${label} 开始生成: ${nodeLabel}`,
    nodeType: type, nodeLabel, generationType: type, generationParams: genParams,
  })

  const executor = EXECUTORS[type]
  const results = await Promise.allSettled(allTasks.map(async (task) => {
    try {
      if (task.abortController?.signal.aborted) throw new Error('AbortError')
      const url = await executor(node, prompt, imageRefs, task.abortController?.signal)
      updateTask(task.id, { status: 'completed', progress: 100, resultUrl: url, completedAt: new Date().toISOString() })
      return url
    } catch (err: any) {
      if (err.message === 'AbortError') {
        updateTask(task.id, { status: 'failed', error: 'User cancelled', completedAt: new Date().toISOString() })
        throw err
      }
      const errorMsg = err.message || String(err)
      updateTask(task.id, { status: 'failed', error: errorMsg, completedAt: new Date().toISOString() })
      emitNBCEvent('generation:fail', pId || undefined, {
        summary: `${label} 生成失败: ${nodeLabel}`, nodeType: type, nodeLabel,
        generationType: type, generationParams: genParams, error: errorMsg, success: false,
      })
      useLogStore.getState().addReport({
        nodeType: label, nodeLabel,
        prompt: prompt || undefined, error: errorMsg,
        details: JSON.stringify({ hasApiKey: !!useProviderStore.getState().getProvider(type)?.endpoints[0]?.apiKey }, null, 2),
      })
      throw err
    }
  }))

  const successfulUrls = results.filter(r => r.status === 'fulfilled' && r.value).map(r => (r as PromiseFulfilledResult<string>).value)
  const failedTasks = results.filter(r => r.status === 'rejected')

  if (successfulUrls.length > 0) {
    updateNodeData(nodeId, { _execStatus: 'done', _resultUrls: successfulUrls, _resultUrl: successfulUrls[0] })

    for (const url of successfulUrls) {
      emitNBCEvent('generation:complete', pId || undefined, {
        summary: `${label} 生成完成: ${nodeLabel}`, nodeType: type, nodeLabel,
        generationType: type, generationParams: genParams, resultFile: url, success: true,
      })
      useTimelineStore.getState().addLegacyClip({ nodeId, nodeLabel, type: type === 'seedance' ? 'video' : 'image', url })
    }

    for (const url of successfulUrls) {
      const ext = type === 'seedance' ? '.mp4' : '.png'
      const filename = `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`
      ;(async () => {
        try {
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
              type: 'image',
              path: `nbc://assets/${encodeURIComponent(filename)}?path=${encodeURIComponent(savedPath)}`,
              prompt: prompt?.substring(0, 200) || '',
              tags: type === 'seedance' ? ['Seedance'] : ['GPT Image'],
              createdAt: new Date().toISOString(),
              thumbnailPath: `nbc://assets/${encodeURIComponent(filename)}?path=${encodeURIComponent(savedPath)}`,
              projectId: pId || undefined
            }
            setAssets([...assets, newAsset])
          }
        } catch (e) {
          console.error('Auto-save to local asset library failed:', e)
        }
      })()
    }

    useNotificationStore.getState().addNotification({
      type: 'success', title: `${label} 生成完成`,
      message: `节点「${nodeLabel}」生成了 ${successfulUrls.length} 个结果`,
    })

    const latestNodes = useFlowStore.getState().nodes
    const latestEdges = useFlowStore.getState().edges
    const connectedOutputs = latestNodes
      .filter(n => n.type === 'output')
      .filter(o => latestEdges.some(e => e.target === o.id && e.source === nodeId))

    for (const outNode of connectedOutputs) {
      useFlowStore.getState().updateNodeData(outNode.id, { _resultUrls: successfulUrls, _execStatus: 'done' })
      for (const url of successfulUrls) {
        const ext = type === 'seedance' ? '.mp4' : '.png'
        const filename = `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`
        saveGeneratedAsset({
          resultUrl: url, filename,
          saveLocal: !!outNode.data.outputSaveLocal,
          uploadOss: !!outNode.data.outputUploadOss,
          syncFeishu: !!outNode.data.outputSyncFeishu,
        }).then(r => {
          if (r.localPath) useFlowStore.getState().updateNodeData(outNode.id, { _localPath: r.localPath })
          if (r.ossUrl) useFlowStore.getState().updateNodeData(outNode.id, { _ossUrl: r.ossUrl })
          if (r.errors.length) useFlowStore.getState().updateNodeData(outNode.id, { _saveErrors: r.errors.join('; ') })
        }).catch(() => {})
      }
    }
  } else if (failedTasks.length > 0) {
    updateNodeData(nodeId, { _execStatus: 'failed', _error: `所有 ${batchCount} 个并发请求均失败或被取消` })
    useNotificationStore.getState().addNotification({
      type: 'error', title: `${label} 生成失败`,
      message: `节点「${nodeLabel}」的所有请求均失败`,
    })
  }

  setProcessing(false)
}

export async function executeAll() {
  const { nodes } = useFlowStore.getState()
  const sorted = topoSort(nodes, useFlowStore.getState().edges)
  const genTypes = new Set(['gptImage2', 'seedance', 'comfyUI', 'banana'])
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
      type: 'warning', title: '时间线有未生成片段',
      message: `还有 ${unfilled.length} 个片段未生成，请检查时间线`,
    })
  }
}
