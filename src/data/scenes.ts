export interface Scene {
  id: string
  name: string
  nameEn: string
  description: string
  lighting: string
  mood: string
  tags: string[]
  refImage?: string
}

export const scenes: Scene[] = []
