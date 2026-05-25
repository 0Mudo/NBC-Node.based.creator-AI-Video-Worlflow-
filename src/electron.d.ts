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
    thumbnailPath?: string
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
  listOssPrefixes: (config: any, prefix: string) => Promise<string[]>
  uploadOssFile: (config: any, localPath: string, ossKey: string) => Promise<string>
  deleteOss: (config: any, key: string) => Promise<string>
  deleteMultiOss: (config: any, keys: string[]) => Promise<string>
  deleteAnyOss: (config: any, key: string) => Promise<string>
  deleteMultiAnyOss: (config: any, keys: string[]) => Promise<string>
  setOssMeta: (config: any, key: string, meta: Record<string, string>) => Promise<string>
  listFeishu: (config: any) => Promise<any[]>
  uploadFeishu: (config: any, filename: string, data: string) => Promise<string | null>
  queueFeishu: (msg: string) => Promise<string>
  logEvent: (eventJson: string) => Promise<string>
  runFeishuSync: (config: {
    feishuAppId: string
    feishuAppSecret: string
    bitableAppToken: string
    bitableTableId: string
    nbcDir?: string
    allowedActions?: string[]
    fieldNames?: Record<string, string>
    batchSize?: number
  }) => Promise<{ success: boolean; synced: number; skipped: number; cursorLine: number; error?: string }>
  getEventsPath: () => Promise<string>
  saveToFile: (workflowData: string, defaultFilename?: string) => Promise<{ filePath: string | null; success: boolean }>
  loadFromFile: () => Promise<{ data: string | null; filePath: string }>
  ttsGenerate: (config: any, text: string, voiceId: string, speed: number, pitch: number) => Promise<string>
  exportVideo: (options: any) => Promise<string>
  openInShell: (target: string) => Promise<boolean>
  trashFile: (filePath: string) => Promise<string>
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
