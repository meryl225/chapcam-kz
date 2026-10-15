import { supabase } from './supabase'

// Images hosted in the public Supabase bucket `avatars`, under `presets/v1/`.
// Portraits, animals and styles are original ChapCam creations (no real person);
// La Joconde is a public-domain work (Léonard de Vinci, reproduction Wikimedia Commons).
const presetUrl = (id) => supabase.storage.from('avatars').getPublicUrl(`presets/v1/${id}.jpg`).data.publicUrl

export const PRESET_FACES = [
  { id: 'clara', label: 'Clara', category: 'Réaliste' },
  { id: 'amara', label: 'Amara', category: 'Réaliste' },
  { id: 'lina', label: 'Lina', category: 'Réaliste' },
  { id: 'mei', label: 'Mei', category: 'Réaliste' },
  { id: 'kofi', label: 'Kofi', category: 'Réaliste' },
  { id: 'arjun', label: 'Arjun', category: 'Réaliste' },
  { id: 'mateo', label: 'Mateo', category: 'Réaliste' },
  { id: 'joconde', label: 'La Joconde', category: 'Historique' },
  { id: 'noble', label: 'Duchesse', category: 'Artistique' },
  { id: 'toon', label: 'Toon', category: 'Amusant' },
  { id: 'cyborg', label: 'Cyborg', category: 'Artistique' },
  { id: 'puppy', label: 'Chiot', category: 'Animal' },
  { id: 'cat', label: 'Chat', category: 'Animal' },
].map((p) => ({ ...p, url: presetUrl(p.id) }))

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
  return Array.isArray(ids) ? ids.filter((id) => PRESET_FACES.some((p) => p.id === id)) : []
}

export async function saveFavoriteIds(ids) {
  const { error } = await supabase.auth.updateUser({ data: { [FAVORITES_KEY]: ids } })
  if (error) throw error
}
