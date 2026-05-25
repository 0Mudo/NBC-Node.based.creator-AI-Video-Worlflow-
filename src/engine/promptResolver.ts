import type { AppNode, AppEdge } from '@/types/flow'
import { findUpstream } from './graph'
import { useStyleStore } from '@/store/useStyleStore'
import { useAssetStore } from '@/store/useAssetStore'

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  if (typeof value === 'string' && value.trim()) return [value]
  return []
}

function isVideoRef(ref: string): boolean {
  const videoExts = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv', '.m4v']
  const lower = ref.toLowerCase()
  return videoExts.some(ext => lower.endsWith(ext))
}

export function collectMediaRefsFromUpstream(
  promptNodeId: string,
  nodes: AppNode[],
  edges: AppEdge[]
): { imageRefs: string[]; videoRefs: string[] } {
  const upstream = findUpstream(promptNodeId, nodes, edges)
  const imageRefs: string[] = []
  const videoRefs: string[] = []
  const assets = useAssetStore.getState().assets

  for (const node of upstream) {
    if (node.type === 'assetInput' && node.data.assetId) {
      const assetId = node.data.assetId as string
      const asset = assets.find(a => a.id === assetId || a.path === assetId)
      if (asset) {
        if (asset.type === 'video') {
          videoRefs.push(asset.path || assetId)
        } else {
          imageRefs.push(asset.path || assetId)
        }
      } else if (isVideoRef(assetId)) {
        videoRefs.push(assetId)
      } else {
        imageRefs.push(assetId)
      }
    }
    if (node.type === 'characterCard') {
      const single = node.data.characterRefImage as string | undefined
      if (single) imageRefs.push(single)
      const multi = node.data.characterRefImages as string[] | undefined
      if (multi) multi.forEach(r => imageRefs.push(r))
    }
    if (node.type === 'sceneCard') {
      if (node.data.sceneRefImage) imageRefs.push(node.data.sceneRefImage as string)
      asStringArray(node.data.sceneRefImages).forEach((ref) => imageRefs.push(ref))
    }
    if (node.type === 'itemCard') {
      if (node.data.itemRefImage) imageRefs.push(node.data.itemRefImage as string)
      asStringArray(node.data.itemRefImages).forEach((ref) => imageRefs.push(ref))
    }
  }

  return { imageRefs, videoRefs }
}

function resolveMediaVariables(
  text: string,
  imageRefs: string[],
  videoRefs: string[]
): string {
  let result = text

  for (let i = 0; i < Math.max(imageRefs.length, 10); i++) {
    const placeholder = `图片参考${i + 1}`
    if (result.includes(placeholder)) {
      if (i < imageRefs.length) {
        const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        result = result.replace(new RegExp(escaped, 'g'), imageRefs[i])
      }
    }
  }

  for (let i = 0; i < Math.max(videoRefs.length, 10); i++) {
    const placeholder = `视频参考${i + 1}`
    if (result.includes(placeholder)) {
      if (i < videoRefs.length) {
        const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        result = result.replace(new RegExp(escaped, 'g'), videoRefs[i])
      }
    }
  }

  return result
}

function resolveTemplatesWithMedia(
  text: string,
  promptNode: AppNode,
  nodes: AppNode[],
  edges: AppEdge[]
): string {
  const { imageRefs, videoRefs } = collectMediaRefsFromUpstream(promptNode.id, nodes, edges)

  let result = text
  for (let i = 0; i < Math.max(imageRefs.length, 10); i++) {
    const key = `{{图片参考${i + 1}}}`
    if (result.includes(key)) {
      result = result.split(key).join(i < imageRefs.length ? imageRefs[i] : '')
    }
  }
  for (let i = 0; i < Math.max(videoRefs.length, 10); i++) {
    const key = `{{视频参考${i + 1}}}`
    if (result.includes(key)) {
      result = result.split(key).join(i < videoRefs.length ? videoRefs[i] : '')
    }
  }

  return resolveMediaVariables(result, imageRefs, videoRefs)
}

