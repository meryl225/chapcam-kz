import 'server-only'
import { rehostToBlob, setBlobPathname, type VideoTool } from '@/lib/video-history'

// ============================================================
// Auto-reparation de l'historique video.
//
// Contexte : a la generation, on re-heberge la video HeyGen/fal dans le Blob
// prive. Si ce re-hebergement echoue au moment unique ou le client detecte
// "completed" (timeout serverless, coupure...), la ligne est enregistree SANS
// blob -> elle apparait "Video expiree" alors que HeyGen garde la video ~7j.
//
// Ce module re-tente le re-hebergement A LA DEMANDE : on redemande une URL
// fraiche a HeyGen a partir de la reference stockee (provider_ref), puis on
// re-heberge et on met a jour la ligne. Resultat : la galerie se "repare" toute
// seule quand l'utilisateur l'ouvre, tant que la video est encore chez HeyGen.
// ============================================================

const HEYGEN_API = 'https://api.heygen.com'

/** Redemande a HeyGen une URL de telechargement fraiche pour une reference donnee. */
async function fetchFreshUrl(tool: VideoTool, ref: string): Promise<string | null> {
  const apiKey = process.env.HEYGEN_API_KEY
  if (!apiKey) return null
  try {
    if (tool === 'photo_video') {
      const res = await fetch(
        `${HEYGEN_API}/v1/video_status.get?video_id=${encodeURIComponent(ref)}`,
        { headers: { 'X-Api-Key': apiKey } },
      )
      if (!res.ok) return null
      const json = await res.json().catch(() => null)
      const data = json?.data || {}
      return data.status === 'completed' ? data.video_url || null : null
    }
    if (tool === 'translation') {
      const res = await fetch(
        `${HEYGEN_API}/v3/video-translations/${encodeURIComponent(ref)}`,
        { headers: { 'X-Api-Key': apiKey } },
      )
      if (!res.ok) return null
      const json = await res.json().catch(() => null)
      const data = json?.data || {}
      const raw = String(data.status || '').toLowerCase()
      const done = raw === 'success' || raw === 'completed'
      return done ? data.url || data.video_url || null : null
    }
  } catch {
    return null
  }
  return null
}

/**
 * Tente de reparer UNE ligne d'historique : recupere une URL fraiche, re-heberge
 * dans le Blob et met a jour la ligne. Retourne le pathname Blob ou null.
 * Best-effort : ne jette jamais.
 */
export async function repairVideoRow(input: {
  userId: string
  id: string
  tool: VideoTool
  providerRef: string
}): Promise<string | null> {
  const { userId, id, tool, providerRef } = input
  // Motion re-heberge depuis fal via un autre flux ; seuls les outils HeyGen
  // sont reparables ici a partir de la reference.
  if (tool !== 'photo_video' && tool !== 'translation') return null
  const freshUrl = await fetchFreshUrl(tool, providerRef)
  if (!freshUrl) return null
  const pathname = await rehostToBlob(freshUrl, userId, tool, providerRef)
  if (!pathname) return null
  try {
    await setBlobPathname(userId, id, pathname)
  } catch (e) {
    console.error('[video-repair] setBlobPathname echoue:', e)
    return null
  }
  return pathname
}
