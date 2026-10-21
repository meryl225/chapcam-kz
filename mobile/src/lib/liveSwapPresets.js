import Constants from 'expo-constants'
import { supabase } from './supabase'

// Portraits extracted from the reference sheet (no ring, check mark or glow), hosted
// permanently in the public Supabase bucket `avatars`, under `presets/v2/` (512×512 JPEG).
// Decart Lucy 2 accepts any character reference, including non-human ones, so all five are enabled.
const presetUrl = (id) => supabase.storage.from('avatars').getPublicUrl(`presets/v2/${id}.jpg`).data.publicUrl

export const PRESET_FACES = [
  { id: 'blonde', label: 'Blonde', order: 1 },
  { id: 'brune', label: 'Brune', order: 2 },
  { id: 'homme', label: 'Homme', order: 3 },
  { id: 'loutre', label: 'Loutre', order: 4 },
  { id: 'bebe', label: 'Bébé', order: 5 },
]
  .sort((a, b) => a.order - b.order)
  .map((p) => ({ ...p, url: presetUrl(p.id) }))

const MAX_BYTES = 2 * 1024 * 1024
const cache = new Map()

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = typeof reader.result === 'string' ? reader.result.split(',')[1] : null
      base64 ? resolve(base64) : reject(new Error('invalid image'))
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Downloads the preset and checks it is a usable reference image for Live Swap
// (JPEG/PNG, non-empty, reasonable size) before it can be selected.
export async function loadPresetFace(preset) {
  if (cache.has(preset.id)) return cache.get(preset.id)
  const res = await fetch(preset.url)
  if (!res.ok) throw new Error(`preset ${res.status}`)
  const type = res.headers.get('content-type') || ''
  if (!/^image\/(jpeg|png)/.test(type)) throw new Error('preset format')
  const blob = await res.blob()
  if (!blob.size || blob.size > MAX_BYTES) throw new Error('preset size')
  const face = { uri: preset.url, base64: await blobToBase64(blob), presetId: preset.id, source: 'preset' }
  cache.set(preset.id, face)
  return face
}

const FAVORITES_KEY = 'liveswap_favorites'

export async function getFavoriteIds() {
  const { data } = await supabase.auth.getUser()
  const ids = data?.user?.user_metadata?.[FAVORITES_KEY]
  return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string' && (id.startsWith('u:') || PRESET_FACES.some((p) => p.id === id))) : []
}

const WEB_URL = (process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? 'https://chapcam.com').replace(/\/$/, '')

async function facesRequest(method, body) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Session expirée. Reconnecte-toi.')
  const res = await fetch(`${WEB_URL}/api/mobile/live-faces`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Erreur réseau. Réessaie.')
  return json
}

// Imported faces are keyed `u:<uuid>` everywhere in the UI and in favorites, so they can never collide with presets.
const toUserFace = (f) => ({ key: `u:${f.id}`, id: f.id, url: f.url, createdAt: f.createdAt })

export async function listUserFaces() {
  const { faces } = await facesRequest('GET')
  return (faces ?? []).map(toUserFace)
}

export async function uploadUserFace(base64) {
  const { face } = await facesRequest('POST', { base64 })
  return toUserFace(face)
}

export async function deleteUserFaces(ids) {
  await facesRequest('DELETE', { ids })
}

export async function loadUserFace(userFace) {
  if (cache.has(userFace.key)) return cache.get(userFace.key)
  const res = await fetch(userFace.url)
  if (!res.ok) throw new Error(`face ${res.status}`)
  const blob = await res.blob()
  if (!blob.size || blob.size > 3 * 1024 * 1024) throw new Error('face size')
  const face = { uri: userFace.url, base64: await blobToBase64(blob), userFaceKey: userFace.key, source: 'upload' }
  cache.set(userFace.key, face)
  return face
}

export function forgetUserFace(key) {
  cache.delete(key)
}

export async function saveFavoriteIds(ids) {
  const { error } = await supabase.auth.updateUser({ data: { [FAVORITES_KEY]: ids } })
  if (error) throw error
}