export function resolveTemplates(
  text: string,
  promptNode: AppNode,
  nodes: AppNode[],
  edges: AppEdge[]
): string {
  const upstream = findUpstream(promptNode.id, nodes, edges)
  const charNode = upstream.find((n) => n.type === 'characterCard')
  const sceneNode = upstream.find((n) => n.type === 'sceneCard')
  const itemNode = upstream.find((n) => n.type === 'itemCard')
  const characterNames = asStringArray(charNode?.data.characterNames).length
    ? asStringArray(charNode?.data.characterNames).join('、')
    : ((charNode?.data.characterName as string) || '')
  const characterAppearances = asStringArray(charNode?.data.characterAppearances).length
    ? asStringArray(charNode?.data.characterAppearances).join('\n')
    : ((charNode?.data.characterAppearance as string) || '')
  const sceneNames = asStringArray(sceneNode?.data.sceneNames).length
    ? asStringArray(sceneNode?.data.sceneNames).join('、')
    : ((sceneNode?.data.sceneName as string) || '')
  const sceneDescriptions = asStringArray(sceneNode?.data.sceneDescriptions).length
    ? asStringArray(sceneNode?.data.sceneDescriptions).join('\n')
    : ((sceneNode?.data.sceneDescription as string) || '')
  const itemNames = asStringArray(itemNode?.data.itemNames).length
    ? asStringArray(itemNode?.data.itemNames).join('、')
    : ((itemNode?.data.itemName as string) || '')
  const itemDescriptions = asStringArray(itemNode?.data.itemDescriptions).length
    ? asStringArray(itemNode?.data.itemDescriptions).join('\n')
    : ((itemNode?.data.itemDescription as string) || '')

  let resolved = text
    .replace(/\{\{character\}\}/g, characterNames)
    .replace(/\{\{characterAppearance\}\}/g, characterAppearances)
    .replace(/\{\{scene\}\}/g, sceneNames)
    .replace(/\{\{sceneDescription\}\}/g, sceneDescriptions)
    .replace(/\{\{item\}\}/g, itemNames)
    .replace(/\{\{itemDescription\}\}/g, itemDescriptions)

  resolved = resolveTemplatesWithMedia(resolved, promptNode, nodes, edges)

  return resolved
}

export function collectPrompt(
  nodeId: string,
  nodes: AppNode[],
  edges: AppEdge[]
): string {
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
      const parts: string[] = []
      const names = asStringArray(node.data.characterNames)
      const appearances = asStringArray(node.data.characterAppearances)
      if (names.length || appearances.length) {
        parts.push(`角色名：${names.join('、')}`)
        if (appearances.length) parts.push(`外观描述：\n${appearances.map((item, index) => `${index + 1}. ${item}`).join('\n')}`)
      } else {
        const n = node.data.characterName || ''
        const a = node.data.characterAppearance || ''
        if (n || a) parts.push(`角色名：${n}\n外观描述：${a}`)
      }
      const facePrompt = node.data.characterFacePrompt as string | undefined
      const bodyPrompt = node.data.characterBodyPrompt as string | undefined
      if (facePrompt || bodyPrompt) {
        parts.push(`\n【生成一致性约束 - 请严格遵循】`)
        if (facePrompt) parts.push(`面部：${facePrompt}`)
        if (bodyPrompt) parts.push(`体型/着装：${bodyPrompt}`)
        const seed = node.data.characterConsistencySeed as number | undefined
        if (seed) parts.push(`推荐随机种子：${seed}`)
      }
      if (parts.length) characters.push(`【角色设定】\n${parts.join('\n')}`)
    }
    if (node.type === 'sceneCard') {
      const names = asStringArray(node.data.sceneNames)
      const descs = asStringArray(node.data.sceneDescriptions)
      if (names.length || descs.length) {
        scenes.push(`【场景设定】\n场景名：${names.join('、')}\n场景描述：${descs.join('\n')}`)
      } else {
        const n = node.data.sceneName || ''; const d = node.data.sceneDescription || ''
        if (n || d) scenes.push(`【场景设定】\n场景名：${n}\n场景描述：${d}`)
      }
    }
    if (node.type === 'itemCard') {
      const names = asStringArray(node.data.itemNames)
      const descs = asStringArray(node.data.itemDescriptions)
      if (names.length || descs.length) {
        items.push(`【物品设定】\n物品名：${names.join('、')}\n物品描述：${descs.join('\n')}`)
      } else {
        const n = node.data.itemName || ''; const d = node.data.itemDescription || ''
        if (n || d) items.push(`【物品设定】\n物品名：${n}\n物品描述：${d}`)
      }
    }
  }

  const parts: string[] = []
  if (scripts.length) parts.push(`【剧本/分镜】\n${scripts.join('\n\n')}`)
  if (prompts.length) parts.push(`【提示词】\n${prompts.join('\n\n')}`)
  if (characters.length) parts.push(characters.join('\n\n'))
  if (scenes.length) parts.push(scenes.join('\n\n'))
  if (items.length) parts.push(items.join('\n\n'))

  const activeStyleId = nodes.find(n => n.id === nodeId)?.data.activeStyleId as string | undefined
  if (activeStyleId) {
    const styles = useStyleStore.getState().styles
    const style = styles.find(s => s.id === activeStyleId)
    if (style?.stylePrompt) {
      parts.push(`【风格约束 - 严格遵循】\n${style.stylePrompt}`)
      useStyleStore.getState().incrementUsage(activeStyleId)
    }
  }

  return parts.join('\n\n')
}

