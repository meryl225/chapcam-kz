'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getVoiceSwapAPI,
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
  // true = pas de pont Electron : Voice Swap tourne via les routes web.
  const [webMode, setWebMode] = useState(false)

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
    const api = getVoiceSwapAPI()
    const desktop = api !== null
    // Web mode : pas de pont Electron mais on peut convertir via les routes web.
    setWebMode(!desktop)
    setAvailable(true)

    let active = true

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

    if (desktop && api) {
      // App de bureau : etat + voix + metriques via le pont Electron.
      api.status().then((s) => active && s && setState(s)).catch(() => {})
      api.listVoices().then((v) => active && Array.isArray(v) && setVoices(v)).catch(() => {})
      api.onState?.((s) => {
        if (active && s) setState(s)
      })
      const interval = setInterval(() => {
        api.status().then((s) => active && s && setState(s)).catch(() => {})
      }, 3000)
      return () => {
        active = false
        clearInterval(interval)
        void engineRef.current?.stop()
        engineRef.current = null
      }
    }

    // Mode web : on recupere le catalogue de voix via la route serveur.
    fetch('/api/voice-swap/voices')
      .then((r) => r.json())
      .then((data) => {
        if (active && Array.isArray(data.voices)) setVoices(data.voices)
      })
      .catch(() => {})

    return () => {
      active = false
      void engineRef.current?.stop()
      engineRef.current = null
    }
  }, [enumerateDevices])

  const start = useCallback(
    async (config: Partial<VoiceSwapConfig> = {}) => {
      const api = getVoiceSwapAPI()
      const outDevice = devices.find(
        (d) => d.kind === 'audiooutput' && d.deviceId === config.outputDeviceId,
      )
      const voiceId = config.conversion?.voiceId ?? null

      // --- Mode web (pas de pont Electron) : on pilote le moteur directement. ---
      if (!api) {
        if (!voiceId) {
          setState((prev) => ({ ...prev, phase: 'error', error: 'Selectionnez une voix cible.' }))
          return
        }
        setState((prev) => ({ ...prev, phase: 'connecting', error: null }))
        const engine = new VoiceSwapEngine({
          inputDeviceId: config.inputDeviceId ?? null,
          outputDeviceId: config.outputDeviceId ?? null,
          outputIsVirtual: !!outDevice?.isVirtual,
          voiceId,
          callbacks: {
            onError: (message) => setState((prev) => ({ ...prev, error: message })),
          },
        })
        engineRef.current = engine
        try {
          await engine.start()
          setState((prev) => ({
            ...prev,
            phase: 'running',
            virtualMicAvailable: !!outDevice?.isVirtual,
          }))
        } catch (err) {
          setState((prev) => ({
            ...prev,
            phase: 'error',
            error: `Capture audio impossible: ${(err as Error).message}`,
          }))
          await engine.stop()
          engineRef.current = null
        }
        return
      }

      // --- App de bureau : session pilotee par le main process. ---
      // 1. Demarre la session cote main (valide cle + voix, passe a running).
      const s = await api.start(config)
      if (s) setState(s)
      if (s && s.phase === 'error') return

      // 2. Demarre le moteur audio reel (capture micro -> conversion -> sortie).
      const engine = new VoiceSwapEngine({
        inputDeviceId: config.inputDeviceId ?? null,
        outputDeviceId: config.outputDeviceId ?? null,
        outputIsVirtual: !!outDevice?.isVirtual,
        voiceId,
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
    if (!api) {
      // Mode web : pas de session main, on repasse simplement a idle.
      setState((prev) => ({ ...prev, phase: 'idle', error: null }))
      return
    }
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

  return { state, available, webMode, devices, voices, start, stop, updateSettings, refreshDevices }
}
