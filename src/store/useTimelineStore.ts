import { create } from 'zustand'
import { useProjectStore } from './useProjectStore'
import { characters } from '@/data/characters'
import { scenes } from '@/data/scenes'
import { emitNBCEvent } from '@/utils/nbcEvents'
import { useAssetStore } from './useAssetStore'
import { safeGetItem, safeSetItem } from '@/utils/safeStorage'

export type TrackType = 'video' | 'audio' | 'bgm' | 'subtitle' | 'custom'

export interface Track {
  id: string
  name: string
  type: TrackType
  index: number
  locked: boolean
  muted: boolean
  solo: boolean
  visible: boolean
  height: number
  clips: TrackClip[]
  color?: string
}

export interface TrackClip {
  id: string
  trackId: string
  label: string
  startTime: number
  duration: number
  sourceUrl: string
  sourceType: 'image' | 'video' | 'audio' | 'text'
  thumbnail?: string
  status: 'empty' | 'generating' | 'done' | 'failed'
  spec: {
    characterIds: string[]
    sceneId: string
    shotType: string
    transition: string
    dialogue?: string
    action?: string
    emotion?: string
  }
  genNodeId?: string
  opacity: number
  volume: number
  effectPreset?: string
}

// Legacy types kept for migration and backward compat
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
    dialogue?: string
    action?: string
    emotion?: string
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
  tracks: Track[]
  playheadTime: number
  zoomLevel: number

  // Track ops
  addTrack: (name: string, type: TrackType) => void
  removeTrack: (trackId: string) => void
  reorderTrack: (fromIdx: number, toIdx: number) => void
  updateTrack: (trackId: string, updates: Partial<Track>) => void

  // Clip ops
  addClip: (trackId: string, clip: Omit<TrackClip, 'id'>) => string
  updateClip: (clipId: string, updates: Partial<TrackClip>) => void
  removeClip: (clipId: string) => void
  moveClip: (clipId: string, newTrackId: string, newStartTime: number) => void

  // Bulk
  importClipsFromScript: (scriptText: string, targetTrackId?: string) => void

  // Query
  getClip: (clipId: string) => TrackClip | undefined
  getClipsAtTime: (time: number) => TrackClip[]
  getSnapPoints: () => number[]
  getTotalDuration: () => number

  // Playhead
  setPlayheadTime: (time: number) => void
  setZoomLevel: (level: number) => void

  // Legacy bridge (for backward compat during migration)
  addLegacyClip: (clip: Omit<GeneratedClip, 'id' | 'createdAt'>) => void
}

const SHOT_TYPES = ['全景', '中景', '近景', '特写', '远景', '大远景', '中近景', '大特写']
const TRANSITIONS = ['硬切', '淡入淡出', '叠化', '擦除', '滑入', '缩放']

function parseLine(text: string): { label: string; shotType: string; duration: number; transition: string; characterIds: string[]; sceneId: string; dialogue?: string } {
  const cleaned = text.replace(/^镜头\s*\d+[：:.\-]\s*/, '').replace(/^\d+[.、）)]\s*/, '')
  let shotType = ''
  let duration = 5
  let transition = '硬切'
  let sceneId = ''
  let dialogue: string | undefined
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

  const dialogueMatch = cleaned.match(/["""](.+?)[""」]/)
  if (dialogueMatch) dialogue = dialogueMatch[1]

  let label = cleaned
    .replace(/\d+\s*(?:秒|s|sec)/gi, '')
    .replace(new RegExp(SHOT_TYPES.join('|'), 'g'), '')
    .replace(new RegExp(TRANSITIONS.join('|'), 'g'), '')
    .replace(/["""].+?[""」]/g, '')
    .replace(/[·・\-—_]+/g, '·')
    .replace(/^[·\s]+|[·\s]+$/g, '')
    .trim()
    .slice(0, 60) || text.trim().slice(0, 60)

  return { label, shotType, duration, transition, characterIds, sceneId, dialogue }
}

