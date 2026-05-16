export interface StylePreset {
  id: string
  name: string
  stylePrompt: string
  negativePrompt: string
  refImages: string[]
  seed?: number
  tags: string[]
  previewImage?: string
  usageCount: number
  createdAt: string
  rating?: number
}
