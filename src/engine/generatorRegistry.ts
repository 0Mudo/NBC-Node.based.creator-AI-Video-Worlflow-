import type { AppNode } from '@/types/flow'
import type { GenerationType } from '@/types/generation'
import type { ProviderCapability } from '@/types/provider'
import { useProviderStore } from '@/store/useProviderStore'
import { resolveImageRefs, convertRefToDataUri } from '@/engine/promptResolver'
import { generateGPTImageStream } from '@/api/gptImage2'
import { submitSeedanceTask, pollSeedanceTask, type SeedanceOptions } from '@/api/seedance'
import { generateBananaImage } from '@/api/banana'

export interface GeneratorAdapter {
  type: GenerationType
  mediaType: 'image' | 'video'
  label: string
  buildParams(node: AppNode): Record<string, unknown>
  execute(node: AppNode, prompt: string, imageRefs: string[], signal?: AbortSignal): Promise<string>
}

function getProviderForType(type: string) {
  const ps = useProviderStore.getState()
  const typeMap: Record<string, { capability: ProviderCapability; fallbackId: string }> = {
    gptImage2: { capability: 'text-to-image', fallbackId: 'gptImage2' },
    banana: { capability: 'text-to-image', fallbackId: 'banana' },
    seedance: { capability: 'text-to-video', fallbackId: 'seedance' },
  }
  const { capability, fallbackId } = typeMap[type] || { capability: '', fallbackId: type }
  const enabled = ps.getEnabledProviders().filter(p => p.capabilities.includes(capability))
  return enabled.find(p => p.endpoints.some(e => !!e.apiKey))
    || enabled[0]
    || ps.getProvider(fallbackId)
}

