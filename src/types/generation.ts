export type GenerationStatus = 'queued' | 'running' | 'completed' | 'failed'
export type GenerationType = 'gptImage2' | 'seedance' | 'banana'

export interface GenerationTask {
  id: string
  nodeId: string
  type: GenerationType
  status: GenerationStatus
  progress: number
  resultUrl?: string
  resultLocalPath?: string
  error?: string
  startedAt?: string
  completedAt?: string
  abortController?: AbortController
}

export interface GenerationQueue {
  tasks: GenerationTask[]
  isProcessing: boolean
}
