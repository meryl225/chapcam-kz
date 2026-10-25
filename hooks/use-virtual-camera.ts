'use client'

import { useEffect, useState, useCallback } from 'react'
import { getElectronAPI, isElectron, type VirtualCameraState } from '@/lib/electron'

const DEFAULT_STATE: VirtualCameraState = {
  running: false,
  deviceName: 'ChapCam Camera',
  driverInstalled: false,
  error: null,
}

type RawVirtualCameraStatus = Partial<VirtualCameraState> & {
  isRunning?: boolean
  available?: boolean
}

// Le process principal (electron/virtual-camera.js) renvoie { isRunning, available }
// alors que l'UI lit { running, driverInstalled } : on accepte les deux formes.
function normalizeStatus(raw: RawVirtualCameraStatus | null | undefined): VirtualCameraState | null {
  if (!raw) return null
  return {
    ...DEFAULT_STATE,
    ...raw,
    running: raw.running ?? raw.isRunning ?? false,
    driverInstalled: raw.driverInstalled ?? raw.available ?? false,
    error: raw.error ?? null,
  }
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
      .then((s) => { const n = normalizeStatus(s); if (active && n) setState(n) })
      .catch(() => {})

    // Evenements pousses par le process principal (peut ne pas exister)
    api.onVirtualCameraState?.((s) => {
      const n = normalizeStatus(s)
      if (active && n) setState(n)
    })

    // Polling de secours (si un evenement est manque)
    const interval = setInterval(() => {
      api.virtualCamera
        ?.status?.()
        .then((s) => { const n = normalizeStatus(s); if (active && n) setState(n) })
        .catch(() => {})
    }, 2000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  const start = useCallback(async () => {
    const api = getElectronAPI()
    if (typeof api?.virtualCamera?.start !== 'function') return
    const s = await api.virtualCamera.start({ width: 1280, height: 720, fps: 30 })
    const n = normalizeStatus(s)
    if (n) setState(n)
  }, [])

  const stop = useCallback(async () => {
    const api = getElectronAPI()
    if (typeof api?.virtualCamera?.stop !== 'function') return
    const s = await api.virtualCamera.stop()
    const n = normalizeStatus(s)
    if (n) setState(n)
  }, [])

  const restart = useCallback(async () => {
    const api = getElectronAPI()
    if (typeof api?.virtualCamera?.restart !== 'function') return
    const n = normalizeStatus(await api.virtualCamera.restart())
    if (n) setState(n)
  }, [])

  return { state, available, start, stop, restart }
}
