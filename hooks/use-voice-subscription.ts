'use client'

import { useCallback, useEffect, useState } from 'react'

export interface VoiceSubscription {
  plan: string
  secondsRemaining: number
  secondsTotal: number
  minutesRemaining: number
  minutesTotal: number
  expiresAt: string | null
  active: boolean
}

const EMPTY: VoiceSubscription = {
  plan: 'none',
  secondsRemaining: 0,
  secondsTotal: 0,
  minutesRemaining: 0,
  minutesTotal: 0,
  expiresAt: null,
  active: false,
}

/**
 * Lit le solde de minutes Voice Swap (ChapVoice) de l'utilisateur via
 * /api/voice-subscription. Source : table voice_subscriptions (credit PayDunya).
 */
export function useVoiceSubscription() {
  const [data, setData] = useState<VoiceSubscription>(EMPTY)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/voice-subscription', { cache: 'no-store' })
      const json = await res.json()
      if (json?.success) {
        setData({
          plan: json.plan,
          secondsRemaining: json.secondsRemaining,
          secondsTotal: json.secondsTotal,
          minutesRemaining: json.minutesRemaining,
          minutesTotal: json.minutesTotal,
          expiresAt: json.expiresAt,
          active: json.active,
        })
      }
    } catch {
      // hors-ligne ou erreur : on garde l'etat precedent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { ...data, loading, refresh }
}
