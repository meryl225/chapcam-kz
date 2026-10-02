import { useCallback, useEffect, useState } from 'react'
import Constants from 'expo-constants'
import { supabase } from './supabase'

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? 'https://chapcam.com').replace(/\/$/, '')

// Reads the real Jetons balance from the same endpoint as the native Profile.
// Returns null (never 0) when the balance cannot be loaded.
export function useJetonsBalance() {
  const [jetons, setJetons] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (!token) throw new Error('no-session')
      const res = await fetch(`${API_URL}/api/mobile/account-summary`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('unavailable')
      const json = await res.json()
      if (typeof json?.jetons !== 'number') throw new Error('unavailable')
      setJetons(json.jetons)
    } catch {
      setJetons(null)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  return { jetons, loading, error, reload: load }
}
