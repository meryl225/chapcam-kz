'use client'

import { useEffect, useState, useCallback } from 'react'
import { getElectronAPI, isElectron, type VirtualCameraState } from '@/lib/electron'

const DEFAULT_STATE: VirtualCameraState = {
  running: false,
  deviceName: 'ChapCam Camera',
  driverInstalled: false,
  error: null,
}

/**
 * Suit l'etat de la camera virtuelle "ChapCam Camera".
 * - En Electron : ecoute les evenements pousses par le main + polling de secours.
 * - Sur le web : renvoie un etat inerte (camera virtuelle indisponible hors app de bureau).
 */
export function useVirtualCamera() {
  const [state, setState] = useState<VirtualCameraState>(DEFAULT_STATE)
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    if (!isElectron()) {
      setAvailable(false)
      return
    }
    const api = getElectronAPI()
    // IMPORTANT : les anciennes versions de l'app de bureau ChapCam exposent
    // window.electronAPI SANS le namespace `virtualCamera`. Appeler
    // api.virtualCamera.status() levait alors "Cannot read properties of
    // undefined (reading 'status')", ce qui faisait planter Live Swap ET
    // Live Pro (les deux affichent VirtualCameraIndicator). On verifie donc
    // que la fonctionnalite existe avant de l'utiliser.
    if (!api || typeof api.virtualCamera?.status !== 'function') {
      setAvailable(false)
      return
    }
    setAvailable(true)

    let active = true

    // Etat initial
    api.virtualCamera
      .status()
      .then((s) => active && s && setState(s))
      .catch(() => {})

    // Evenements pousses par le process principal (peut ne pas exister)
    api.onVirtualCameraState?.((s) => {
      if (active && s) setState(s)
    })

    // Polling de secours (si un evenement est manque)
    const interval = setInterval(() => {
      api.virtualCamera
        ?.status?.()
        .then((s) => active && s && setState(s))
        .catch(() => {})
    }, 3000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  const start = useCallback(async () => {
    const api = getElectronAPI()
    if (typeof api?.virtualCamera?.start !== 'function') return
    const s = await api.virtualCamera.start({ width: 1280, height: 720, fps: 30 })
    if (s) setState(s)
  }, [])

  const stop = useCallback(async () => {
    const api = getElectronAPI()
    if (typeof api?.virtualCamera?.stop !== 'function') return
    const s = await api.virtualCamera.stop()
    if (s) setState(s)
  }, [])

  return { state, available, start, stop }
}
