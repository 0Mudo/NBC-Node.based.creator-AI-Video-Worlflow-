import { create } from 'zustand'
import { useProjectStore } from './useProjectStore'
import { characters } from '@/data/characters'
import { scenes } from '@/data/scenes'
import { emitNBCEvent } from '@/utils/nbcEvents'
import { useAssetStore } from './useAssetStore'

export interface TimelineSlot {
  id: string
  order: number
  label: string
  spec: {
    characterIds: string[]
    sceneId: string
    duration: number
    shotType: string
    transition: string
  }
  filledClipId: string | null
  sourceNodeId?: string
}

export interface GeneratedClip {
  id: string
  nodeId: string
  nodeLabel: string
  type: 'image' | 'video'
  url: string
  thumbnail?: string
  createdAt: number
}

interface TimelineStore {
  slots: TimelineSlot[]
  clips: GeneratedClip[]

  addSlot: (slot: Omit<TimelineSlot, 'id' | 'filledClipId'>) => void
  updateSlot: (id: string, updates: Partial<TimelineSlot>) => void
  removeSlot: (id: string) => void
  reorderSlots: (fromIndex: number, toIndex: number) => void
  fillSlot: (slotId: string, clipId: string) => void
  clearSlot: (slotId: string) => void
  importSlotsFromScript: (scriptText: string) => void

  addClip: (clip: Omit<GeneratedClip, 'id' | 'createdAt'>) => void
  removeClip: (id: string) => void

  getUnfilledSlots: () => TimelineSlot[]
  getSlotByClipId: (clipId: string) => TimelineSlot | undefined
  getTotalDuration: () => number
}

const SHOT_TYPES = ['全景', '中景', '近景', '特写', '远景', '大远景', '中近景', '大特写']
const TRANSITIONS = ['硬切', '淡入淡出', '叠化', '擦除', '滑入', '缩放']

function parseLine(text: string): { label: string; shotType: string; duration: number; transition: string; characterIds: string[]; sceneId: string } {
  const cleaned = text.replace(/^镜头\s*\d+[：:.\-]\s*/, '').replace(/^\d+[.、）)]\s*/, '')
  let shotType = ''
  let duration = 5
  let transition = '硬切'
  let sceneId = ''
  const characterIds: string[] = []

  for (const st of SHOT_TYPES) {
    if (cleaned.includes(st)) { shotType = st; break }
  }

  const durationMatch = cleaned.match(/(\d+)\s*(?:秒|s|sec)/i)
  if (durationMatch) { duration = Math.min(60, Math.max(1, parseInt(durationMatch[1]))) }

  for (const tr of TRANSITIONS) {
    if (cleaned.includes(tr)) { transition = tr; break }
  }

  for (const char of characters) {
    if (cleaned.includes(char.name) || cleaned.includes(char.nameEn)) {
      characterIds.push(char.id)
    }
  }

  for (const scene of scenes) {
    if (cleaned.includes(scene.name) || cleaned.includes(scene.nameEn)) {
      sceneId = scene.id
      break
    }
  }

  const label = cleaned
    .replace(/\d+\s*(?:秒|s|sec)/gi, '')
    .replace(new RegExp(SHOT_TYPES.join('|'), 'g'), '')
    .replace(new RegExp(TRANSITIONS.join('|'), 'g'), '')
    .replace(/[·・\-—_]+/g, '·')
    .replace(/^[·\s]+|[·\s]+$/g, '')
    .trim()
    .slice(0, 60) || text.trim().slice(0, 60)

  return { label, shotType, duration, transition, characterIds, sceneId }
}

function autoSave(slots: TimelineSlot[], clips: GeneratedClip[]) {
  try {
    const projectId = useProjectStore.getState().activeProjectId
    if (projectId) {
      localStorage.setItem(`nbc_timeline_${projectId}`, JSON.stringify({ slots, clips }))
    }
  } catch {}
}

