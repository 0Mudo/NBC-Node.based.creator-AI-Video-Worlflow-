/**
 * NBC 操作事件类型定义
 * 所有事件由前端 emit → Electron 主进程写入 JSONL → Agent 定期消费 → 飞书多维表格
 */

export type NBCEventAction =
  | 'project:create'
  | 'project:delete'
  | 'project:rename'
  | 'project:import'
  | 'workflow:node:add'
  | 'workflow:node:remove'
  | 'workflow:edge:add'
  | 'workflow:edge:remove'
  | 'workflow:export'
  | 'workflow:import'
  | 'generation:start'
  | 'generation:complete'
  | 'generation:fail'
  | 'asset:save:local'
  | 'asset:save:oss'
  | 'asset:save:feishu'
  | 'timeline:shot:create'
  | 'timeline:shot:fill'
  | 'timeline:shot:delete'
  | 'timeline:import'

export interface NBCEventDetails {
  /** 人类可读摘要 */
  summary: string
  /** 节点类型（generation 事件时） */
  nodeType?: string
  /** 节点标签 */
  nodeLabel?: string
  /** 生成类型: gptImage2 | seedance | comfyUI */
  generationType?: string
  /** 生成参数快照 */
  generationParams?: Record<string, unknown>
  /** 结果文件 URL/路径 */
  resultFile?: string
  /** 文件名 */
  fileName?: string
  /** 操作是否成功 */
  success?: boolean
  /** 错误信息 */
  error?: string
  /** 额外元数据 */
  [key: string]: unknown
}

export interface NBCEvent {
  id: string
  timestamp: string
  action: NBCEventAction
  operatorName?: string
  projectId?: string
  projectName?: string
  details: NBCEventDetails
  synced: boolean
}
