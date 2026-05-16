import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useProjectStore } from './useProjectStore'
import type { CharacterProfile, SceneProfile, ItemProfile, ScriptScene, StoryboardShot } from '@/types/inspiration'

export type InspirationCategory = 'script' | 'storyboard' | 'character' | 'scene' | 'item'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface ConversationSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
}

export interface VersionRecord {
  id: string
  timestamp: number
  content: string
  isAuto: boolean
}

export interface ItemData {
  id: string
  previousContent: string
  content: string
  versions: VersionRecord[]
  refImage?: string
  generatedImage?: string

  characterProfile?: CharacterProfile
  sceneProfile?: SceneProfile
  itemProfile?: ItemProfile
  scriptScenes?: ScriptScene[]
  storyboardShots?: StoryboardShot[]
}

interface InspirationState {
  activeCategory: InspirationCategory
  autoSaveInterval: number
  chatHistory: ChatMessage[]
  sessions: ConversationSession[]
  
  // Maps a compound key like `${projectId}_${category}` to an item ID
  activeItemIds: Record<string, string>
  items: Record<string, ItemData>
  
  // Legacy support
  categories?: Record<InspirationCategory, Omit<ItemData, 'id'>>

  setActiveCategory: (category: InspirationCategory) => void
  setActiveItem: (category: InspirationCategory, itemId: string, initialContent?: string) => void
  setAutoSaveInterval: (minutes: number) => void
  setContent: (category: InspirationCategory, content: string) => void
  setPreviousContent: (category: InspirationCategory, content: string) => void
  setImages: (category: InspirationCategory, refImage?: string, generatedImage?: string) => void
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  clearHistory: () => void
  newConversation: () => void
  switchConversation: (sessionId: string) => void
  deleteConversation: (sessionId: string) => void
  saveVersion: (category: InspirationCategory, isAuto?: boolean) => void
  restoreVersion: (category: InspirationCategory, versionId: string) => void
  deleteVersion: (category: InspirationCategory, versionId: string) => void
  onAIGenerate: (category: InspirationCategory, aiResult: string) => void
  
  // Helper to get current active data
  getActiveData: (category: InspirationCategory) => ItemData
  
  // Structured field setters
  setCharacterProfile: (profile: CharacterProfile) => void
  setSceneProfile: (profile: SceneProfile) => void
  setItemProfile: (profile: ItemProfile) => void
  setScriptScenes: (scenes: ScriptScene[]) => void
  setStoryboardShots: (shots: StoryboardShot[]) => void

  // Get all data for project (for export/save)
  getProjectData: (projectId: string) => any
  // Import project data
  importProjectData: (projectId: string, data: any, sourceProjectId?: string) => void
}

const defaultItemData = (id: string): ItemData => ({
  id,
  previousContent: '',
  content: '',
  versions: []
})

const getProjectKey = (category: string) => {
  const projectId = useProjectStore.getState().activeProjectId || 'default'
  return `${projectId}_${category}`
}

