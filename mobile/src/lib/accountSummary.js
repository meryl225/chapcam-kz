import { supabase } from './supabase'
import { API_URL } from './api'

// www.chapcam.com and http:// answer with a 308 redirect, and iOS drops the
// Authorization header on that hop: the server would then see no token (401).
const BASE_URL = API_URL
  .replace(/^http:\/\//i, 'https://')
  .replace(/^https:\/\/www\.chapcam\.com/i, 'https://chapcam.com')
const SUMMARY_URL = `${BASE_URL}/api/mobile/account-summary`

// kind: 'session' (token refused even after refresh -> user must sign in again),
// 'network' (no answer from the server), 'server' (HTTP error or bad payload).
export class AccountSummaryError extends Error {
  constructor(kind, detail) {
    super(detail ? `${kind}: ${detail}` : kind)
    this.kind = kind
    this.detail = detail || null
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function request(token) {
  try {
    return await fetch(SUMMARY_URL, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
  } catch {
    await wait(800)
    try {
      return await fetch(SUMMARY_URL, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
    } catch {
      throw new AccountSummaryError('network')
    }
  }
}

// Last known summary, shared by every screen so reopening one shows the balance instantly
// while a silent refresh runs; concurrent callers share one request.
let cachedSummary = null
let inFlight = null

export function getCachedAccountSummary() {
  return cachedSummary
}

export function clearAccountSummaryCache() {
  cachedSummary = null
  inFlight = null
}

export function fetchAccountSummary() {
  if (!inFlight) {
    const request = loadAccountSummary()
      .then((summary) => {
        if (inFlight === request) cachedSummary = summary
        return summary
      })
      .finally(() => {
        if (inFlight === request) inFlight = null
      })
    inFlight = request
  }
  return inFlight
}

async function loadAccountSummary() {
  const { data } = await supabase.auth.getSession()
  let token = data?.session?.access_token
  if (!token) throw new AccountSummaryError('session', 'aucune session')

  let res = await request(token)
  if (res.status === 401) {
    const refreshed = await supabase.auth.refreshSession().catch(() => null)
    token = refreshed?.data?.session?.access_token
    if (!token) throw new AccountSummaryError('session', 'rafraichissement refusé')
    res = await request(token)
    if (res.status === 401) throw new AccountSummaryError('session', 'HTTP 401')
  } else if (res.status >= 500) {
    await wait(800)
    res = await request(token)
  }

  if (!res.ok) throw new AccountSummaryError('server', `HTTP ${res.status}`)
  const json = await res.json().catch(() => null)
  if (!json || typeof json.jetons !== 'number') throw new AccountSummaryError('server', 'réponse invalide')
  return json
}

export function accountSummaryMessage(error) {
  if (!error) return null
  if (error.kind === 'session') return 'Session expirée. Reconnecte-toi pour voir tes soldes.'
  if (error.kind === 'network') return 'Connexion impossible. Vérifie ta connexion internet.'
  return `Soldes indisponibles${error.detail ? ` (${error.detail})` : ''}.`
}
