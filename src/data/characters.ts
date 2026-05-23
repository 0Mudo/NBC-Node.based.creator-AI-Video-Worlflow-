export interface CharacterTTSConfig {
  voiceId: string
  provider: 'volcano' | 'edge'
  speed: number
  pitch: number
}

export interface Character {
  id: string
  name: string
  nameEn: string
  appearance: string
  weapons: string
  role: string
  tags: string[]
  refImage?: string
  refImages?: string[]
  facePrompt?: string
  bodyPrompt?: string
  negativePrompt?: string
  consistencySeed?: number
  ttsConfig?: CharacterTTSConfig
}

export const characters: Character[] = []
