import Constants from 'expo-constants'
import { supabase } from './supabase'

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? 'https://chapcam.com').replace(/\/$/, '')

export async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Session expirée. Reconnecte-toi.')
  return token
}

export async function authHeaders(extra = {}) {
  return { ...extra, Authorization: `Bearer ${await getAccessToken()}` }
}

export async function apiFetch(path, init = {}) {
  const headers = await authHeaders(init.headers || {})
  return fetch(`${API_URL}${path}`, { ...init, headers })
}

export async function apiJson(path, init = {}) {
  const response = await apiFetch(path, init)
  const body = await response.json().catch(() => ({}))
  return { response, body }
}

export function apiForm(path, form, init = {}) {
  return apiFetch(path, { ...init, method: init.method || 'POST', body: form })
}

export async function readApiError(response, fallback = 'Une erreur est survenue.') {
  const body = await response.json().catch(() => ({}))
  return body.error || fallback
}

export const productionToolMap = {
  liveSwap: { endpoint: '/api/decart-token', provider: 'Decart', billing: '/api/points' },
  photoVideo: { endpoint: '/api/heygen/photo-video', provider: 'HeyGen', billing: 'server-side' },
  motion: { endpoint: '/api/motion', provider: 'Kling / motion backend', billing: 'server-side' },
  genjutsu: { endpoint: '/api/motion', provider: 'Kling / motion backend', billing: 'server-side' },
  videoTranslation: { endpoint: '/api/heygen/video-translation', provider: 'HeyGen', billing: 'server-side' },
  voiceMessages: { endpoint: '/api/voice/text-to-speech', provider: 'ElevenLabs', billing: '/api/voice/message-quota' },
  voiceChanger: { endpoint: '/api/voice/speech-to-speech', provider: 'ElevenLabs', billing: '/api/voice/message-quota' },
  chapVerify: { endpoint: '/api/chapverify', provider: 'ChapVerify backend', billing: 'server-side' },
}
