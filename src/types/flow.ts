import type { Node, Edge } from 'reactflow'

export type NodeType =
  | 'assetInput'
  | 'characterCard'
  | 'sceneCard'
  | 'itemCard'
  | 'prompt'
  | 'script'
  | 'gptImage2'
  | 'seedance'
  | 'comfyUI'
  | 'banana'
  | 'output'

export interface NodeData {
  label: string
  _nodeId?: string
  _execStatus?: string
  _resultUrl?: string
  _resultUrls?: string[]
  _taskIds?: string[]
  _error?: string
  _localPath?: string
  _ossUrl?: string
  _saveErrors?: string
  batchCount?: number

  // Asset Input
  assetId?: string

  // Character Card
  characterName?: string
  characterAppearance?: string
  characterRefImage?: string
  characterCards?: string
  characterAssetId?: string

  // Scene Card
  sceneName?: string
  sceneDescription?: string
  sceneRefImage?: string
  sceneAssetId?: string

  // Item Card
  itemName?: string
  itemDescription?: string
  itemRefImage?: string
  itemAssetId?: string

  // Prompt
  promptText?: string

  // Script
  scriptText?: string

  // GPT Image 2
  gptImageAspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9' | '9:21' | '3:2' | '2:3' | '5:4' | '4:5' | '2:1' | '1:2' | '3:1' | '1:3'
  gptImageNumImages?: number
  gptImageQuality?: 'auto' | 'low' | 'medium' | 'high'
  gptImageUrls?: string

  // Seedance 2.0
  seedanceModelId?: 'doubao-seedance-2-0-260128' | 'doubao-seedance-2-0-fast-260128'
  seedanceMode?: 'text-to-video' | 'image-to-video-first' | 'image-to-video-firstlast' | 'multi-modal' | 'video-edit' | 'video-extend'
  seedanceResolution?: '480p' | '720p' | '1080p'
  seedanceRatio?: '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16'
  seedanceDuration?: number
  seedanceGenerateAudio?: boolean
  seedanceReturnLastFrame?: boolean
  seedanceServiceTier?: 'default' | 'flex'
  seedanceWebSearch?: boolean
  seedanceReferenceImageCount?: number
  seedanceReferenceVideoCount?: number
  seedanceReferenceAudioCount?: number

  // ComfyUI
  comfyWorkflow?: string
  comfyParams?: Record<string, unknown>

  // Banana
  bananaModel?: string
  bananaAspectRatio?: string
  bananaUrls?: string

  // Output
  outputSaveLocal?: boolean
  outputUploadOss?: boolean
  outputSyncFeishu?: boolean

  [key: string]: unknown
}

export type AppNode = Node<NodeData, NodeType>
export type AppEdge = Edge

export interface Workflow {
  id: string
  name: string
  nodes: AppNode[]
  edges: AppEdge[]
  createdAt: string
  updatedAt: string
}
