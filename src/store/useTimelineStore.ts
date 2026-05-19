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

export interface TimelineMediaItem {
  id: string
  kind: 'generated' | 'asset'
  type: 'image' | 'video'
  sourceUrl: string
  thumbnail?: string
  assetId?: string
  sourceNodeId?: string
  sourceTaskId?: string
  createdAt: number
  status: 'idle' | 'generating' | 'done' | 'failed'
  error?: string
}

export interface TimelineRow {
  id: string
  order: number
  title: string
  promptText: string
  duration: number
  promptNodeId?: string
  scriptNodeId?: string
  storyboardNodeId?: string
  imageNodeId?: string
  videoNodeId?: string
  lastEditedAt?: number
  spec: {
    characterIds: string[]
    sceneIds: string[]
    itemIds: string[]
    shotType: string
    transition: string
    dialogue?: string
    action?: string
    emotion?: string
  }
  imageBindings: TimelineMediaItem[]
  videoBindings: TimelineMediaItem[]
  activeImageId?: string
  activeVideoId?: string
  imageVariantCount: number
}

interface TimelineStore {
  rows: TimelineRow[]
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

  // Row ops
  addRow: (row?: Partial<TimelineRow>) => string
  updateRow: (rowId: string, updates: Partial<TimelineRow>) => void
  removeRow: (rowId: string) => void
  reorderRows: (fromIndex: number, toIndex: number) => void
  getRow: (rowId: string) => TimelineRow | undefined
  bindMediaToRow: (rowId: string, mediaType: 'image' | 'video', item: Omit<TimelineMediaItem, 'id' | 'createdAt'> & Partial<Pick<TimelineMediaItem, 'id' | 'createdAt'>>) => string
  removeMediaBinding: (rowId: string, mediaType: 'image' | 'video', itemId: string) => void
  setActiveMediaBinding: (rowId: string, mediaType: 'image' | 'video', itemId?: string) => void
  setRowGenerating: (rowId: string, mediaType: 'image' | 'video', generating: boolean, error?: string) => void

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

function createEmptyRow(order: number, overrides: Partial<TimelineRow> = {}): TimelineRow {
  return {
    id: overrides.id || `row_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    order,
    title: overrides.title || `分镜 ${order + 1}`,
    promptText: overrides.promptText || '',
    duration: overrides.duration || 5,
    promptNodeId: overrides.promptNodeId,
    scriptNodeId: overrides.scriptNodeId,
    storyboardNodeId: overrides.storyboardNodeId,
    imageNodeId: overrides.imageNodeId,
    videoNodeId: overrides.videoNodeId,
    lastEditedAt: overrides.lastEditedAt,
    spec: {
      characterIds: overrides.spec?.characterIds || [],
      sceneIds: overrides.spec?.sceneIds || [],
      itemIds: overrides.spec?.itemIds || [],
      shotType: overrides.spec?.shotType || '',
      transition: overrides.spec?.transition || '硬切',
      dialogue: overrides.spec?.dialogue,
      action: overrides.spec?.action,
      emotion: overrides.spec?.emotion,
    },
    imageBindings: overrides.imageBindings || [],
    videoBindings: overrides.videoBindings || [],
    activeImageId: overrides.activeImageId,
    activeVideoId: overrides.activeVideoId,
    imageVariantCount: Math.min(4, Math.max(1, overrides.imageVariantCount || 1)),
  }
}

function ensureRowOrders(rows: TimelineRow[]): TimelineRow[] {
  return rows
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((row, index) => ({ ...row, order: index }))
}

function buildTracksFromRows(rows: TimelineRow[]): Track[] {
  const defaults = createDefaultTracks()
  const videoTrack = defaults[0]
  const subtitleTrack = defaults[3]
  videoTrack.clips = []
  subtitleTrack.clips = []

  let currentTime = 0
  for (const row of ensureRowOrders(rows)) {
    const activeImage = row.imageBindings.find((item) => item.id === row.activeImageId)
    const activeVideo = row.videoBindings.find((item) => item.id === row.activeVideoId)
    const activeMedia = activeVideo || activeImage
    const sourceType = activeVideo
      ? 'video'
      : activeImage
        ? 'image'
        : 'text'

    videoTrack.clips.push({
      id: `clip_row_${row.id}`,
      trackId: videoTrack.id,
      label: row.title,
      startTime: currentTime,
      duration: row.duration,
      sourceUrl: activeMedia?.sourceUrl || '',
      sourceType,
      thumbnail: activeMedia?.thumbnail,
      status: activeMedia
        ? (activeMedia.status === 'failed' ? 'failed' : activeMedia.status === 'generating' ? 'generating' : 'done')
        : 'empty',
      spec: {
        characterIds: row.spec.characterIds,
        sceneId: row.spec.sceneIds[0] || '',
        shotType: row.spec.shotType,
        transition: row.spec.transition,
        dialogue: row.spec.dialogue,
        action: row.spec.action,
        emotion: row.spec.emotion,
      },
      genNodeId: row.videoNodeId || row.imageNodeId,
      opacity: 1,
      volume: 1,
    })

    if (row.spec.dialogue) {
      subtitleTrack.clips.push({
        id: `clip_dialogue_row_${row.id}`,
        trackId: subtitleTrack.id,
        label: row.spec.dialogue,
        startTime: currentTime,
        duration: row.duration,
        sourceUrl: '',
        sourceType: 'text',
        status: 'done',
        spec: {
          characterIds: row.spec.characterIds,
          sceneId: row.spec.sceneIds[0] || '',
          shotType: row.spec.shotType,
          transition: row.spec.transition,
          dialogue: row.spec.dialogue,
          action: row.spec.action,
          emotion: row.spec.emotion,
        },
        opacity: 1,
        volume: 1,
      })
    }

    currentTime += row.duration
  }

  return [videoTrack, defaults[1], defaults[2], subtitleTrack]
}

function migrateLegacyData(raw: any): { rows: TimelineRow[]; tracks: Track[]; playheadTime: number } {
  const legacySlots: TimelineSlot[] = raw.slots || []
  const legacyClips: GeneratedClip[] = raw.clips || []

  if (legacySlots.length === 0 && legacyClips.length === 0) {
    const rows: TimelineRow[] = []
    return { rows, tracks: buildTracksFromRows(rows), playheadTime: 0 }
  }

  const rows = legacySlots
    .sort((a, b) => a.order - b.order)
    .map((slot, index) => {
      const matchedClip = legacyClips.find(c => c.id === slot.filledClipId)
      const imageBindings: TimelineMediaItem[] = []
      const videoBindings: TimelineMediaItem[] = []

      if (matchedClip) {
        const item: TimelineMediaItem = {
          id: `binding_${slot.id}_${matchedClip.id}`,
          kind: 'generated',
          type: matchedClip.type,
          sourceUrl: matchedClip.url,
          thumbnail: matchedClip.thumbnail,
          sourceNodeId: matchedClip.nodeId,
          createdAt: matchedClip.createdAt,
          status: 'done',
        }
        if (matchedClip.type === 'video') videoBindings.push(item)
        else imageBindings.push(item)
      }

      return createEmptyRow(index, {
        id: slot.id,
        title: slot.label,
        promptText: slot.label,
        duration: slot.spec.duration,
        imageNodeId: matchedClip?.type === 'image' ? matchedClip.nodeId : undefined,
        videoNodeId: matchedClip?.type === 'video' ? matchedClip.nodeId : undefined,
        spec: {
          characterIds: slot.spec.characterIds || [],
          sceneIds: slot.spec.sceneId ? [slot.spec.sceneId] : [],
          itemIds: [],
          shotType: slot.spec.shotType || '',
          transition: slot.spec.transition || '硬切',
          dialogue: slot.spec.dialogue,
          action: slot.spec.action,
          emotion: slot.spec.emotion,
        },
        imageBindings,
        videoBindings,
        activeImageId: imageBindings[0]?.id,
        activeVideoId: videoBindings[0]?.id,
      })
    })

  return {
    rows,
    tracks: buildTracksFromRows(rows),
    playheadTime: 0,
  }
}

const STORAGE_KEY_PREFIX = 'nbc_timeline_v2_'

function autoSave(rows: TimelineRow[], tracks: Track[], playheadTime: number) {
  const projectId = useProjectStore.getState().activeProjectId
  if (projectId) {
    safeSetItem(`${STORAGE_KEY_PREFIX}${projectId}`, JSON.stringify({ rows, tracks, playheadTime }))
  }
}

function loadSaved(): { rows: TimelineRow[]; tracks: Track[]; playheadTime: number } {
  const projectId = useProjectStore.getState().activeProjectId
  if (projectId) {
    const raw = safeGetItem(`${STORAGE_KEY_PREFIX}${projectId}`)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        const rows: TimelineRow[] = Array.isArray(parsed.rows)
          ? ensureRowOrders(parsed.rows.map((row: TimelineRow, index: number) => createEmptyRow(index, row)))
          : []
        return {
          rows,
          tracks: buildTracksFromRows(rows),
          playheadTime: parsed.playheadTime || 0,
        }
      } catch {}
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
  return { rows: [], tracks: buildTracksFromRows([]), playheadTime: 0 }
}

function findClip(tracks: Track[], clipId: string): TrackClip | undefined {
  for (const t of tracks) {
    const c = t.clips.find(cl => cl.id === clipId)
    if (c) return c
  }
  return undefined
}

function persistRows(setter: (rows: TimelineRow[]) => TimelineRow[], playheadTime: number): { rows: TimelineRow[]; tracks: Track[] } {
  const rows = ensureRowOrders(setter(useTimelineStore.getState().rows))
  const tracks = buildTracksFromRows(rows)
  autoSave(rows, tracks, playheadTime)
  return { rows, tracks }
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
    autoSave(get().rows, tracks, get().playheadTime)
  },

  removeTrack: (trackId) => {
    const tracks = get().tracks
      .filter(t => t.id !== trackId)
      .map((t, i) => ({ ...t, index: i }))
    set({ tracks })
    autoSave(get().rows, tracks, get().playheadTime)
  },

  reorderTrack: (fromIdx, toIdx) => {
    const tracks = [...get().tracks]
    const [moved] = tracks.splice(fromIdx, 1)
    tracks.splice(toIdx, 0, moved)
    const reordered = tracks.map((t, i) => ({ ...t, index: i }))
    set({ tracks: reordered })
    autoSave(get().rows, reordered, get().playheadTime)
  },

  updateTrack: (trackId, updates) => {
    const tracks = get().tracks.map(t =>
      t.id === trackId ? { ...t, ...updates } : t
    )
    set({ tracks })
    autoSave(get().rows, tracks, get().playheadTime)
  },

  addClip: (trackId, clip) => {
    const parsedRow = createEmptyRow(get().rows.length, {
      title: clip.label,
      promptText: clip.label,
      duration: clip.duration,
      spec: {
        characterIds: clip.spec?.characterIds || [],
        sceneIds: clip.spec?.sceneId ? [clip.spec.sceneId] : [],
        itemIds: [],
        shotType: clip.spec?.shotType || '',
        transition: clip.spec?.transition || '硬切',
        dialogue: clip.spec?.dialogue,
        action: clip.spec?.action,
        emotion: clip.spec?.emotion,
      },
    })

    if (clip.sourceUrl && (clip.sourceType === 'image' || clip.sourceType === 'video')) {
      const mediaId = `binding_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      const item: TimelineMediaItem = {
        id: mediaId,
        kind: 'asset',
        type: clip.sourceType,
        sourceUrl: clip.sourceUrl,
        thumbnail: clip.thumbnail,
        createdAt: Date.now(),
        status: clip.status === 'failed' ? 'failed' : clip.status === 'generating' ? 'generating' : 'done',
      }
      if (clip.sourceType === 'image') {
        parsedRow.imageBindings = [item]
        parsedRow.activeImageId = mediaId
      } else {
        parsedRow.videoBindings = [item]
        parsedRow.activeVideoId = mediaId
      }
    }

    const next = persistRows((rows) => [...rows, parsedRow], get().playheadTime)
    set(next)
    return `clip_row_${parsedRow.id}`
  },