const gptImage2Adapter: GeneratorAdapter = {
  type: 'gptImage2',
  mediaType: 'image',
  label: 'GPT图像',
  buildParams: (node) => ({
    batchCount: (node.data.batchCount as number) || 1,
    model: (node.data.gptImageModel as string) || 'gpt-image-2-vip',
    quality: (node.data.gptImageQuality as string) || 'auto',
    aspectRatio: (node.data.gptImageAspectRatio as string) || '1:1',
  }),
  execute: async (node, prompt, imageRefs, signal) => {
    const provider = getProviderForType('gptImage2')
    const endpoint = provider?.endpoints.find(e => e.isDefault) || provider?.endpoints[0]
    const rawUrls = node.data.gptImageUrls as string | undefined
    const refUrls = rawUrls ? rawUrls.split(/[\r\n]+/).filter(Boolean) : []
    const httpRefs = resolveImageRefs(imageRefs)
    const dataUriPromises = imageRefs
      .filter(r => !r.startsWith('http://') && !r.startsWith('https://'))
      .map(r => convertRefToDataUri(r))
    const dataUris = (await Promise.all(dataUriPromises)).filter(u => u.startsWith('data:'))
    const combinedUrls = Array.from(new Set(
      [...refUrls, ...httpRefs, ...dataUris].filter(u => u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:'))
    ))
    const negativePrompt = (node.data._negativePrompt as string) || ''
    const finalPrompt = negativePrompt
      ? `${prompt}\n\nNEGATIVE PROMPT (DO NOT INCLUDE, STRICTLY AVOID): ${negativePrompt}`
      : prompt
    const results = await generateGPTImageStream({
      prompt: finalPrompt,
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
  },
}

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv']

function isVideoUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    return VIDEO_EXTENSIONS.some(ext => pathname.endsWith(ext))
  } catch {
    return VIDEO_EXTENSIONS.some(ext => url.toLowerCase().endsWith(ext))
  }
}

const seedanceAdapter: GeneratorAdapter = {
  type: 'seedance',
  mediaType: 'video',
  label: 'Seedance视频',
  buildParams: (node) => ({
    batchCount: (node.data.batchCount as number) || 1,
    modelId: (node.data.seedanceModelId as string) || 'doubao-seedance-2-0-260128',
    mode: (node.data.seedanceMode as string) || 'text-to-video',
    duration: (node.data.seedanceDuration as number) || 5,
    ratio: (node.data.seedanceRatio as string) || '',
    generateAudio: (node.data.seedanceGenerateAudio as boolean) || false,
  }),
  execute: async (node, prompt, imageRefs, signal) => {
    const provider = getProviderForType('seedance')
    const endpoint = provider?.endpoints.find(e => e.isDefault) || provider?.endpoints[0]
    const resolvedImageRefs = resolveImageRefs(imageRefs)
    const validRefs = resolvedImageRefs
      .filter(img => img && (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('asset://')))
    const refImages = validRefs
      .filter(url => !isVideoUrl(url))
      .map(url => ({ url, role: 'reference_image' as const }))
    const refVideos = validRefs
      .filter(url => isVideoUrl(url))
      .map(url => ({ url, role: 'reference_video' as const }))
    const negativePrompt = (node.data._negativePrompt as string) || ''
    const finalPrompt = negativePrompt
      ? `${prompt}\n\nNEGATIVE PROMPT (STRICTLY AVOID): ${negativePrompt}`
      : prompt
    if (signal?.aborted) throw new Error('AbortError')
    const tid = await submitSeedanceTask({
      modelId: (node.data.seedanceModelId as string) || 'doubao-seedance-2-0-260128',
      mode: (node.data.seedanceMode as SeedanceOptions['mode']) || 'text-to-video',
      prompt: finalPrompt,
      resolution: (node.data.seedanceResolution as SeedanceOptions['resolution']),
      ratio: (node.data.seedanceRatio as SeedanceOptions['ratio']),
      duration: (node.data.seedanceDuration as number) || 5,
      generateAudio: (node.data.seedanceGenerateAudio as boolean) || false,
      returnLastFrame: (node.data.seedanceReturnLastFrame as boolean) || false,
      serviceTier: (node.data.seedanceServiceTier as SeedanceOptions['serviceTier']),
      webSearch: (node.data.seedanceWebSearch as boolean) || false,
      referenceImages: refImages.length ? refImages : undefined,
      referenceVideos: refVideos.length ? refVideos : undefined,
      apiKey: endpoint?.apiKey || '',
      endpoint: endpoint?.url,
    })
    const seedResult = await pollSeedanceTask(tid, endpoint?.apiKey || '', () => {}, endpoint?.url, signal)
    if (!seedResult.videoUrl) throw new Error('生成成功但未返回视频链接，请检查 API 响应格式')
    return seedResult.videoUrl
  },
}

const bananaAdapter: GeneratorAdapter = {
  type: 'banana',
  mediaType: 'image',
  label: 'Banana图像',
  buildParams: (node) => ({
    batchCount: (node.data.batchCount as number) || 1,
    model: (node.data.bananaModel as string) || 'nano-banana-2',
    aspectRatio: (node.data.bananaAspectRatio as string) || '1:1',
    imageSize: (node.data.bananaImageSize as string) || '1K',
  }),
  execute: async (node, prompt, imageRefs, signal) => {
    const provider = getProviderForType('banana')
    const endpoint = provider?.endpoints.find(e => e.isDefault) || provider?.endpoints[0]
    const rawUrls = node.data.bananaUrls as string | undefined
    const refUrls = rawUrls ? rawUrls.split(/[\r\n]+/).filter(Boolean) : []
    const httpRefs = resolveImageRefs(imageRefs)
    const dataUriPromises = imageRefs
      .filter(r => !r.startsWith('http://') && !r.startsWith('https://'))
      .map(r => convertRefToDataUri(r))
    const dataUris = (await Promise.all(dataUriPromises)).filter(u => u.startsWith('data:'))
    const combinedUrls = Array.from(new Set(
      [...refUrls, ...httpRefs, ...dataUris].filter(u => u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:'))
    ))
    const negativePrompt = (node.data._negativePrompt as string) || ''
    const finalPrompt = negativePrompt
      ? `${prompt}\n\nNEGATIVE PROMPT (DO NOT INCLUDE, STRICTLY AVOID): ${negativePrompt}`
      : prompt
    const result = await generateBananaImage({
      prompt: finalPrompt,
      model: (node.data.bananaModel as string) || 'nano-banana-2',
      aspectRatio: (node.data.bananaAspectRatio as string) || '1:1',
      imageSize: (node.data.bananaImageSize as '1K' | '2K' | '4K') || '1K',
      images: combinedUrls.length ? combinedUrls : undefined,
      apiKey: endpoint?.apiKey || '',
      endpoint: endpoint?.url,
    }, () => {}, signal)
    if (!result.results?.[0]?.url) throw new Error('生成成功但未返回图像链接，请检查 API 响应')
    return result.results[0].url
  },
}

class GeneratorRegistry {
  private adapters = new Map<string, GeneratorAdapter>()

  register(adapter: GeneratorAdapter) {
    this.adapters.set(adapter.type, adapter)
  }

  get(type: string): GeneratorAdapter | undefined {
    return this.adapters.get(type)
  }

  get types(): string[] {
    return Array.from(this.adapters.keys())
  }
}

export const generatorRegistry = new GeneratorRegistry()

generatorRegistry.register(gptImage2Adapter)
generatorRegistry.register(seedanceAdapter)
generatorRegistry.register(bananaAdapter)
