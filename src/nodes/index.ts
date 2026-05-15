import type { NodeType } from '@/types/flow'
import AssetInputNode from './AssetInputNode'
import CharacterCardNode from './CharacterCardNode'
import SceneCardNode from './SceneCardNode'
import ItemCardNode from './ItemCardNode'
import ScriptNode from './ScriptNode'
import PromptNode from './PromptNode'
import GPTImageNode from './GPTImageNode'
import SeedanceNode from './SeedanceNode'
import ComfyUINode from './ComfyUINode'
import BananaNode from './BananaNode'
import OutputNode from './OutputNode'

export const nodeTypes = {
  assetInput: AssetInputNode,
  characterCard: CharacterCardNode,
  sceneCard: SceneCardNode,
  itemCard: ItemCardNode,
  script: ScriptNode,
  prompt: PromptNode,
  gptImage2: GPTImageNode,
  seedance: SeedanceNode,
  comfyUI: ComfyUINode,
  banana: BananaNode,
  output: OutputNode,
} as const

export const nodeTypeLabels: Record<NodeType, string> = {
  assetInput: '素材输入',
  characterCard: '角色卡',
  sceneCard: '场景卡',
  itemCard: '物品卡',
  script: '剧本/分镜',
  prompt: '提示词',
  gptImage2: 'GPT图像生成',
  seedance: 'Seedance视频生成',
  comfyUI: 'ComfyUI',
  banana: 'Banana图像生成',
  output: '输出',
}

export const nodeTypeColors: Record<NodeType, string> = {
  assetInput: '#4ecdc4',
  characterCard: '#ff6b6b',
  sceneCard: '#f9ca24',
  itemCard: '#e67e22',
  script: '#00cec9',
  prompt: '#a29bfe',
  gptImage2: '#fd79a8',
  seedance: '#6c5ce7',
  comfyUI: '#00b894',
  banana: '#f39c12',
  output: '#e17055',
}
