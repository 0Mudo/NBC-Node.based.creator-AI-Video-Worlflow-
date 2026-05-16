export interface ScriptDialogue {
  id: string
  characterName: string
  characterId?: string
  lineType: 'speech' | 'voiceover' | 'internal' | 'radio'
  content: string
}

export interface ScriptScene {
  id: string
  sceneNumber: number
  heading: string
  locationId?: string
  timeOfDay: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night' | 'midnight'
  mood: string
  estimatedDuration: number
  action: string
  dialogues: ScriptDialogue[]
}

export interface StoryboardShot {
  id: string
  shotNumber: number
  description: string
  shotType: string
  cameraMovement?: string
  duration: number
  transition: string
  characterIds: string[]
  sceneId?: string
  itemIds: string[]
  dialogue?: string
  generatedImageUrl?: string
  moodRef?: string
}

export interface EmotionPreset {
  name: string
  prompt: string
}

export interface ActionPreset {
  name: string
  prompt: string
}

export interface CharacterProfile {
  name: string
  alias: string
  gender: string
  age: number
  role: string
  facePrompt: string
  bodyPrompt: string
  negativePrompt: string
  consistencySeed?: number
  refImages: string[]
  emotionPresets: EmotionPreset[]
  actionPresets: ActionPreset[]
  ttsVoiceId?: string
  ttsSpeed?: number
  ttsPitch?: number
  backstory: string
}

export interface SceneProfile {
  name: string
  nameEn: string
  sceneType: string
  timeOfDay: string
  weather: string
  colorPalette: string
  mood: string
  lightingDescription: string
  spatialType: string
  keyElements: string[]
  recommendedStyleId?: string
  refImages: string[]
}

export interface ItemProfile {
  name: string
  nameEn: string
  itemType: string
  material: string
  color: string
  dimensions: string
  weight: string
  condition: string
  visualFeatures: string
  function: string
  refImages: string[]
}