function createDefaultTracks(): Track[] {
  return [
    { id: 'v1', name: '视频轨', type: 'video', index: 0, locked: false, muted: false, solo: false, visible: true, height: 80, clips: [], color: '#6c5ce7' },
    { id: 'a1', name: '对白轨', type: 'audio', index: 1, locked: false, muted: false, solo: false, visible: true, height: 40, clips: [], color: '#00b894' },
    { id: 'bgm1', name: 'BGM', type: 'bgm', index: 2, locked: false, muted: false, solo: false, visible: true, height: 40, clips: [], color: '#fdcb6e' },
    { id: 's1', name: '字幕轨', type: 'subtitle', index: 3, locked: false, muted: false, solo: false, visible: true, height: 30, clips: [], color: '#74b9ff' },
  ]
}

function migrateLegacyData(raw: any): { tracks: Track[]; playheadTime: number } {
  const legacySlots: TimelineSlot[] = raw.slots || []
  const legacyClips: GeneratedClip[] = raw.clips || []

  if (legacySlots.length === 0 && legacyClips.length === 0) {
    return { tracks: createDefaultTracks(), playheadTime: 0 }
  }

  const videoTrack = createDefaultTracks()[0]
  const subtitleTrack = createDefaultTracks()[3]
  videoTrack.clips = []
  subtitleTrack.clips = []

  let currentTime = 0
  for (const slot of legacySlots.sort((a, b) => a.order - b.order)) {
    const matchedClip = legacyClips.find(c => c.id === slot.filledClipId)
    const sourceType = matchedClip
      ? (matchedClip.type === 'video' ? 'video' as const : 'image' as const)
      : 'text' as const

    videoTrack.clips.push({
      id: `clip_${Date.now()}_${slot.order}_${Math.random().toString(36).slice(2, 6)}`,
      trackId: videoTrack.id,
      label: slot.label,
      startTime: currentTime,
      duration: slot.spec.duration,
      sourceUrl: matchedClip?.url || '',
      sourceType,
      thumbnail: matchedClip?.thumbnail,
      status: matchedClip ? 'done' : 'empty',
      spec: {
        characterIds: slot.spec.characterIds || [],
        sceneId: slot.spec.sceneId || '',
        shotType: slot.spec.shotType || '',
        transition: slot.spec.transition || '硬切',
        dialogue: slot.spec.dialogue,
        action: slot.spec.action,
        emotion: slot.spec.emotion,
      },
      genNodeId: slot.sourceNodeId,
      opacity: 1,
      volume: 1,
    })

    if (slot.spec.dialogue) {
      subtitleTrack.clips.push({
        id: `clip_dialogue_${Date.now()}_${slot.order}`,
        trackId: subtitleTrack.id,
        label: slot.spec.dialogue,
        startTime: currentTime,
        duration: slot.spec.duration,
        sourceUrl: '',
        sourceType: 'text',
        status: 'done',
        spec: { ...videoTrack.clips[videoTrack.clips.length - 1].spec },
        opacity: 1,
        volume: 1,
      })
    }

    currentTime += slot.spec.duration
  }

  return {
    tracks: [videoTrack, createDefaultTracks()[1], createDefaultTracks()[2], subtitleTrack],
    playheadTime: 0,
  }
}

const STORAGE_KEY_PREFIX = 'nbc_timeline_v2_'

function autoSave(tracks: Track[], playheadTime: number) {
  const projectId = useProjectStore.getState().activeProjectId
  if (projectId) {
    safeSetItem(`${STORAGE_KEY_PREFIX}${projectId}`, JSON.stringify({ tracks, playheadTime }))
  }
}

function loadSaved(): { tracks: Track[]; playheadTime: number } {
  const projectId = useProjectStore.getState().activeProjectId
  if (projectId) {
    const raw = safeGetItem(`${STORAGE_KEY_PREFIX}${projectId}`)
    if (raw) {
      try { return JSON.parse(raw) } catch {}
    }
    // Try legacy migration
    const legacyRaw = safeGetItem(`nbc_timeline_${projectId}`)
    if (legacyRaw) {
      try {
        const legacy = JSON.parse(legacyRaw)
        const migrated = migrateLegacyData(legacy)
        safeSetItem(`${STORAGE_KEY_PREFIX}${projectId}`, JSON.stringify(migrated))
        return migrated
      } catch {}
    }
  }
  return { tracks: createDefaultTracks(), playheadTime: 0 }
}

