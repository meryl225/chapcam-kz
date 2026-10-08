import { useCallback, useEffect, useState } from 'react'
import { fetchAccountSummary, getCachedAccountSummary } from './accountSummary'

const cachedJetons = () => getCachedAccountSummary()?.jetons ?? null

// Reads the real Jetons balance from the same endpoint as the native Profile.
// Returns null (never 0) when the balance cannot be loaded.
export function useJetonsBalance() {
  const [jetons, setJetons] = useState(cachedJetons)
  const [loading, setLoading] = useState(() => cachedJetons() === null)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(cachedJetons() === null)
    setError(false)
    try {
      const json = await fetchAccountSummary()
      setJetons(json.jetons)
    } catch {
      const previous = cachedJetons()
      setJetons(previous)
      setError(previous === null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  return { jetons, loading, error, reload: load }
}