  updateClip: (clipId, updates) => {
    const rowId = clipId.startsWith('clip_row_') ? clipId.replace('clip_row_', '') : undefined
    if (!rowId) return
    const next = persistRows((rows) => rows.map((row) => {
      if (row.id !== rowId) return row
      const imageBindings = row.imageBindings.map((item) =>
        item.id === row.activeImageId
          ? {
              ...item,
              sourceUrl: updates.sourceUrl ?? item.sourceUrl,
              thumbnail: updates.thumbnail ?? item.thumbnail,
              status: updates.status === 'empty' ? 'idle' : (updates.status as TimelineMediaItem['status']) || item.status,
            }
          : item
      )
      const videoBindings = row.videoBindings.map((item) =>
        item.id === row.activeVideoId
          ? {
              ...item,
              sourceUrl: updates.sourceUrl ?? item.sourceUrl,
              thumbnail: updates.thumbnail ?? item.thumbnail,
              status: updates.status === 'empty' ? 'idle' : (updates.status as TimelineMediaItem['status']) || item.status,
            }
          : item
      )
      return {
        ...row,
        title: updates.label ?? row.title,
        promptText: updates.label ?? row.promptText,
        duration: updates.duration ?? row.duration,
        spec: {
          ...row.spec,
          characterIds: updates.spec?.characterIds || row.spec.characterIds,
          sceneIds: updates.spec?.sceneId ? [updates.spec.sceneId] : row.spec.sceneIds,
          shotType: updates.spec?.shotType ?? row.spec.shotType,
          transition: updates.spec?.transition ?? row.spec.transition,
          dialogue: updates.spec?.dialogue ?? row.spec.dialogue,
          action: updates.spec?.action ?? row.spec.action,
          emotion: updates.spec?.emotion ?? row.spec.emotion,
        },
        imageBindings,
        videoBindings,
      }
    }), get().playheadTime)
    set(next)
  },

