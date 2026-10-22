'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getElectronAPI } from '@/lib/electron'

// ipcRenderer.on accumule les ecouteurs : on ne les enregistre qu'une fois.
let registered = false

// Le menu natif de ChapCam Desktop ("Preferences...", "Parametres Camera...")
// envoie des evenements IPC que la page n'ecoutait pas : rien ne s'ouvrait.
export function ElectronMenuBridge() {
  const router = useRouter()

  useEffect(() => {
    const api = getElectronAPI()
    if (!api || registered) return
    registered = true
    api.onOpenPreferences?.(() => router.push('/dashboard/settings'))
    api.onOpenCameraSettings?.(() => router.push('/dashboard/settings#camera'))
  }, [router])

  return null
}
