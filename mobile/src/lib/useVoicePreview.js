import { useCallback, useEffect, useState } from 'react'
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { supabase } from './supabase'
import { API_URL } from './api'
import { callPlayer } from './useSafeVideoPlayer'

const LOAD_TIMEOUT_MS = 12000

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// One shared player for every voice preview on a screen, so starting a voice
// always stops the previous one. Plays the free ElevenLabs sample relayed by
// /api/voice/preview/:id (served as audio/mpeg with Range support for AVPlayer):
// no synthesis, no Jetons consumed.
export function useVoicePreview() {
  const player = useAudioPlayer(null)
  const status = useAudioPlayerStatus(player)
  const [activeId, setActiveId] = useState(null)
  const [paused, setPaused] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (activeId && status.didJustFinish) {
      setActiveId(null)
      setPaused(false)
    }
  }, [status.didJustFinish, activeId])

  useEffect(() => {
    if (!activeId || paused || status.playing) return undefined
    const timer = setTimeout(() => {
      callPlayer(player, 'pause')
      setActiveId(null)
      setError('Aperçu indisponible pour le moment. Vérifie ta connexion et réessaie.')
    }, LOAD_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [activeId, paused, status.playing, player])

  const stop = useCallback(() => {
    callPlayer(player, 'pause')
    setActiveId(null)
    setPaused(false)
  }, [player])

  const toggle = useCallback(async (voice) => {
    if (!voice?.id) return
    setError(null)
    if (activeId === voice.id) {
      if (status.playing) {
        callPlayer(player, 'pause')
        setPaused(true)
      } else {
        if (status.duration > 0 && status.currentTime >= status.duration - 0.1) player.seekTo(0)
        callPlayer(player, 'play')
        setPaused(false)
      }
      return
    }
    callPlayer(player, 'pause')
    setActiveId(voice.id)
    setPaused(false)
    try {
      // Without this, the iOS silent switch mutes previews entirely.
      await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {})
      callPlayer(player, 'replace', { uri: `${API_URL}/api/voice/preview/${encodeURIComponent(voice.id)}`, headers: await authHeaders() })
      callPlayer(player, 'play')
    } catch {
      setActiveId(null)
      setError('Lecture de l’aperçu impossible. Réessaie dans un instant.')
    }
  }, [activeId, player, status.playing, status.duration, status.currentTime])

  const isPlaying = (id) => activeId === id && status.playing && !paused
  const isLoading = (id) => activeId === id && !paused && !status.playing

  return { activeId, error, toggle, stop, isPlaying, isLoading, clearError: () => setError(null) }
}
