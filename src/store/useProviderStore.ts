import { create } from 'zustand'
import type { ProviderConfig, ProviderRegistry } from '@/types/provider'
import { apiFetch } from '@/api/client'

const STORAGE_KEY = 'nbc_providers'

function loadProviders(): ProviderRegistry {
  const defaults = getDefaultProviders()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const stored = JSON.parse(raw)
      // Merge defaults with stored so that newly added providers in code 
      // aren't hidden by old localStorage data
      return { ...defaults, ...stored }
    }
  } catch {}
  return defaults
}

function saveProviders(registry: ProviderRegistry) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(registry)) } catch {}
}

function getDefaultProviders(): ProviderRegistry {
  return {
    gptImage2: {
      id: 'gptImage2',
      name: 'GPT Image 2',
      capabilities: ['text-to-image'],
      icon: 'Image',
      color: '#fd79a8',
      params: [
        { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...', required: true },
      ],
      endpoints: [
        { id: 'default', name: '默认端点', url: 'https://grsai.dakka.com.cn/v1/api/generate', isDefault: true },
      ],
      enabled: true,
    },
    banana: {
      id: 'banana',
      name: 'Nano Banana',
      capabilities: ['text-to-image'],
      icon: 'Image',
      color: '#f39c12',
      params: [
        { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...', required: true },
      ],
      endpoints: [
        { id: 'default', name: '国内节点', url: 'https://grsai.dakka.com.cn/v1/api/generate', isDefault: true },
        { id: 'global', name: '全球节点', url: 'https://grsaiapi.com/v1/api/generate' },
      ],
      enabled: true,
    },
    seedance: {
      id: 'seedance',
      name: 'Seedance 2.0',
      capabilities: ['text-to-video', 'image-to-video'],
      icon: 'Film',
      color: '#6c5ce7',
      params: [
        { key: 'apiKey', label: 'API Key（火山方舟）', type: 'password', placeholder: 'ark-...', required: true },
      ],
      endpoints: [
        { id: 'default', name: '默认端点', url: 'https://ark.cn-beijing.volces.com/api/v3', isDefault: true },
      ],
      enabled: true,
    },
    llm: {
      id: 'llm',
      name: 'LLM（提示词优化）',
      capabilities: ['llm'],
      icon: 'Sparkles',
      color: '#fdcb6e',
      params: [
        { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...', required: true },
        { key: 'model', label: '模型名称', type: 'text', placeholder: 'deepseek-v4-pro', required: true },
      ],
      endpoints: [
        { id: 'default', name: '默认端点', url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-v4-pro', isDefault: true },
      ],
      enabled: true,
    },
    oss: {
      id: 'oss',
      name: '阿里云 OSS',
      capabilities: [],
      icon: 'Cloud',
      color: '#0984e3',
      params: [
        { key: 'accessKeyId', label: 'AccessKey ID', type: 'password', placeholder: 'LTAI...', required: true },
        { key: 'accessKeySecret', label: 'AccessKey Secret', type: 'password', placeholder: '...', required: true },
        { key: 'bucket', label: 'Bucket Name', type: 'text', placeholder: 'yukkio', required: true },
        { key: 'region', label: 'Region', type: 'text', placeholder: 'oss-cn-shenzhen', required: true },
      ],
      endpoints: [
        { id: 'default', name: 'OSS Endpoint', url: 'https://oss-cn-shenzhen.aliyuncs.com', isDefault: true },
      ],
      enabled: true,
    },
    feishuDrive: {
      id: 'feishuDrive',
      name: '飞书云盘',
      capabilities: [],
      icon: 'HardDrive',
      color: '#00D6B9',
      params: [
        { key: 'appId', label: 'App ID', type: 'password', placeholder: 'cli_...', required: true },
        { key: 'appSecret', label: 'App Secret', type: 'password', placeholder: '...', required: true },
        { key: 'folderToken', label: '文件夹 Token', type: 'text', placeholder: 'H2WXfu8LLlHHvQdn33Cc1OhjnUe', required: true },
      ],
      endpoints: [
        { id: 'default', name: 'Open API', url: 'https://open.feishu.cn/open-apis', isDefault: true },
      ],
      enabled: true,
    },
  }
}

interface ProviderStore {
  providers: ProviderRegistry
  updateProvider: (id: string, updates: Partial<ProviderConfig>) => void
  toggleProvider: (id: string) => void
  addProvider: (config: ProviderConfig) => void
  removeProvider: (id: string) => void
  getProvider: (id: string) => ProviderConfig | undefined
  getEnabledProviders: () => ProviderConfig[]
  testConnection: (id: string) => Promise<boolean>
}

export const useProviderStore = create<ProviderStore>((set, get) => ({
  providers: loadProviders(),

  updateProvider: (id, updates) => {
    const providers = { ...get().providers }
    if (providers[id]) {
      providers[id] = { ...providers[id], ...updates }
      set({ providers })
      saveProviders(providers)
    }
  },

  toggleProvider: (id) => {
    const providers = { ...get().providers }
    if (providers[id]) {
      providers[id] = { ...providers[id], enabled: !providers[id].enabled }
      set({ providers })
      saveProviders(providers)
    }
  },

  addProvider: (config) => {
    const providers = { ...get().providers, [config.id]: config }
    set({ providers })
    saveProviders(providers)
  },

  removeProvider: (id) => {
    const providers = { ...get().providers }
    delete providers[id]
    set({ providers })
    saveProviders(providers)
  },

  getProvider: (id) => get().providers[id],

  getEnabledProviders: () => Object.values(get().providers).filter((p) => p.enabled),

  testConnection: async (id) => {
    const provider = get().providers[id]
    if (!provider) return false
    const defaultEndpoint = provider.endpoints.find((e) => e.isDefault) || provider.endpoints[0]
    if (!defaultEndpoint) return false
    try {
      await apiFetch(defaultEndpoint.url, {
        method: 'GET',
        timeoutMs: 10000,
      })
      const updated = { ...provider, connected: true, lastTested: new Date().toISOString() }
      const providers = { ...get().providers, [id]: updated }
      set({ providers })
      saveProviders(providers)
      return true
    } catch (err) {
      const isHttpError = err instanceof Error && err.message.startsWith('HTTP ')
      if (isHttpError) {
        const updated = { ...provider, connected: true, lastTested: new Date().toISOString() }
        const providers = { ...get().providers, [id]: updated }
        set({ providers })
        saveProviders(providers)
        return true
      }
      const updated = { ...provider, connected: false, lastTested: new Date().toISOString() }
      const providers = { ...get().providers, [id]: updated }
      set({ providers })
      saveProviders(providers)
      return false
    }
  },
}))
