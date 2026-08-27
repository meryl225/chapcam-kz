import 'server-only'
import { finalizeCompletedVideo, type VideoTool } from '@/lib/video-history'
import { getMotionTask } from '@/lib/kling'

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

/**
 * Redemande au fournisseur une URL de telechargement fraiche pour une reference
 * donnee : HeyGen (photo_video / translation) ou Kling (motion).
 */
async function fetchFreshUrl(tool: VideoTool, ref: string): Promise<string | null> {
  try {
    // Motion : la source vit chez Kling (~30j). On interroge la tache par son id.
    if (tool === 'motion') {
      const task = await getMotionTask(ref).catch(() => null)
      return task?.status === 'succeeded' ? task.videoUrl || null : null
    }

    const apiKey = process.env.HEYGEN_API_KEY
    if (!apiKey) return null
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
  title?: string
}): Promise<string | null> {
  const { userId, tool, providerRef, title } = input
  // Tous les outils sont reparables : HeyGen (photo_video/translation) via
  // l'API de statut, Motion via la tache Kling (source valide ~30j).
  const freshUrl = await fetchFreshUrl(tool, providerRef)
  if (!freshUrl) return null
  // finalizeCompletedVideo gere le verrou anti-concurrence, le re-hebergement
  // (avec retries) et la mise a jour "completed" de la ligne existante.
  const fin = await finalizeCompletedVideo({
    userId,
    tool,
    providerRef,
    providerUrl: freshUrl,
    title: title || defaultTitle(tool),
  })
  if (fin.state !== 'ready') return null
  // La route d'historique attend le PATHNAME brut (elle le re-emballe ensuite
  // en URL de service). On le decode depuis l'URL renvoyee par finalize.
  const prefix = '/api/videos/file?pathname='
  return fin.url.startsWith(prefix) ? decodeURIComponent(fin.url.slice(prefix.length)) : null
}

// Titre par defaut si la ligne n'en a pas (rare).
function defaultTitle(tool: VideoTool): string {
  if (tool === 'photo_video') return 'Studio Photo en Vidéo'
  if (tool === 'translation') return 'Traduction Vidéo'
  return 'Motion Control'
}
