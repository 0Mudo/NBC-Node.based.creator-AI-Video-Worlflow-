/**
 * OSS 素材管理工具
 * 使用永久公开 URL（Bucket 需设为公共读）
 */

const OSS_BUCKET = 'yukkio'
const OSS_REGION = 'oss-cn-shenzhen'
const OSS_BASE = `https://${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com`

/**
 * 生成素材的 OSS 永久公开 URL
 * 前提：Bucket 已设为公共读，文件上传时未设私有 ACL
 */
export function ossUrl(key: string): string {
  return `${OSS_BASE}/${key}`
}

/**
 * 上传文件到 OSS 并返回永久 URL
 * 通过 Electron IPC 或本地 Python 脚本
 */
export async function uploadToOssViaPython(filePath: string, ossKey: string): Promise<string> {
  // 调用本地 Python 脚本上传（需要 oss2）
  // 在实际集成中通过 Electron IPC 或 HTTP 调用
  const resp = await fetch('http://localhost:18888/oss/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: filePath, key: ossKey }),
  })
  if (!resp.ok) throw new Error('OSS upload failed')
  return ossUrl(ossKey)
}

/**
 * 将素材列表保存为 manifest 并上传到 OSS
 * 前端可通过此 manifest 加载所有素材
 */
export interface AssetManifestEntry {
  id: string
  name: string
  type: 'image' | 'video' | 'panorama'
  url: string
  size?: number
  width?: number
  height?: number
  tags: string[]
  prompt?: string
  createdAt: string
}

export async function publishManifest(entries: AssetManifestEntry[]): Promise<string> {
  const json = JSON.stringify(entries, null, 2)
  const resp = await fetch('http://localhost:18888/oss/upload-raw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'assets-manifest.json', content: json }),
  })
  if (!resp.ok) throw new Error('Manifest upload failed')
  return `${OSS_BASE}/assets-manifest.json`
}
