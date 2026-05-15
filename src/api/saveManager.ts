/**
 * 生成结果保存管理器
 * 支持：本地下载、OSS 上传、飞书同步
 */
import { apiFetch } from './client'
import { emitNBCEvent } from '@/utils/nbcEvents'
import { useProjectStore } from '@/store/useProjectStore'
import { useProviderStore } from '@/store/useProviderStore'
import { useAssetStore } from '@/store/useAssetStore'

export interface SaveOptions {
  resultUrl: string
  filename: string
  saveLocal: boolean
  uploadOss: boolean
  syncFeishu: boolean
  outputDir?: string
}

export interface SaveResult {
  localPath?: string
  ossUrl?: string
  feishuResult?: string
  errors: string[]
}

export async function saveGeneratedAsset(opts: SaveOptions): Promise<SaveResult> {
  const result: SaveResult = { errors: [] }

  // 1. Download the result as base64 or blob
  let blob: Blob | null = null
  let base64Data: string | null = null
  try {
    if (window.electronAPI && (window.electronAPI as any).downloadBase64) {
      base64Data = await (window.electronAPI as any).downloadBase64(opts.resultUrl)
    } else {
      const resp = await fetch(opts.resultUrl)
      blob = await resp.blob()
      base64Data = await blobToBase64(blob)
    }
  } catch (err: any) {
    result.errors.push(`Download failed: ${err.message}`)
  }

  // 2. Local save
  if (opts.saveLocal) {
    try {
      if (window.electronAPI) {
        // Electron: save via IPC
        if (base64Data) {
          const saved = await saveLocalViaElectron(opts.resultUrl, opts.filename, base64Data, opts.outputDir)
          if (saved) {
            result.localPath = saved
            emitNBCEvent('asset:save:local', useProjectStore.getState().activeProjectId || undefined, {
              summary: `素材保存到本地: ${opts.filename}`,
              resultFile: saved,
              fileName: opts.filename,
            })
          }
        } else {
          throw new Error('No data downloaded')
        }
      } else {
        // Browser: trigger download
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = opts.filename
          a.click()
          URL.revokeObjectURL(url)
          result.localPath = `下载: ${opts.filename}`
        }
      }
    } catch (e: any) { result.errors.push(`本地: ${e.message}`) }
  }

  // 3. OSS upload
  if (opts.uploadOss) {
    try {
      if (window.electronAPI) {
        if (base64Data) {
          const url = await uploadToOssViaElectron(opts.resultUrl, opts.filename, base64Data)
          if (url) {
            result.ossUrl = url
            emitNBCEvent('asset:save:oss', useProjectStore.getState().activeProjectId || undefined, {
              summary: `素材上传到 OSS: ${opts.filename}`,
              resultFile: url,
              fileName: opts.filename,
            })
          }
        } else {
          throw new Error('No data downloaded')
        }
      }
    } catch (e: any) { result.errors.push(`OSS: ${e.message}`) }
  }

  // 4. Feishu sync
  if (opts.syncFeishu) {
    try {
      const msg = formatFeishuMessage(opts)
      result.feishuResult = msg
      // Store for agent pickup (will be sent via OpenClaw agent)
      await queueFeishuSync(msg)
      
      // Also directly upload to Feishu Drive if configured
      if (window.electronAPI && base64Data) {
        const feishuToken = await uploadToFeishuDriveViaElectron(opts.filename, base64Data)
        if (feishuToken) {
          result.feishuResult += `\n[云盘上传成功] Token: ${feishuToken}`
        }
      }

      emitNBCEvent('asset:save:feishu', useProjectStore.getState().activeProjectId || undefined, {
        summary: `素材加入飞书同步队列并上传云盘: ${opts.filename}`,
        resultFile: opts.resultUrl,
        fileName: opts.filename,
      })
    } catch (e: any) { result.errors.push(`飞书: ${e.message}`) }
  }

  return result
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.readAsDataURL(blob)
  })
}

function formatFeishuMessage(opts: SaveOptions): string {
  const fields = []
  fields.push(`📁 文件名: ${opts.filename}`)
  fields.push(`🔗 结果: ${opts.resultUrl}`)
  return fields.join('\n')
}

export async function saveLocalViaElectron(url: string, filename: string, data: string | null, dir?: string): Promise<string | null> {
  if (window.electronAPI?.saveFile) {
    const defaultLocalPath = useAssetStore.getState().defaultLocalPath
    const targetDir = dir || defaultLocalPath || undefined
    return window.electronAPI.saveFile(filename, data || '', targetDir)
  }
  return `[待保存] ${filename}`
}

async function uploadToOssViaElectron(url: string, filename: string, data: string | null): Promise<string | null> {
  if (window.electronAPI?.uploadOss) {
    try {
      const provider = useProviderStore.getState().getProvider('oss')
      const endpoint = (provider?.endpoints[0] || {}) as any
      const config = {
        accessKeyId: endpoint.accessKeyId || '',
        accessKeySecret: endpoint.accessKeySecret || '',
        bucket: endpoint.bucket || '',
        region: endpoint.region || ''
      }
      const res = await window.electronAPI.uploadOss(config as any, filename, data || '')
      if (res) {
        try {
          const { expectedUrl } = JSON.parse(res as string)
          if (expectedUrl) return expectedUrl
        } catch {
          // ignore JSON parse error, return raw response
        }
        return res as string
      }
    } catch (e) {
      console.error('uploadToOssViaElectron failed', e)
      return null
    }
  }
  return null
}

async function uploadToFeishuDriveViaElectron(filename: string, data: string): Promise<string | null> {
  if (window.electronAPI?.uploadFeishu) {
    try {
      const provider = useProviderStore.getState().getProvider('feishuDrive')
      if (!provider?.enabled) return null
      
      const endpoint = (provider.endpoints[0] || {}) as any
      const config = {
        appId: endpoint.appId || '',
        appSecret: endpoint.appSecret || '',
        folderToken: endpoint.folderToken || ''
      }
      
      if (!config.appId || !config.appSecret || !config.folderToken) return null

      return await window.electronAPI.uploadFeishu(config as any, filename, data)
    } catch (e) {
      console.error('uploadToFeishuDriveViaElectron failed', e)
      return null
    }
  }
  return null
}

async function queueFeishuSync(msg: string) {
  if (window.electronAPI?.queueFeishu) {
    return window.electronAPI.queueFeishu(msg)
  }
  return null
}
