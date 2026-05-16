import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  scanDirectory: (dirPath: string) => ipcRenderer.invoke('fs:scanDirectory', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  apiFetch: (req: { url: string; method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number }) => ipcRenderer.invoke('api:fetch', req),
  downloadBase64: (url: string) => ipcRenderer.invoke('api:downloadBase64', url),
  chatSend: (message: string) => ipcRenderer.invoke('chat:send', message),
  saveFile: (filename: string, base64Data: string, dir?: string) => ipcRenderer.invoke('save:local', filename, base64Data, dir),
  uploadOss: (config: any, filename: string, base64Data: string) => ipcRenderer.invoke('save:oss', config, filename, base64Data),
  listOss: (config: any, prefix: string) => ipcRenderer.invoke('oss:list', config, prefix),
  deleteOss: (config: any, key: string) => ipcRenderer.invoke('oss:delete', config, key),
  deleteMultiOss: (config: any, keys: string[]) => ipcRenderer.invoke('oss:deleteMulti', config, keys),
  setOssMeta: (config: any, key: string, meta: Record<string, string>) => ipcRenderer.invoke('oss:setMeta', config, key, meta),
  listFeishu: (config: any) => ipcRenderer.invoke('feishu:list', config),
  uploadFeishu: (config: any, filename: string, base64Data: string) => ipcRenderer.invoke('feishu:upload', config, filename, base64Data),
  queueFeishu: (msg: string) => ipcRenderer.invoke('save:feishu', msg),
  saveToFile: (workflowData: string, defaultFilename?: string) => ipcRenderer.invoke('project:saveToFile', workflowData, defaultFilename),
  loadFromFile: () => ipcRenderer.invoke('project:loadFromFile'),
  logEvent: (eventJson: string) => ipcRenderer.invoke('event:log', eventJson),
  ttsGenerate: (config: any, text: string, voiceId: string, speed: number, pitch: number) => ipcRenderer.invoke('tts:generate', config, text, voiceId, speed, pitch),
  exportVideo: (options: any) => ipcRenderer.invoke('export:video', options),
  openInShell: (target: string) => ipcRenderer.invoke('shell:open', target),
  onDeepLink: (callback: (url: string) => void) => {
    const handler = (_event: any, url: string) => callback(url)
    ipcRenderer.on('deep-link', handler)
    ipcRenderer.send('deep-link:register')
    return () => ipcRenderer.removeListener('deep-link', handler)
  },
  removeDeepLinkListener: () => ipcRenderer.removeAllListeners('deep-link'),
  onAppClosing: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('app-closing', handler)
    return () => ipcRenderer.removeListener('app-closing', handler)
  },
  confirmAppClose: () => ipcRenderer.send('app-close-confirmed'),
})