export function collectNegativePrompt(
  nodeId: string,
  nodes: AppNode[],
  edges: AppEdge[]
): string {
  const negatives: string[] = []
  const upstream = findUpstream(nodeId, nodes, edges)

  for (const node of upstream) {
    if (node.type === 'characterCard') {
      const np = node.data.characterNegativePrompt as string | undefined
      if (np) negatives.push(np)
    }
  }

  const activeStyleId = nodes.find(n => n.id === nodeId)?.data.activeStyleId as string | undefined
  if (activeStyleId) {
    const styles = useStyleStore.getState().styles
    const style = styles.find(s => s.id === activeStyleId)
    if (style?.negativePrompt) {
      negatives.push(style.negativePrompt)
    }
  }

  return negatives.join(', ')
}

export function collectImageRefs(
  nodeId: string,
  nodes: AppNode[],
  edges: AppEdge[],
  excludeTypes?: string[]
): string[] {
  const refs = new Set<string>()
  const upstream = findUpstream(nodeId, nodes, edges)
  const skip = new Set(excludeTypes || [])

  for (const node of upstream) {
    if (skip.has(node.type || '')) continue
    if (node.type === 'assetInput' && node.data.assetId) {
      refs.add(node.data.assetId as string)
    }
    if (node.type === 'characterCard') {
      const single = node.data.characterRefImage as string | undefined
      if (single) refs.add(single)
      const multi = node.data.characterRefImages as string[] | undefined
      if (multi) multi.forEach(r => refs.add(r))
    }
    if (node.type === 'sceneCard') {
      if (node.data.sceneRefImage) refs.add(node.data.sceneRefImage as string)
      asStringArray(node.data.sceneRefImages).forEach((ref) => refs.add(ref))
    }
    if (node.type === 'itemCard') {
      if (node.data.itemRefImage) refs.add(node.data.itemRefImage as string)
      asStringArray(node.data.itemRefImages).forEach((ref) => refs.add(ref))
    }
  }

  const activeStyleId = nodes.find(n => n.id === nodeId)?.data.activeStyleId as string | undefined
  if (activeStyleId) {
    const styles = useStyleStore.getState().styles
    const style = styles.find(s => s.id === activeStyleId)
    if (style?.refImages) style.refImages.forEach(r => refs.add(r))
  }

  return Array.from(refs)
}

export function resolveImageRefs(imageRefs: string[]): string[] {
  const assets = useAssetStore.getState().assets
  const resolved: string[] = []
  for (const ref of imageRefs) {
    if (ref.startsWith('http://') || ref.startsWith('https://')) {
      resolved.push(ref)
      continue
    }
    const asset = assets.find(a => a.path === ref || a.id === ref)
    if (asset && (asset.path.startsWith('http://') || asset.path.startsWith('https://'))) {
      resolved.push(asset.path)
    }
  }
  return resolved
}

function extractFilePathFromNbcUrl(nbcUrl: string): string | null {
  try {
    const url = new URL(nbcUrl)
    const path = url.searchParams.get('path')
    return path ? decodeURIComponent(path) : null
  } catch { return null }
}

export async function convertRefToDataUri(ref: string): Promise<string> {
  if (ref.startsWith('http://') || ref.startsWith('https://')) {
    return ref
  }
  if (ref.startsWith('data:')) {
    return ref
  }
  if (ref.startsWith('nbc://')) {
    const filePath = extractFilePathFromNbcUrl(ref)
    if (filePath && (window as any).electronAPI?.readFile) {
      const result = await (window as any).electronAPI.readFile(filePath)
      if (result?.data && result?.mimeType) {
        return `data:${result.mimeType};base64,${result.data}`
      }
    }
  }
  if (ref.startsWith('blob:')) {
    try {
      const resp = await fetch(ref)
      const blob = await resp.blob()
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      return dataUri
    } catch { }
  }
  return ref
}

export function collectConsistencySeed(
  nodeId: string,
  nodes: AppNode[],
  edges: AppEdge[]
): number | undefined {
  const upstream = findUpstream(nodeId, nodes, edges)
  for (const node of upstream) {
    if (node.type === 'characterCard') {
      const seed = node.data.characterConsistencySeed as number | undefined
      if (seed) return seed
    }
  }
  return undefined
}
