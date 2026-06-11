'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getVoiceSwapAPI,
  isVoiceSwapAvailable,
  INITIAL_VOICE_SWAP_STATE,
  type VoiceSwapState,
  type VoiceConversionSettings,
  type VoiceSwapConfig,
  type AudioDevice,
  type VoiceProfile,
} from '@/lib/voice-swap'

/**
 * Hook React pour piloter Voice Swap depuis l'UI de l'app de bureau ChapCam.
 *
 * - En Electron (app de bureau a jour) : ecoute l'etat pousse par le main +
 *   polling de secours, et expose start/stop/updateSettings.
 * - Sur le web ou ancienne version : renvoie un etat inerte et `available=false`
 *   (Voice Swap est une fonctionnalite de bureau uniquement).
 *
 * NB : l'implementation du streaming temps reel (capture -> ElevenLabs ->
 * VB-Cable) n'est pas encore branchee cote main process ; ce hook suit deja
 * l'architecture finale pour ne necessiter aucun changement d'UI plus tard.
 */
export function useVoiceSwap() {
  const [state, setState] = useState<VoiceSwapState>(INITIAL_VOICE_SWAP_STATE)
  const [available, setAvailable] = useState(false)
  const [devices, setDevices] = useState<AudioDevice[]>([])
  const [voices, setVoices] = useState<VoiceProfile[]>([])

  useEffect(() => {
    if (!isVoiceSwapAvailable()) {
      setAvailable(false)
      return
    }
    const api = getVoiceSwapAPI()
    if (!api) {
      setAvailable(false)
      return
    }
    setAvailable(true)

    let active = true

    // Etat initial + catalogues
    api.status().then((s) => active && s && setState(s)).catch(() => {})
    api.listDevices().then((d) => active && Array.isArray(d) && setDevices(d)).catch(() => {})
    api.listVoices().then((v) => active && Array.isArray(v) && setVoices(v)).catch(() => {})

    // Etat pousse par le main process
    api.onState?.((s) => {
      if (active && s) setState(s)
    })

    // Polling de secours si un evenement est manque
    const interval = setInterval(() => {
      api.status().then((s) => active && s && setState(s)).catch(() => {})
    }, 3000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  const start = useCallback(async (config: Partial<VoiceSwapConfig> = {}) => {
    const api = getVoiceSwapAPI()
    if (!api) return
    const s = await api.start(config)
    if (s) setState(s)
  }, [])

  const stop = useCallback(async () => {
    const api = getVoiceSwapAPI()
    if (!api) return
    const s = await api.stop()
    if (s) setState(s)
  }, [])

  const updateSettings = useCallback(async (settings: Partial<VoiceConversionSettings>) => {
    const api = getVoiceSwapAPI()
    if (!api) return
    const s = await api.updateSettings(settings)
    if (s) setState(s)
  }, [])

  const refreshDevices = useCallback(async () => {
    const api = getVoiceSwapAPI()
    if (!api) return
    const d = await api.listDevices()
    if (Array.isArray(d)) setDevices(d)
  }, [])

  return { state, available, devices, voices, start, stop, updateSettings, refreshDevices }
}
