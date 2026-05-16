export interface NbcEvent {
  id: string
  action: string // 'project.created', 'project.deleted', 'workflow.created', 'asset.generated', etc.
  timestamp: number
  operator: string
  context: {
    projectId?: string
    projectName?: string
    workflowId?: string
    nodeId?: string
    [key: string]: any
  }
  payload: any
}

function generateId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const EventBus = {
  log: async (
    action: string,
    payload: any,
    context: NbcEvent['context'] = {}
  ) => {
    try {
      // 从 localStorage 获取当前用户名，如果没有则默认为 'NBC User'
      const operator = localStorage.getItem('nbc_operator_name') || 'NBC User'
      
      const event: NbcEvent = {
        id: generateId(),
        action,
        timestamp: Date.now(),
        operator,
        context,
        payload,
      }

      // 如果在 Electron 环境中，通过 IPC 发送到主进程写入本地 jsonl
      if (window.electronAPI && window.electronAPI.logEvent) {
        await window.electronAPI.logEvent(JSON.stringify(event))
      } else {
        // 开发模式/纯 Web 模式下的 fallback，打印到 console
        console.log('[EventBus Log]', event)
      }
    } catch (e) {
      console.error('Failed to log event', e)
    }
  }
}
