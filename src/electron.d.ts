export interface FetchRequest {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
  timeoutMs?: number
}

export interface FetchResponse {
  status: number
  statusText: string
  headers: Record<string, string[]>
  body: string
}

export interface ElectronAPI {
  openDirectory: () => Promise<string | null>
  scanDirectory: (dirPath: string) => Promise<Array<{
    id: string
    name: string
    type: string
    path: string
    size: number
    createdAt: string
    tags: string[]
  }>>
  readFile: (filePath: string) => Promise<{
    data: string
    mimeType: string
  } | null>
  apiFetch: (req: FetchRequest) => Promise<FetchResponse>
  chatSend: (message: string) => Promise<string>
  saveFile: (filename: string, data: string, dir?: string) => Promise<string | null>
  uploadOss: (config: any, filename: string, data: string) => Promise<string | null>
  listOss: (config: any, prefix: string) => Promise<any[]>
  listFeishu: (config: any) => Promise<any[]>
  uploadFeishu: (config: any, filename: string, data: string) => Promise<string | null>
  queueFeishu: (msg: string) => Promise<string>
  logEvent: (eventJson: string) => Promise<string>
  saveToFile: (workflowData: string, defaultFilename?: string) => Promise<{ filePath: string | null; success: boolean }>
  loadFromFile: () => Promise<{ data: string | null; filePath: string }>
  openInShell: (target: string) => Promise<boolean>
  onDeepLink: (callback: (url: string) => void) => () => void
  removeDeepLinkListener: () => void
  onAppClosing: (callback: () => void) => () => void
  confirmAppClose: () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