function findClip(tracks: Track[], clipId: string): TrackClip | undefined {
  for (const t of tracks) {
    const c = t.clips.find(cl => cl.id === clipId)
    if (c) return c
  }
  return undefined
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  ...loadSaved(),
  zoomLevel: 20,

  addTrack: (name, type) => {
    const tracks = [...get().tracks]
    const id = `track_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
    const newTrack: Track = {
      id, name, type, index: tracks.length,
      locked: false, muted: false, solo: false, visible: true,
      height: type === 'video' ? 80 : type === 'subtitle' ? 30 : 40,
      clips: [],
      color: type === 'video' ? '#a29bfe' : type === 'audio' ? '#fd79a8' : type === 'bgm' ? '#ffeaa7' : '#81ecec',
    }
    tracks.push(newTrack)
    set({ tracks })
    autoSave(tracks, get().playheadTime)
  },

  removeTrack: (trackId) => {
    const tracks = get().tracks
      .filter(t => t.id !== trackId)
      .map((t, i) => ({ ...t, index: i }))
    set({ tracks })
    autoSave(tracks, get().playheadTime)
  },

  reorderTrack: (fromIdx, toIdx) => {
    const tracks = [...get().tracks]
    const [moved] = tracks.splice(fromIdx, 1)
    tracks.splice(toIdx, 0, moved)
    const reordered = tracks.map((t, i) => ({ ...t, index: i }))
    set({ tracks: reordered })
    autoSave(reordered, get().playheadTime)
  },

  updateTrack: (trackId, updates) => {
    const tracks = get().tracks.map(t =>
      t.id === trackId ? { ...t, ...updates } : t
    )
    set({ tracks })
    autoSave(tracks, get().playheadTime)
  },

  addClip: (trackId, clip) => {
    const id = `clip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const newClip: TrackClip = { ...clip, id, spec: clip.spec || { characterIds: [], sceneId: '', shotType: '', transition: '硬切' } }
    const tracks = get().tracks.map(t =>
      t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t
    )
    set({ tracks })
    autoSave(tracks, get().playheadTime)
    return id
  },

  updateClip: (clipId, updates) => {
    const tracks = get().tracks.map(t => ({
      ...t,
      clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c)
    }))
    set({ tracks })
    autoSave(tracks, get().playheadTime)
  },

  removeClip: (clipId) => {
    const tracks = get().tracks.map(t => ({
      ...t,
      clips: t.clips.filter(c => c.id !== clipId)
    }))
    set({ tracks })
    autoSave(tracks, get().playheadTime)
  },

  moveClip: (clipId, newTrackId, newStartTime) => {
    const clip = findClip(get().tracks, clipId)
    if (!clip) return
    const tracks = get().tracks.map(t => {
      if (t.id === clip.trackId) {
        return { ...t, clips: t.clips.filter(c => c.id !== clipId) }
      }
      if (t.id === newTrackId) {
        return { ...t, clips: [...t.clips, { ...clip, trackId: newTrackId, startTime: newStartTime }] }
      }
      return t
    })
    set({ tracks })
    autoSave(tracks, get().playheadTime)
  },

  importClipsFromScript: (scriptText, targetTrackId) => {
    const lines = scriptText.split('\n').filter(l => l.trim())
    const tracks = get().tracks
    const videoTrack = targetTrackId
      ? tracks.find(t => t.id === targetTrackId)
      : tracks.find(t => t.type === 'video') || tracks[0]
    const subtitleTrack = tracks.find(t => t.type === 'subtitle')
    if (!videoTrack) return

    const assets = useAssetStore.getState().assets
    const charAssets = assets.filter(a => a.type === 'text' && a.tags.includes('Character'))
    const sceneAssets = assets.filter(a => a.type === 'text' && a.tags.includes('Scene'))

    // Calculate start time after last clip on video track
    const lastClip = videoTrack.clips[videoTrack.clips.length - 1]
    let currentTime = lastClip ? lastClip.startTime + lastClip.duration : 0

    const newClips: TrackClip[] = []
    const newSubtitleClips: TrackClip[] = []

    for (let i = 0; i < lines.length; i++) {
      const parsed = parseLine(lines[i].trim())

      const matchedCharIds = new Set<string>(parsed.characterIds)
      charAssets.forEach(c => {
        if (parsed.label.includes(c.name)) matchedCharIds.add(c.id)
      })

      let finalSceneId = parsed.sceneId
      if (!finalSceneId) {
        const matchedScene = sceneAssets.find(s => parsed.label.includes(s.name))
        if (matchedScene) finalSceneId = matchedScene.id
      }

      newClips.push({
        id: `clip_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        trackId: videoTrack.id,
        label: parsed.label,
        startTime: currentTime,
        duration: parsed.duration,
        sourceUrl: '',
        sourceType: 'text',
        status: 'empty',
        spec: {
          characterIds: Array.from(matchedCharIds),
          sceneId: finalSceneId,
          shotType: parsed.shotType,
          transition: parsed.transition,
          dialogue: parsed.dialogue,
        },
        opacity: 1,
        volume: 1,
      })

      if (parsed.dialogue && subtitleTrack) {
        newSubtitleClips.push({
          id: `clip_dialogue_${Date.now()}_${i}`,
          trackId: subtitleTrack.id,
          label: parsed.dialogue,
          startTime: currentTime,
          duration: parsed.duration,
          sourceUrl: '',
          sourceType: 'text',
          status: 'done',
          spec: {
            characterIds: Array.from(matchedCharIds),
            sceneId: finalSceneId,
            shotType: parsed.shotType,
            transition: parsed.transition,
            dialogue: parsed.dialogue,
          },
          opacity: 1,
          volume: 1,
        })
      }

      currentTime += parsed.duration
    }

    const updatedTracks = tracks.map(t => {
      if (t.id === videoTrack.id) {
        return { ...t, clips: [...t.clips, ...newClips] }
      }
      if (t.id === subtitleTrack?.id) {
        return { ...t, clips: [...t.clips, ...newSubtitleClips] }
      }
      return t
    })

    set({ tracks: updatedTracks })
    autoSave(updatedTracks, get().playheadTime)

    emitNBCEvent('timeline:import', useProjectStore.getState().activeProjectId || undefined, {
      summary: `导入了 ${newClips.length} 个分镜片段`,
    })
  },

  getClip: (clipId) => findClip(get().tracks, clipId),

  getClipsAtTime: (time) => {
    const result: TrackClip[] = []
    for (const t of get().tracks) {
      for (const c of t.clips) {
        if (c.startTime <= time && c.startTime + c.duration > time) {
          result.push(c)
        }
      }
    }
    return result
  },

  getSnapPoints: () => {
    const points = new Set<number>([0])
    for (const t of get().tracks) {
      for (const c of t.clips) {
        points.add(c.startTime)
        points.add(c.startTime + c.duration)
      }
    }
    return Array.from(points).sort((a, b) => a - b)
  },

  getTotalDuration: () => {
    let max = 0
    for (const t of get().tracks) {
      for (const c of t.clips) {
        const end = c.startTime + c.duration
        if (end > max) max = end
      }
    }
    return max
  },

  setPlayheadTime: (time) => set({ playheadTime: Math.max(0, time) }),
  setZoomLevel: (level) => set({ zoomLevel: Math.max(5, Math.min(100, level)) }),

  // Legacy bridge for execution engine compatibility
  addLegacyClip: (clip) => {
    const tracks = get().tracks
    const videoTrack = tracks.find(t => t.type === 'video') || tracks[0]
    if (!videoTrack) return

    const lastClip = videoTrack.clips[videoTrack.clips.length - 1]
    const startTime = lastClip ? lastClip.startTime + lastClip.duration : 0

    const newClip: TrackClip = {
      id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      trackId: videoTrack.id,
      label: clip.nodeLabel,
      startTime,
      duration: 5,
      sourceUrl: clip.url,
      sourceType: clip.type,
      thumbnail: clip.thumbnail,
      status: 'done',
      spec: { characterIds: [], sceneId: '', shotType: '', transition: '硬切' },
      genNodeId: clip.nodeId,
      opacity: 1,
      volume: 1,
    }

    const updatedTracks = tracks.map(t =>
      t.id === videoTrack.id
        ? { ...t, clips: [...t.clips, newClip] }
        : t
    )
    set({ tracks: updatedTracks })
    autoSave(updatedTracks, get().playheadTime)
  },
}))
