export type ProviderCapability = 'text-to-image' | 'image-to-image' | 'text-to-video' | 'image-to-video' | 'video-edit' | 'workflow' | 'llm'

export interface ProviderParam {
  key: string
  label: string
  type: 'text' | 'password' | 'number' | 'select' | 'url'
  placeholder?: string
  defaultValue?: string | number
  options?: { label: string; value: string }[]
  required?: boolean
}

export interface ProviderEndpoint {
  id: string
  name: string
  url: string
  apiKey?: string
  model?: string
  isDefault?: boolean
  [key: string]: any
}

export interface ProviderConfig {
  id: string
  name: string
  capabilities: ProviderCapability[]
  icon: string
  color: string
  params: ProviderParam[]
  endpoints: ProviderEndpoint[]
  enabled: boolean
  connected?: boolean
  lastTested?: string
}

export interface ProviderRegistry {
  [providerId: string]: ProviderConfig
}