  removeClip: (clipId) => {
    const rowId = clipId.startsWith('clip_row_') ? clipId.replace('clip_row_', '') : undefined
    if (!rowId) return
    const next = persistRows((rows) => rows.filter((row) => row.id !== rowId), get().playheadTime)
    set(next)
  },

  moveClip: () => {},

  importClipsFromScript: (scriptText) => {
    const lines = scriptText.split('\n').filter(l => l.trim())

    const assets = useAssetStore.getState().assets
    const charAssets = assets.filter(a => a.type === 'text' && a.tags.includes('Character'))
    const sceneAssets = assets.filter(a => a.type === 'text' && a.tags.includes('Scene'))
    const itemAssets = assets.filter(a => a.type === 'text' && a.tags.includes('Item'))

    const importedRows: TimelineRow[] = []

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

      const matchedItemIds = itemAssets
        .filter((item) => item.name && parsed.label.includes(item.name))
        .map((item) => item.id)

      importedRows.push(createEmptyRow(get().rows.length + i, {
        title: parsed.label,
        promptText: parsed.label,
        duration: parsed.duration,
        spec: {
          characterIds: Array.from(matchedCharIds),
          sceneIds: finalSceneId ? [finalSceneId] : [],
          itemIds: matchedItemIds,
          shotType: parsed.shotType,
          transition: parsed.transition,
          dialogue: parsed.dialogue,
          action: parsed.label,
        },
      }))
    }

