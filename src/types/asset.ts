export type AssetType = 'image' | 'video' | 'panorama' | 'text'
export type AssetTag = 'GPT Image' | 'Seedance' | 'ComfyUI' | 'ZzzMap' | 'Character' | 'Scene' | 'Item' | 'Output' | '本地' | 'OSS' | '预设'

export interface Asset {
  id: string
  name: string
  type: AssetType
  path: string
  thumbnailPath?: string
  width?: number
  height?: number
  size?: number
  prompt?: string
  tags: AssetTag[]
  createdAt: string
  projectId?: string
  preset?: boolean
}

export interface AssetDir {
  path: string
  name: string
  assetCount: number
}