export const useInspirationStore = create<InspirationState>()(
  persist(
    (set, get) => ({
      activeCategory: 'script',
      autoSaveInterval: 5,
      chatHistory: [],
      sessions: [],
      
      activeItemIds: {},
      items: {},

      getActiveData: (category) => {
        const state = get()
        const projectKey = getProjectKey(category)
        const itemId = state.activeItemIds[projectKey] || `default_${projectKey}`
        return state.items[itemId] || defaultItemData(itemId)
      },
      
      getProjectData: (projectId: string) => {
        const state = get()
        const projectData: any = { activeItemIds: {}, items: {} }
        const prefix = `${projectId}_`
        
        Object.entries(state.activeItemIds).forEach(([key, val]) => {
          if (key.startsWith(prefix)) projectData.activeItemIds[key] = val
        })
        
        Object.entries(state.items).forEach(([key, val]) => {
          if (key.startsWith(`default_${prefix}`) || Object.values(projectData.activeItemIds).includes(key)) {
            projectData.items[key] = val
          }
        })
        
        return projectData
      },
      
      importProjectData: (projectId: string, data: any, sourceProjectId?: string) => {
        if (!data) return
        const remappedId = (oldKey: string) => {
          if (!sourceProjectId) return oldKey
          return oldKey.replace(sourceProjectId, projectId)
        }

        const remappedItemIds: Record<string, string> = {}
        if (data.activeItemIds) {
          for (const [key, val] of Object.entries(data.activeItemIds)) {
            const newKey = remappedId(key as string)
            remappedItemIds[newKey] = val as string
          }
        }

        const remappedItems: Record<string, ItemData> = {}
        if (data.items) {
          for (const [key, val] of Object.entries(data.items)) {
            // Also remap item keys if they contain the project ID
            const newKey = remappedId(key as string)
            remappedItems[newKey] = val as ItemData
          }
        }

        set((state) => ({
          activeItemIds: { ...state.activeItemIds, ...remappedItemIds },
          items: { ...state.items, ...remappedItems }
        }))
      },

      setActiveCategory: (category) => set({ activeCategory: category }),
      
      setActiveItem: (category, itemId, initialContent) => set((state) => {
        const existingItem = state.items[itemId]
        const newItemData = existingItem || {
          ...defaultItemData(itemId),
          content: initialContent || '',
          previousContent: ''
        }
        
        const projectKey = getProjectKey(category)
        return {
          activeItemIds: {
            ...state.activeItemIds,
            [projectKey]: itemId
          },
          items: {
            ...state.items,
            [itemId]: newItemData
          }
        }
      }),

      setAutoSaveInterval: (minutes) => set({ autoSaveInterval: minutes }),
      
      setContent: (category, content) => set((state) => {
        const projectKey = getProjectKey(category)
        const itemId = state.activeItemIds[projectKey] || `default_${projectKey}`
        const itemState = state.items[itemId] || defaultItemData(itemId)
        return {
          items: {
            ...state.items,
            [itemId]: { ...itemState, content }
          }
        }
      }),
      
      setPreviousContent: (category, previousContent) => set((state) => {
        const projectKey = getProjectKey(category)
        const itemId = state.activeItemIds[projectKey] || `default_${projectKey}`
        const itemState = state.items[itemId] || defaultItemData(itemId)
        return {
          items: {
            ...state.items,
            [itemId]: { ...itemState, previousContent }
          }
        }
      }),
      
      setImages: (category, refImage, generatedImage) => set((state) => {
        const projectKey = getProjectKey(category)
        const itemId = state.activeItemIds[projectKey] || `default_${projectKey}`
        const itemState = state.items[itemId] || defaultItemData(itemId)
        return {
          items: {
            ...state.items,
            [itemId]: { 
              ...itemState, 
              refImage: refImage !== undefined ? refImage : itemState.refImage,
              generatedImage: generatedImage !== undefined ? generatedImage : itemState.generatedImage
            }
          }
        }
      }),
      
      addMessage: (message) => set((state) => ({
        chatHistory: [
          ...state.chatHistory,
          {
            ...message,
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            timestamp: Date.now()
          }
        ]
      })),
      
      clearHistory: () => set({ chatHistory: [] }),
      
      newConversation: () => set((state) => {
        if (state.chatHistory.length === 0) return state
        
        const firstUserMsg = state.chatHistory.find(m => m.role === 'user')
        const title = firstUserMsg 
          ? firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '')
          : '新对话'
        
        const newSession: ConversationSession = {
          id: Date.now().toString(),
          title,
          messages: [...state.chatHistory],
          createdAt: Date.now()
        }
        
        return {
          sessions: [...state.sessions, newSession],
          chatHistory: []
        }
      }),
      
      switchConversation: (sessionId) => set((state) => {
        const session = state.sessions.find(s => s.id === sessionId)
        if (!session) return state
        
        let updatedSessions = state.sessions.filter(s => s.id !== sessionId)
        
        if (state.chatHistory.length > 0) {
          const firstUserMsg = state.chatHistory.find(m => m.role === 'user')
          const title = firstUserMsg 
            ? firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '')
            : '新对话'
          
          const currentSession: ConversationSession = {
            id: Date.now().toString(),
            title,
            messages: [...state.chatHistory],
            createdAt: Date.now()
          }
          updatedSessions = [...updatedSessions, currentSession]
        }
        
        return {
          sessions: updatedSessions,
          chatHistory: [...session.messages]
        }
      }),
      
      deleteConversation: (sessionId) => set((state) => ({
        sessions: state.sessions.filter(s => s.id !== sessionId)
      })),
      
      onAIGenerate: (category, aiResult) => set((state) => {
        const projectKey = getProjectKey(category)
        const itemId = state.activeItemIds[projectKey] || `default_${projectKey}`
        const itemState = state.items[itemId] || defaultItemData(itemId)
        const { content, previousContent } = itemState
        
        if (!content && !previousContent) {
          return {
            items: {
              ...state.items,
              [itemId]: { ...itemState, previousContent: aiResult }
            }
          }
        }
        
        return {
          items: {
            ...state.items,
            [itemId]: { 
              ...itemState, 
              previousContent: content || previousContent, 
              content: aiResult 
            }
          }
        }
      }),
      
      saveVersion: (category, isAuto = false) => set((state) => {
        const projectKey = getProjectKey(category)
        const itemId = state.activeItemIds[projectKey] || `default_${projectKey}`
        const itemState = state.items[itemId] || defaultItemData(itemId)
        const currentContent = itemState.content || itemState.previousContent || ''
        if (!currentContent.trim()) return state
        
        const versions = itemState.versions || []
        const lastVersion = versions[0]
        if (isAuto && lastVersion && lastVersion.content === currentContent) {
          return state // Don't auto-save if content hasn't changed
        }

        const newVersion: VersionRecord = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          content: currentContent,
          isAuto
        }
        
        return {
          items: {
            ...state.items,
            [itemId]: {
              ...itemState,
              versions: [newVersion, ...versions].slice(0, 50) // Keep last 50
            }
          }
        }
      }),
      
      restoreVersion: (category, versionId) => set((state) => {
        const projectKey = getProjectKey(category)
        const itemId = state.activeItemIds[projectKey] || `default_${projectKey}`
        const itemState = state.items[itemId]
        if (!itemState || !itemState.versions) return state
        
        const version = itemState.versions.find(v => v.id === versionId)
        if (!version) return state
        
        return {
          items: {
            ...state.items,
            [itemId]: {
              ...itemState,
              content: version.content
            }
          }
        }
      }),
      
      deleteVersion: (category, versionId) => set((state) => {
        const projectKey = getProjectKey(category)
        const itemId = state.activeItemIds[projectKey] || `default_${projectKey}`
        const itemState = state.items[itemId]
        if (!itemState) return state
        
        return {
          items: {
            ...state.items,
            [itemId]: {
              ...itemState,
              versions: (itemState.versions || []).filter(v => v.id !== versionId)
            }
          }
        }
      }),

      setCharacterProfile: (profile) => set((state) => {
        const projectKey = getProjectKey('character')
        const itemId = state.activeItemIds[projectKey] || `default_${projectKey}`
        const itemState = state.items[itemId] || defaultItemData(itemId)
        return {
          items: { ...state.items, [itemId]: { ...itemState, characterProfile: profile } }
        }
      }),

      setSceneProfile: (profile) => set((state) => {
        const projectKey = getProjectKey('scene')
        const itemId = state.activeItemIds[projectKey] || `default_${projectKey}`
        const itemState = state.items[itemId] || defaultItemData(itemId)
        return {
          items: { ...state.items, [itemId]: { ...itemState, sceneProfile: profile } }
        }
      }),

      setItemProfile: (profile) => set((state) => {
        const projectKey = getProjectKey('item')
        const itemId = state.activeItemIds[projectKey] || `default_${projectKey}`
        const itemState = state.items[itemId] || defaultItemData(itemId)
        return {
          items: { ...state.items, [itemId]: { ...itemState, itemProfile: profile } }
        }
      }),

      setScriptScenes: (scenes) => set((state) => {
        const projectKey = getProjectKey('script')
        const itemId = state.activeItemIds[projectKey] || `default_${projectKey}`
        const itemState = state.items[itemId] || defaultItemData(itemId)
        return {
          items: { ...state.items, [itemId]: { ...itemState, scriptScenes: scenes } }
        }
      }),

      setStoryboardShots: (shots) => set((state) => {
        const projectKey = getProjectKey('storyboard')
        const itemId = state.activeItemIds[projectKey] || `default_${projectKey}`
        const itemState = state.items[itemId] || defaultItemData(itemId)
        return {
          items: { ...state.items, [itemId]: { ...itemState, storyboardShots: shots } }
        }
      })
    }),
    {
      name: 'nbc_inspiration_store',
      migrate: (persistedState: any, version) => {
        // Handle migration gracefully if needed
        return persistedState
      }
    }
  )
)