function loadSaved(): { slots: TimelineSlot[]; clips: GeneratedClip[] } {
  try {
    const projectId = useProjectStore.getState().activeProjectId
    if (projectId) {
      const raw = localStorage.getItem(`nbc_timeline_${projectId}`)
      if (raw) return JSON.parse(raw)
    }
  } catch {}
  return { slots: [], clips: [] }
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  slots: [],
  clips: [],

  addSlot: (slot) => {
    const newSlot: TimelineSlot = {
      ...slot,
      id: `slot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      filledClipId: null,
    }
    const slots = [...get().slots, newSlot]
    set({ slots })
    autoSave(slots, get().clips)
    emitNBCEvent('timeline:shot:create', useProjectStore.getState().activeProjectId || undefined, {
      summary: `创建了时间线坑位「${slot.label}」(${slot.spec?.shotType || '未指定'}·${slot.spec?.duration || 5}秒)`,
    })
  },

  updateSlot: (id, updates) => {
    const slots = get().slots.map((s) => (s.id === id ? { ...s, ...updates } : s))
    set({ slots })
    autoSave(slots, get().clips)
  },

  removeSlot: (id) => {
    const old = get().slots.find((s) => s.id === id)
    const slots = get().slots.filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, order: i + 1 }))
    set({ slots })
    autoSave(slots, get().clips)
    if (old) {
      emitNBCEvent('timeline:shot:delete', useProjectStore.getState().activeProjectId || undefined, {
        summary: `删除了时间线坑位「${old.label}」(${old.spec?.shotType || '未指定'})`,
      })
    }
  },

  reorderSlots: (fromIndex, toIndex) => {
    const slots = [...get().slots]
    const [moved] = slots.splice(fromIndex, 1)
    slots.splice(toIndex, 0, moved)
    const reordered = slots.map((s, i) => ({ ...s, order: i + 1 }))
    set({ slots: reordered })
    autoSave(reordered, get().clips)
  },

  fillSlot: (slotId, clipId) => {
    const slot = get().slots.find((s) => s.id === slotId)
    const clip = get().clips.find((c) => c.id === clipId)
    const slots = get().slots.map((s) =>
      s.id === slotId ? { ...s, filledClipId: clipId } : s
    )
    set({ slots })
    autoSave(slots, get().clips)
    if (slot && clip) {
      emitNBCEvent('timeline:shot:fill', useProjectStore.getState().activeProjectId || undefined, {
        summary: `坑位「${slot.label}」填充了素材「${clip.nodeLabel}」(${clip.type})`,
        resultFile: clip.url,
      })
    }
  },

  clearSlot: (slotId) => {
    const slots = get().slots.map((s) =>
      s.id === slotId ? { ...s, filledClipId: null } : s
    )
    set({ slots })
    autoSave(slots, get().clips)
  },

  importSlotsFromScript: (scriptText) => {
    const lines = scriptText.split('\n').filter((l) => l.trim())
    const existingCount = get().slots.length
    
    // Auto-match from asset browser
    const assets = useAssetStore.getState().assets
    const charAssets = assets.filter(a => a.type === 'text' && a.tags.includes('Character'))
    const sceneAssets = assets.filter(a => a.type === 'text' && a.tags.includes('Scene'))
    
    const newSlots: TimelineSlot[] = lines.map((line, i) => {
      const parsed = parseLine(line.trim())
      
      // Enhance parsing by matching against AssetBrowser cards
      const matchedCharIds = new Set<string>(parsed.characterIds)
      charAssets.forEach(c => {
        if (parsed.label.includes(c.name)) matchedCharIds.add(c.id)
      })
      
      let finalSceneId = parsed.sceneId
      if (!finalSceneId) {
        const matchedScene = sceneAssets.find(s => parsed.label.includes(s.name))
        if (matchedScene) finalSceneId = matchedScene.id
      }

      return {
        id: `slot_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        order: existingCount + i + 1,
        label: parsed.label,
        spec: {
          characterIds: Array.from(matchedCharIds),
          sceneId: finalSceneId,
          duration: parsed.duration,
          shotType: parsed.shotType,
          transition: parsed.transition,
        },
        filledClipId: null,
      }
    })
    const slots = [...get().slots, ...newSlots]
    set({ slots })
    autoSave(slots, get().clips)
  },

  addClip: (clip) => {
    const newClip: GeneratedClip = {
      ...clip,
      id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    }
    const clips = [newClip, ...get().clips]
    set({ clips })
    autoSave(get().slots, clips)
  },

  removeClip: (id) => {
    const clips = get().clips.filter((c) => c.id !== id)
    const slots = get().slots.map((s) =>
      s.filledClipId === id ? { ...s, filledClipId: null } : s
    )
    set({ clips, slots })
    autoSave(slots, clips)
  },

  getUnfilledSlots: () => get().slots.filter((s) => !s.filledClipId),

  getSlotByClipId: (clipId) => get().slots.find((s) => s.filledClipId === clipId),

  getTotalDuration: () => get().slots.reduce((sum, s) => sum + s.spec.duration, 0),
}))
