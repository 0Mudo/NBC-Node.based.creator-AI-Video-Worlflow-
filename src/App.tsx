import { useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import SetupWizard from '@/components/setup/SetupWizard'
import { useDeepLink } from '@/hooks/useDeepLink'

export default function App() {
  const [setupDone, setSetupDone] = useState(() => {
    return localStorage.getItem('nbc_setup_done') === 'true'
  })

  useDeepLink()

  return (
    <>
      {!setupDone && <SetupWizard onComplete={() => setSetupDone(true)} />}
      <MainLayout />
    </>
  )
}
