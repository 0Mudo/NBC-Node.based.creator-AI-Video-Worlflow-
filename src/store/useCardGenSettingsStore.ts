import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CardGenProvider = 'banana' | 'gptImage2'

export interface CardGenSettings {
  provider: CardGenProvider
  model: string
  aspectRatio: string
  imageSize: string
  promptTemplate: string
  negativePrompt: string
}

export interface CardGenSettingsMap {
  character: CardGenSettings
  scene: CardGenSettings
  item: CardGenSettings
}

const CHARACTER_DEFAULTS: CardGenSettings = {
  provider: 'gptImage2',
  model: 'gpt-image-2-vip',
  aspectRatio: '4:3',
  imageSize: '1K',
  promptTemplate: `Professional complete character reference sheet on a clean grid layout against a pure white seamless background. The sheet includes: Full-body turnaround views (front, 3/4 angle, side, back), character identity and scale bar on the left (maximum height), 6-8 color palette swatches top right, 8-frame emotion progression, 5 micro-expressions, multi-angle head detail sheet, neutral standing pose, pose variations, 1 close-up detail, a bottom row of clothing and accessory close-up details (hair texture, coat fabric, shoes, accessories), multiple hand gesture references, character silhouette guide. All instances of the character maintain consistent facial and body proportions, perfect layout alignment.`,
  negativePrompt: `different character, inconsistent face, mismatched clothing, distorted anatomy, blurry, messy layout`,
}

const SCENE_DEFAULTS: CardGenSettings = {
  provider: 'banana',
  model: 'nano-banana-pro',
  aspectRatio: 'auto',
  imageSize: '4K',
  promptTemplate: `A seamless 360-degree equirectangular panorama, perfect for VR virtual tours. The scene depicts {SCENE_DESCRIPTION}. Shot from a human eye-level central perspective, with a full 360-degree horizontal field of view and 180-degree vertical field of view (including complete sky and ground). The left and right edges of the image match perfectly for seamless stitching, with no significant stretching distortion at the top and bottom poles. Photorealistic style, 8K resolution, rich details, natural colors, and realistic lighting.`,
  negativePrompt: `stitching artifacts, stretching distortion, blurriness, low resolution, repeated elements, unnatural perspective, missing sky or ground, deformed figures, twisted objects`,
}

const ITEM_DEFAULTS: CardGenSettings = {
  provider: 'gptImage2',
  model: 'gpt-image-2',
  aspectRatio: '16:9',
  imageSize: '2K',
  promptTemplate: `Professional three-view orthographic drawing of an object, including front view, side view, and top view, arranged horizontally in the same image. The object is {OBJECT_DESCRIPTION}. All views use orthographic projection with no perspective distortion, perfectly consistent proportions, and accurate dimensions. Pure white background with no clutter. Soft, even studio lighting with no harsh shadows or reflections. Sharp, clean lines, rich details, and accurate colors. Perfect for 3D modeling reference.`,
  negativePrompt: `perspective distortion, inconsistent proportions, shadows, reflections, background clutter, blurriness, low resolution, repeated elements, unnecessary decorations, people, text`,
}

export const CARD_GEN_DEFAULTS: CardGenSettingsMap = {
  character: CHARACTER_DEFAULTS,
  scene: SCENE_DEFAULTS,
  item: ITEM_DEFAULTS,
}

interface CardGenSettingsStore {
  settings: CardGenSettingsMap
  updateCardGenSettings: (cardType: keyof CardGenSettingsMap, updates: Partial<CardGenSettings>) => void
  resetCardGenSettings: (cardType: keyof CardGenSettingsMap) => void
  getSettings: (cardType: keyof CardGenSettingsMap) => CardGenSettings
}

export const useCardGenSettingsStore = create<CardGenSettingsStore>()(
  persist(
    (set, get) => ({
      settings: { ...CARD_GEN_DEFAULTS },

      updateCardGenSettings: (cardType, updates) =>
        set((s) => ({
          settings: {
            ...s.settings,
            [cardType]: { ...s.settings[cardType], ...updates },
          },
        })),

      resetCardGenSettings: (cardType) =>
        set((s) => ({
          settings: {
            ...s.settings,
            [cardType]: { ...CARD_GEN_DEFAULTS[cardType] },
          },
        })),

      getSettings: (cardType) => get().settings[cardType] || CARD_GEN_DEFAULTS[cardType],
    }),
    {
      name: 'nbc_card_gen_settings',
      partialize: (s) => ({ settings: s.settings }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          for (const key of ['character', 'scene', 'item'] as const) {
            if (!state.settings[key]) {
              state.settings[key] = { ...CARD_GEN_DEFAULTS[key] }
            } else {
              state.settings[key] = { ...CARD_GEN_DEFAULTS[key], ...state.settings[key] }
            }
          }
        }
      },
    }
  )
)
