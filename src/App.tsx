import { useState, useEffect } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import SetupWizard from '@/components/setup/SetupWizard'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import { useDeepLink } from '@/hooks/useDeepLink'
import { setQuotaExceededHandler } from '@/utils/safeStorage'
import { useNotificationStore } from '@/store/useNotificationStore'

export default function App() {
  const [setupDone, setSetupDone] = useState(() => {
    return localStorage.getItem('nbc_setup_done') === 'true'
  })

  useDeepLink()

  useEffect(() => {
    setQuotaExceededHandler((key) => {
      useNotificationStore.getState().addNotification({
        type: 'warning',
        title: '存储空间不足',
        message: `本地存储配额已满 (${key})。系统已尝试自动清理，部分旧数据可能被移除。`
      })
    })
  }, [])

  return (
    <ErrorBoundary panelName="NBC 应用">
      {!setupDone && <SetupWizard onComplete={() => setSetupDone(true)} />}
      <MainLayout />
    </ErrorBoundary>
  )
}
