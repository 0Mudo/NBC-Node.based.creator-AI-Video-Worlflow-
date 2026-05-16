import { useEffect } from 'react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { Workflow } from '@/types/workflow'

export function useDeepLink() {
  const { importWorkflow } = useWorkflowStore()

  useEffect(() => {
    if (!window.electronAPI?.onDeepLink) return

    const handleDeepLink = async (url: string) => {
      try {
        const u = new URL(url)
        const action = u.hostname || u.pathname.replace(/^\//, '')

        if (action === 'import') {
          const importUrl = u.searchParams.get('url')
          if (importUrl) {
            useNotificationStore.getState().addNotification({
              type: 'info',
              title: '正在导入工作流',
              message: `从 ${new URL(importUrl).hostname} 下载中...`,
            })

            const res = await fetch(importUrl)
            if (!res.ok) throw new Error(`下载失败: ${res.status}`)
            const text = await res.text()

            try {
              const parsed = JSON.parse(text) as Workflow
              importWorkflow(parsed)
              useNotificationStore.getState().addNotification({
                type: 'success',
                title: '工作流导入成功',
                message: '从深度链接导入的工作流已加载',
              })
            } catch {
              useNotificationStore.getState().addNotification({
                type: 'error',
                title: '导入失败',
                message: '文件格式无效，请确认是 .nbc.json 文件',
              })
            }
          }
        }
      } catch (e: any) {
        useNotificationStore.getState().addNotification({
          type: 'error',
          title: '深度链接处理失败',
          message: e.message || '未知错误',
        })
      }
    }

    window.electronAPI.onDeepLink(handleDeepLink)

    return () => {
      window.electronAPI?.removeDeepLinkListener?.()
    }
  }, [importWorkflow])
}
