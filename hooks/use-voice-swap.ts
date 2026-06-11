'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
import { VoiceSwapEngine } from '@/lib/voice-swap-engine'

const VIRTUAL_MIC_HINT = 'CABLE'

/**
 * Hook React pour piloter Voice Swap depuis l'UI de l'app de bureau ChapCam.
 *
 * Architecture reelle :
 * - Le MAIN process (electron/voice-swap.js) garde la cle ElevenLabs et fait
 *   les vrais appels speech-to-speech + le catalogue de voix.
 * - Le RENDERER (ce hook + VoiceSwapEngine) capture le micro, segmente le PCM,
 *   demande la conversion via IPC, puis joue le resultat vers VB-Cable.
 *
 * Sur le web ou une ancienne version sans Voice Swap, le hook reste inerte
 * (available=false) sans planter.
 */
export function useVoiceSwap() {
  const [state, setState] = useState<VoiceSwapState>(INITIAL_VOICE_SWAP_STATE)
  const [available, setAvailable] = useState(false)
  const [devices, setDevices] = useState<AudioDevice[]>([])
  const [voices, setVoices] = useState<VoiceProfile[]>([])

  // Instance du moteur audio (capture/lecture) cote renderer.
  const engineRef = useRef<VoiceSwapEngine | null>(null)

  // Enumere les vrais peripheriques audio via navigator.mediaDevices et
  // marque VB-Cable comme sortie virtuelle.
  const enumerateDevices = useCallback(async (): Promise<AudioDevice[]> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return []
    }
    try {
      const list = await navigator.mediaDevices.enumerateDevices()
      return list
        .filter((d) => d.kind === 'audioinput' || d.kind === 'audiooutput')
        .map((d) => {
          const label = d.label || (d.kind === 'audioinput' ? 'Micro' : 'Sortie')
          const isVirtual =
            d.kind === 'audiooutput' && label.toUpperCase().includes(VIRTUAL_MIC_HINT)
          return {
            deviceId: d.deviceId,
            label,
            kind: d.kind as 'audioinput' | 'audiooutput',
            isVirtual,
          }
        })
    } catch {
      return []
    }
  }, [])

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

    // Etat initial + catalogue de voix (vrai appel ElevenLabs cote main).
    api.status().then((s) => active && s && setState(s)).catch(() => {})
    api.listVoices().then((v) => active && Array.isArray(v) && setVoices(v)).catch(() => {})

    // Enumeration des peripheriques (necessite l'autorisation micro pour les
    // labels : on la demande puis on enumere).
    const loadDevices = async () => {
      try {
        const tmp = await navigator.mediaDevices.getUserMedia({ audio: true })
        tmp.getTracks().forEach((t) => t.stop())
      } catch {
        // autorisation refusee : on enumere quand meme (labels possibles vides)
      }
      const d = await enumerateDevices()
      if (active) setDevices(d)
    }
    void loadDevices()

    // Etat pousse par le main process (latence reseau, sante, qualite).
    api.onState?.((s) => {
      if (active && s) setState(s)
    })

    // Polling de secours si un evenement est manque.
    const interval = setInterval(() => {
      api.status().then((s) => active && s && setState(s)).catch(() => {})
    }, 3000)

    return () => {
      active = false
      clearInterval(interval)
      void engineRef.current?.stop()
      engineRef.current = null
    }
  }, [enumerateDevices])

  const start = useCallback(
    async (config: Partial<VoiceSwapConfig> = {}) => {
      const api = getVoiceSwapAPI()
      if (!api) return

      // 1. Demarre la session cote main (valide cle + voix, passe a running).
      const s = await api.start(config)
      if (s) setState(s)
      if (s && s.phase === 'error') return

      // 2. Demarre le moteur audio reel (capture micro -> conversion -> sortie).
      const outDevice = devices.find(
        (d) => d.kind === 'audiooutput' && d.deviceId === config.outputDeviceId,
      )
      const engine = new VoiceSwapEngine({
        inputDeviceId: config.inputDeviceId ?? null,
        outputDeviceId: config.outputDeviceId ?? null,
        outputIsVirtual: !!outDevice?.isVirtual,
        callbacks: {
          onError: (message) =>
            setState((prev) => ({ ...prev, error: message })),
        },
      })
      engineRef.current = engine
      try {
        await engine.start()
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: `Capture audio impossible: ${(err as Error).message}`,
        }))
        await api.stop()
      }
    },
    [devices],
  )

  const stop = useCallback(async () => {
    const api = getVoiceSwapAPI()
    // Arrete d'abord le moteur audio (micro/lecture), puis la session main.
    await engineRef.current?.stop()
    engineRef.current = null
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
    const d = await enumerateDevices()
    setDevices(d)
  }, [enumerateDevices])

  return { state, available, devices, voices, start, stop, updateSettings, refreshDevices }
}
