import { supabase } from './supabase'
import { API_URL } from './api'

// Same host normalisation as accountSummary.js: a redirect would drop the Authorization header.
const BASE_URL = API_URL
  .replace(/^http:\/\//i, 'https://')
  .replace(/^https:\/\/www\.chapcam\.com/i, 'https://chapcam.com')
const ACTIVITY_URL = `${BASE_URL}/api/mobile/activity`

function request(token) {
  return fetch(ACTIVITY_URL, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
}

export async function fetchActivity() {
  const { data } = await supabase.auth.getSession()
  let token = data?.session?.access_token
  if (!token) throw new Error('session')

  let res = await request(token)
  if (res.status === 401) {
    const refreshed = await supabase.auth.refreshSession().catch(() => null)
    token = refreshed?.data?.session?.access_token
    if (!token) throw new Error('session')
    res = await request(token)
  }
  if (!res.ok) throw new Error(res.status === 401 ? 'session' : 'server')

  const json = await res.json().catch(() => null)
  if (!json || !Array.isArray(json.items)) throw new Error('server')
  return json.items
}
