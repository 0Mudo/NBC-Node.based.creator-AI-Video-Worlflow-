export type PromptCategory = 'style' | 'shot' | 'lighting' | 'character' | 'scene' | 'item'

export interface PromptTemplate {
  id: string
  name: string
  category: PromptCategory
  prompt: string
  negativePrompt?: string
  previewImage?: string
  tags: string[]
  usageCount: number
  rating?: number
  createdAt: string
}
