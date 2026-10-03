import { useCallback, useEffect, useState } from 'react'
import { fetchAccountSummary } from './accountSummary'

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
      const json = await fetchAccountSummary()
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
