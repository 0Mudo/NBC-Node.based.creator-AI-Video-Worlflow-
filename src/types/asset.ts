export type AssetType = 'image' | 'video' | 'panorama' | 'text'
export type AssetTag = 'GPT Image' | 'Seedance' | 'ZzzMap' | 'Character' | 'Scene' | 'Item' | 'Output' | '本地' | 'OSS' | '预设' | '飞书云盘' | 'AI生成'
export type AssetSource = 'local' | 'oss' | 'feishu' | 'preset'

export const ASSET_TAG_CN: Record<AssetTag, string> = {
  'GPT Image': 'GPT图像',
  'Seedance': 'Seedance',
  'ZzzMap': '全景图',
  'Character': '角色',
  'Scene': '场景',
  'Item': '物品',
  'Output': '输出',
  '本地': '本地',
  'OSS': 'OSS',
  '预设': '预设',
  '飞书云盘': '飞书云盘',
  'AI生成': 'AI生成',
}

export const ALL_PRESET_TAGS: AssetTag[] = [
  'GPT Image', 'Seedance', 'ZzzMap',
  'Character', 'Scene', 'Item', 'Output',
  '本地', 'OSS', '预设', '飞书云盘', 'AI生成',
]

export const ALL_FILTER_TAGS: (AssetTag | 'All')[] = ['All', ...ALL_PRESET_TAGS]

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
  ossKey?: string
  source?: AssetSource
}

export interface AssetDir {
  path: string
  name: string
  assetCount: number
}
