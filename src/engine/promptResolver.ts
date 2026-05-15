import type { AppNode, AppEdge } from '@/types/flow'
import { findUpstream } from './graph'

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
  return text
    .replace(/\{\{character\}\}/g, (charNode?.data.characterName as string) || '')
    .replace(/\{\{characterAppearance\}\}/g, (charNode?.data.characterAppearance as string) || '')
    .replace(/\{\{scene\}\}/g, (sceneNode?.data.sceneName as string) || '')
    .replace(/\{\{sceneDescription\}\}/g, (sceneNode?.data.sceneDescription as string) || '')
    .replace(/\{\{item\}\}/g, (itemNode?.data.itemName as string) || '')
    .replace(/\{\{itemDescription\}\}/g, (itemNode?.data.itemDescription as string) || '')
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

export function collectImageRefs(
  nodeId: string,
  nodes: AppNode[],
  edges: AppEdge[]
): string[] {
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
