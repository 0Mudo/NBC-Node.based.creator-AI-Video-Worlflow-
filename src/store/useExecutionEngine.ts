import { useFlowStore } from './useFlowStore'
import { useGenerationStore } from './useGenerationStore'
import { useLogStore } from './useLogStore'
import { useProviderStore } from './useProviderStore'
import { useNotificationStore } from './useNotificationStore'
import { useTimelineStore } from './useTimelineStore'
import type { GenerationTask, GenerationType } from '@/types/generation'
import type { AppNode } from '@/types/flow'
import { generateGPTImageStream } from '@/api/gptImage2'
import { submitSeedanceTask, pollSeedanceTask, type SeedanceOptions } from '@/api/seedance'
import { submitComfyUIWorkflow, pollComfyUIResult } from '@/api/comfyui'
import { generateBananaImage } from '@/api/banana'
import { saveGeneratedAsset } from '@/api/saveManager'
import { emitNBCEvent } from '@/utils/nbcEvents'
import { useProjectStore } from './useProjectStore'

let taskCounter = 0
function taskId(): string { return `gen_${++taskCounter}_${Date.now()}` }

function findUpstream(
  nodeId: string,
  nodes: AppNode[],
  edges: Array<{ source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }>,
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

function collectPrompt(nodeId: string, nodes: AppNode[], edges: Array<{ source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }>): string {
  const upstream = findUpstream(nodeId, nodes, edges)
  const scripts: string[] = []
  const prompts: string[] = []
  const characters: string[] = []
  const scenes: string[] = []
  const items: string[] = []

  for (const node of upstream) {
    if (node.type === 'script' && node.data.scriptText) {
      scripts.push(node.data.scriptText as string)
    }
    if (node.type === 'prompt' && node.data.promptText) {
      prompts.push(resolveTemplates(node.data.promptText as string, node, nodes, edges))
    }
    if (node.type === 'characterCard') {
      const n = node.data.characterName || ''; const a = node.data.characterAppearance || ''
      if (n || a) characters.push(`【角色设定】\n角色名：${n}\n外观描述：${a}`)
    }
    if (node.type === 'sceneCard') {
      const n = node.data.sceneName || ''; const d = node.data.sceneDescription || ''
      if (n || d) scenes.push(`【场景设定】\n场景名：${n}\n场景描述：${d}`)
    }
    if (node.type === 'itemCard') {
      const n = node.data.itemName || ''; const d = node.data.itemDescription || ''
      if (n || d) items.push(`【物品设定】\n物品名：${n}\n物品描述：${d}`)
    }
  }

  const parts: string[] = []
  if (scripts.length) parts.push(`【剧本/分镜】\n${scripts.join('\n\n')}`)
  if (prompts.length) parts.push(`【提示词】\n${prompts.join('\n\n')}`)
  if (characters.length) parts.push(characters.join('\n\n'))
  if (scenes.length) parts.push(scenes.join('\n\n'))
  if (items.length) parts.push(items.join('\n\n'))

  return parts.join('\n\n')
}

function resolveTemplates(text: string, promptNode: AppNode, nodes: AppNode[], edges: Array<{ source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }>): string {
  const upstream = findUpstream(promptNode.id, nodes, edges)
  const charNode = upstream.find((n) => n.type === 'characterCard')
  const sceneNode = upstream.find((n) => n.type === 'sceneCard')
  const itemNode = upstream.find((n) => n.type === 'itemCard')
  return text
    .replace(/\{\{character\}\}/g, (charNode?.data.characterName as string) || '')
    .replace(/\{\{characterAppearance\}\}/g, (charNode?.data.characterAppearance as string) || '')
    .replace(/\{\{scene\}\}/g, (sceneNode?.data.sceneName as string) || '')
    .replace(/\{\{sceneDescription\}\}/g, (sceneNode?.data.sceneDescription as string) || '')
    .replace(/\{\{item\}\}/g, (itemNode?.data.itemName as string) || '')
    .replace(/\{\{itemDescription\}\}/g, (itemNode?.data.itemDescription as string) || '')
}

function collectImageRefs(nodeId: string, nodes: AppNode[], edges: Array<{ source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }>): string[] {
  const refs = new Set<string>()
  const upstream = findUpstream(nodeId, nodes, edges)
  
  for (const node of upstream) {
    if (node.type === 'assetInput' && node.data.assetId) {
      refs.add(node.data.assetId as string)
    }
    if (node.type === 'characterCard' && node.data.characterRefImage) {
      refs.add(node.data.characterRefImage as string)
    }
    if (node.type === 'sceneCard' && node.data.sceneRefImage) {
      refs.add(node.data.sceneRefImage as string)
    }
    if (node.type === 'itemCard' && node.data.itemRefImage) {
      refs.add(node.data.itemRefImage as string)
    }
  }
  
  return Array.from(refs)
}

export async function executeNode(nodeId: string) {
  const { nodes, edges, updateNodeData } = useFlowStore.getState()
  const { addTask, updateTask, setProcessing } = useGenerationStore.getState()
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return
  const type = node.type as GenerationType
  if (type !== 'gptImage2' && type !== 'seedance' && type !== 'comfyUI' && type !== 'banana') return

  const prompt = collectPrompt(nodeId, nodes, edges)
  const imageRefs = collectImageRefs(nodeId, nodes, edges)

  const batchCount = (node.data.batchCount as number) || 1
  const allTasks: GenerationTask[] = []
  
  for (let i = 0; i < batchCount; i++) {
    const task: GenerationTask = { id: taskId(), nodeId, type, status: 'running', progress: 0, startedAt: new Date().toISOString(), abortController: new AbortController() }
    addTask(task)
    allTasks.push(task)
  }
  
  setProcessing(true)
  updateNodeData(nodeId, { _execStatus: 'running', _error: undefined, _taskIds: allTasks.map(t => t.id) })

  const typeLabels: Record<string, string> = { gptImage2: 'GPT图像', seedance: 'Seedance视频', comfyUI: 'ComfyUI', banana: 'Banana图像' }
  useNotificationStore.getState().addNotification({
    type: 'info',
    title: `${typeLabels[type] || type} 开始生成`,
    message: `节点「${(node.data.label as string) || type}」已开始执行 (${batchCount}个并发)`,
  })

  // Emit generation:start event
  const genParams: Record<string, unknown> = { prompt: prompt?.slice(0, 200) || '', batchCount }
  if (type === 'gptImage2') {
    genParams['quality'] = (node.data.gptImageQuality as string) || 'auto'
    genParams['aspectRatio'] = (node.data.gptImageAspectRatio as string) || '1:1'
  } else if (type === 'banana') {
    genParams['model'] = (node.data.bananaModel as string) || 'gpt-image-2'
    genParams['aspectRatio'] = (node.data.bananaAspectRatio as string) || '1024x1024'
  } else if (type === 'seedance') {
    genParams['modelId'] = (node.data.seedanceModelId as string) || 'doubao-seedance-2-0-260128'
    genParams['mode'] = (node.data.seedanceMode as string) || 'text-to-video'
    genParams['duration'] = (node.data.seedanceDuration as number) || 5
    genParams['ratio'] = (node.data.seedanceRatio as string) || ''
    genParams['generateAudio'] = (node.data.seedanceGenerateAudio as boolean) || false
  }
  const pId = useProjectStore.getState().activeProjectId
  emitNBCEvent('generation:start', pId || undefined, {
    summary: `${typeLabels[type] || type} 开始生成: ${(node.data.label as string) || type}`,
    nodeType: type,
    nodeLabel: (node.data.label as string) || type,
    generationType: type,
    generationParams: genParams,
  })

  const results = await Promise.allSettled(allTasks.map(async (task) => {
    let finalResultUrl: string | undefined
    try {
      if (task.abortController?.signal.aborted) throw new Error('AbortError')
      switch (type) {
        case 'gptImage2': {
          const enabledProviders = useProviderStore.getState().getEnabledProviders().filter(p => p.capabilities.includes('text-to-image'))
          const provider = enabledProviders.find(p => p.endpoints.some(e => !!e.apiKey)) || enabledProviders[0] || useProviderStore.getState().getProvider('gptImage2')
          const endpoint = provider?.endpoints.find(e => e.isDefault) || provider?.endpoints[0]
          
          const rawUrls = node.data.gptImageUrls as string | undefined
          const refUrls = rawUrls ? rawUrls.split(/[\r\n]+/).filter(Boolean) : []
          const allUrls = [...refUrls, ...imageRefs]
          const combinedUrls = Array.from(new Set(
            allUrls.filter(u => u.startsWith('http://') || u.startsWith('https://'))
          ))

          const result = (await generateGPTImageStream({
            prompt,
            model: (node.data.gptImageModel as string) || 'gpt-image-2-vip',
            aspectRatio: (node.data.gptImageAspectRatio as string) || '1:1',
            quality: (node.data.gptImageQuality as 'auto' | 'low' | 'medium' | 'high') || 'auto',
            urls: combinedUrls.length ? combinedUrls : undefined,
            shutProgress: true,
            webHook: '-1',
            apiKey: endpoint?.apiKey || '',
            endpoint: endpoint?.url,
          }, (r) => { updateTask(task.id, { progress: 50, resultUrl: r.url }) }, task.abortController?.signal))[0]
          finalResultUrl = result?.url
          if (!finalResultUrl) throw new Error('生成成功但未返回图像链接，请检查 API 响应')
          updateTask(task.id, { status: 'completed', progress: 100, resultUrl: finalResultUrl, completedAt: new Date().toISOString() })
          break
        }
        case 'seedance': {
          const enabledProviders = useProviderStore.getState().getEnabledProviders().filter(p => p.capabilities.includes('text-to-video'))
          const provider = enabledProviders.find(p => p.endpoints.some(e => !!e.apiKey)) || enabledProviders[0] || useProviderStore.getState().getProvider('seedance')
          const endpoint = provider?.endpoints.find(e => e.isDefault) || provider?.endpoints[0]
          
          const refImages: Array<{ url: string; role?: string }> = []
          for (const imgRef of imageRefs) {
            if (imgRef && (imgRef.startsWith('http://') || imgRef.startsWith('https://') || imgRef.startsWith('asset://'))) {
              refImages.push({ url: imgRef, role: 'reference_image' })
            }
          }

          if (task.abortController?.signal.aborted) throw new Error('AbortError')

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
          updateTask(task.id, { progress: 20 })
          const seedResult = await pollSeedanceTask(tid, endpoint?.apiKey || '', (r) => {
            updateTask(task.id, { progress: r.status === 'succeeded' ? 100 : Math.min(20 + tid.length % 70, 90) })
          }, endpoint?.url, task.abortController?.signal)
          finalResultUrl = seedResult.videoUrl
          if (!finalResultUrl) throw new Error('生成成功但未返回视频链接，请检查 API 响应格式')
          updateTask(task.id, { status: 'completed', progress: 100, resultUrl: finalResultUrl, completedAt: new Date().toISOString() })
          break
        }
        case 'comfyUI': {
          const enabledProviders = useProviderStore.getState().getEnabledProviders().filter(p => p.capabilities.includes('workflow'))
          const provider = enabledProviders.find(p => p.endpoints.some(e => !!e.url)) || enabledProviders[0] || useProviderStore.getState().getProvider('comfyUI')
          const endpoint = provider?.endpoints.find(e => e.isDefault) || provider?.endpoints[0]
          
          if (!node.data.comfyWorkflow) throw new Error('No workflow configured')
          const workflow = JSON.parse(localStorage.getItem(`nbc_comfy_${node.data.comfyWorkflow}`) || '{}')
          if (!Object.keys(workflow).length) throw new Error('Workflow not found')
          const pid = await submitComfyUIWorkflow({ workflow, endpoint: endpoint?.url })
          updateTask(task.id, { progress: 30 })
          const comfyResult = await pollComfyUIResult(pid, () => { updateTask(task.id, { progress: Math.min(90, (task.progress || 30) + 10) }) }, endpoint?.url, task.abortController?.signal)
          if (comfyResult.images && comfyResult.images.length > 0) {
             finalResultUrl = `${endpoint?.url || 'http://localhost:8188'}/view?filename=${comfyResult.images[0]}&type=output`
          }
          if (!finalResultUrl) throw new Error('生成成功但未返回图像链接')
          updateTask(task.id, { status: 'completed', progress: 100, completedAt: new Date().toISOString(), resultUrl: finalResultUrl })
          break
        }
        case 'banana': {
          const enabledProviders = useProviderStore.getState().getEnabledProviders().filter(p => p.capabilities.includes('text-to-image') || p.id === 'banana')
          const provider = enabledProviders.find(p => p.endpoints.some(e => !!e.apiKey) && p.id === 'banana') || enabledProviders.find(p => p.id === 'banana') || useProviderStore.getState().getProvider('banana')
          const endpoint = provider?.endpoints.find(e => e.isDefault) || provider?.endpoints[0]
          
          const rawUrls = node.data.bananaUrls as string | undefined
          const refUrls = rawUrls ? rawUrls.split(/[\r\n]+/).filter(Boolean) : []
          const allUrls = [...refUrls, ...imageRefs]
          const combinedUrls = Array.from(new Set(
            allUrls.filter(u => u.startsWith('http://') || u.startsWith('https://'))
          ))

          const result = await generateBananaImage({
            prompt,
            model: (node.data.bananaModel as string) || 'gpt-image-2',
            aspectRatio: (node.data.bananaAspectRatio as string) || '1024x1024',
            images: combinedUrls.length ? combinedUrls : undefined,
            apiKey: endpoint?.apiKey || '',
            endpoint: endpoint?.url,
          }, (r) => { updateTask(task.id, { progress: r.progress || 50, resultUrl: r.results?.[0]?.url }) }, task.abortController?.signal)
          
          finalResultUrl = result.results?.[0]?.url
          if (!finalResultUrl) throw new Error('生成成功但未返回图像链接，请检查 API 响应')
          updateTask(task.id, { status: 'completed', progress: 100, resultUrl: finalResultUrl, completedAt: new Date().toISOString() })
          break
        }
      }
      return finalResultUrl
    } catch (err: any) {
      if (err.message === 'AbortError') {
        updateTask(task.id, { status: 'failed', error: 'User cancelled', completedAt: new Date().toISOString() })
        throw err
      }
      const errorMsg = err.message || String(err)
      updateTask(task.id, { status: 'failed', error: errorMsg, completedAt: new Date().toISOString() })
      
      emitNBCEvent('generation:fail', useProjectStore.getState().activeProjectId || undefined, {
        summary: `${typeLabels[type] || type} 生成失败: ${(node.data.label as string) || type}`,
        nodeType: type,
        nodeLabel: (node.data.label as string) || type,
        generationType: type,
        generationParams: genParams,
        error: errorMsg,
        success: false,
      })

      useLogStore.getState().addReport({
        nodeType: typeLabels[type] || type,
        nodeLabel: (node.data.label as string) || '',
        prompt: prompt || undefined,
        error: errorMsg,
        details: JSON.stringify({
          hasApiKey: !!useProviderStore.getState().getProvider(type)?.endpoints[0]?.apiKey,
        }, null, 2),
      })
      throw err
    }
  }))

  const successfulUrls = results.filter(r => r.status === 'fulfilled' && r.value).map(r => (r as PromiseFulfilledResult<string>).value)
  const failedTasks = results.filter(r => r.status === 'rejected')

  if (successfulUrls.length > 0) {
    updateNodeData(nodeId, { _execStatus: 'done', _resultUrls: successfulUrls, _resultUrl: successfulUrls[0] })
    
    // Auto-save logic
    for (const finalResultUrl of successfulUrls) {
      emitNBCEvent('generation:complete', pId || undefined, {
        summary: `${typeLabels[type] || type} 生成完成: ${(node.data.label as string) || type}`,
        nodeType: type,
        nodeLabel: (node.data.label as string) || type,
        generationType: type,
        generationParams: genParams,
        resultFile: finalResultUrl,
        success: true,
      })

      useTimelineStore.getState().addClip({
        nodeId,
        nodeLabel: (node.data.label as string) || type,
        type: type === 'seedance' ? 'video' : 'image',
        url: finalResultUrl,
      })
    }

    useNotificationStore.getState().addNotification({
      type: 'success',
      title: `${typeLabels[type] || type} 生成完成`,
      message: `节点「${(node.data.label as string) || type}」生成了 ${successfulUrls.length} 个结果`,
    })

    const latestNodes = useFlowStore.getState().nodes
    const latestEdges = useFlowStore.getState().edges
    const outputNodes = latestNodes.filter(n => n.type === 'output')
    const connectedOutputs = outputNodes.filter(o =>
      latestEdges.some(e => e.target === o.id && e.source === nodeId)
    )
    
    for (const outNode of connectedOutputs) {
      useFlowStore.getState().updateNodeData(outNode.id, { _resultUrls: successfulUrls, _execStatus: 'done' })
      for (const finalResultUrl of successfulUrls) {
        const ext = type === 'seedance' ? '.mp4' : '.png'
        const filename = `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`
        
        saveGeneratedAsset({
          resultUrl: finalResultUrl,
          filename,
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
      type: 'error',
      title: `${typeLabels[type] || type} 生成失败`,
      message: `节点「${(node.data.label as string) || type}」的所有请求均失败`,
    })
  }

  setProcessing(false)
}

export async function executeAll() {
  const { nodes } = useFlowStore.getState()
  for (const node of nodes.filter((n) => n.type === 'gptImage2' || n.type === 'seedance' || n.type === 'comfyUI')) {
    await executeNode(node.id)
  }

  // Check unfilled timeline slots after all executions
  const unfilled = useTimelineStore.getState().getUnfilledSlots()
  if (unfilled.length > 0) {
    useNotificationStore.getState().addNotification({
      type: 'warning',
      title: '时间线有未填充坑位',
      message: `还有 ${unfilled.length} 个分镜坑位未填充，请检查时间线`,
    })
  }
}