    const next = persistRows((rows) => [...rows, ...importedRows], get().playheadTime)
    set(next)

    emitNBCEvent('timeline:import', useProjectStore.getState().activeProjectId || undefined, {
      summary: `导入了 ${importedRows.length} 个分镜片段`,
    })
  },

  addRow: (row) => {
    const newRow = createEmptyRow(get().rows.length, row)
    const next = persistRows((rows) => [...rows, newRow], get().playheadTime)
    set(next)
    return newRow.id
  },

  updateRow: (rowId, updates) => {
    const next = persistRows((rows) => rows.map((row) => {
      if (row.id !== rowId) return row
      return createEmptyRow(row.order, {
        ...row,
        ...updates,
        id: row.id,
        spec: {
          ...row.spec,
          ...updates.spec,
          characterIds: updates.spec?.characterIds || row.spec.characterIds,
          sceneIds: updates.spec?.sceneIds || row.spec.sceneIds,
          itemIds: updates.spec?.itemIds || row.spec.itemIds,
        },
        imageBindings: updates.imageBindings || row.imageBindings,
        videoBindings: updates.videoBindings || row.videoBindings,
      })
    }), get().playheadTime)
    set(next)
  },

  removeRow: (rowId) => {
    const next = persistRows((rows) => rows.filter((row) => row.id !== rowId), get().playheadTime)
    set(next)
  },

  reorderRows: (fromIndex, toIndex) => {
    const next = persistRows((rows) => {
      const copied = rows.slice()
      const [moved] = copied.splice(fromIndex, 1)
      if (!moved) return rows
      copied.splice(toIndex, 0, moved)
      return copied
    }, get().playheadTime)
    set(next)
  },

  getRow: (rowId) => get().rows.find((row) => row.id === rowId),

  bindMediaToRow: (rowId, mediaType, item) => {
    const mediaId = item.id || `binding_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const binding: TimelineMediaItem = {
      ...item,
      id: mediaId,
      createdAt: item.createdAt || Date.now(),
    }
    const next = persistRows((rows) => rows.map((row) => {
      if (row.id !== rowId) return row
      if (mediaType === 'image') {
        const bindings = [...row.imageBindings.filter((existing) => existing.id !== mediaId), binding].slice(0, 4)
        return { ...row, imageBindings: bindings, activeImageId: mediaId }
      }
      const bindings = [...row.videoBindings.filter((existing) => existing.id !== mediaId), binding]
      return { ...row, videoBindings: bindings, activeVideoId: mediaId }
    }), get().playheadTime)
    set(next)
    return mediaId
  },

  removeMediaBinding: (rowId, mediaType, itemId) => {
    const next = persistRows((rows) => rows.map((row) => {
      if (row.id !== rowId) return row
      if (mediaType === 'image') {
        const bindings = row.imageBindings.filter((item) => item.id !== itemId)
        return { ...row, imageBindings: bindings, activeImageId: row.activeImageId === itemId ? bindings[0]?.id : row.activeImageId }
      }
      const bindings = row.videoBindings.filter((item) => item.id !== itemId)
      return { ...row, videoBindings: bindings, activeVideoId: row.activeVideoId === itemId ? bindings[0]?.id : row.activeVideoId }
    }), get().playheadTime)
    set(next)
  },

  setActiveMediaBinding: (rowId, mediaType, itemId) => {
    const next = persistRows((rows) => rows.map((row) => {
      if (row.id !== rowId) return row
      return mediaType === 'image'
        ? { ...row, activeImageId: itemId }
        : { ...row, activeVideoId: itemId }
    }), get().playheadTime)
    set(next)
  },

  setRowGenerating: (rowId, mediaType, generating, error) => {
    const next = persistRows((rows) => rows.map((row) => {
      if (row.id !== rowId) return row
      const nextStatus: TimelineMediaItem['status'] = generating ? 'generating' : error ? 'failed' : 'done'
      const updateBinding = (item: TimelineMediaItem): TimelineMediaItem => ({
        ...item,
        status: nextStatus,
        error,
      })
      if (mediaType === 'image' && row.activeImageId) {
        return {
          ...row,
          imageBindings: row.imageBindings.map((item) => item.id === row.activeImageId ? updateBinding(item) : item),
        }
      }
      if (mediaType === 'video' && row.activeVideoId) {
        return {
          ...row,
          videoBindings: row.videoBindings.map((item) => item.id === row.activeVideoId ? updateBinding(item) : item),
        }
      }
      return row
    }), get().playheadTime)
    set(next)
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
    const rowId = (clip as Omit<GeneratedClip, 'id' | 'createdAt'> & { rowId?: string }).rowId
    if (rowId) {
      const mediaId = get().bindMediaToRow(rowId, clip.type, {
        kind: 'generated',
        type: clip.type,
        sourceUrl: clip.url,
        thumbnail: clip.thumbnail,
        sourceNodeId: clip.nodeId,
        status: 'done',
      })
      get().setActiveMediaBinding(rowId, clip.type, mediaId)
      return
    }

    const row = createEmptyRow(get().rows.length, {
      title: clip.nodeLabel,
      promptText: clip.nodeLabel,
      duration: 5,
    })
    const binding: TimelineMediaItem = {
      id: `binding_${row.id}`,
      kind: 'generated',
      type: clip.type,
      sourceUrl: clip.url,
      thumbnail: clip.thumbnail,
      sourceNodeId: clip.nodeId,
      createdAt: Date.now(),
      status: 'done',
    }
    if (clip.type === 'image') {
      row.imageBindings = [binding]
      row.activeImageId = binding.id
      row.imageNodeId = clip.nodeId
    } else {
      row.videoBindings = [binding]
      row.activeVideoId = binding.id
      row.videoNodeId = clip.nodeId
    }
    const next = persistRows((rows) => [...rows, row], get().playheadTime)
    set(next)
  },
}))
