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
const HIGGSFIELD_API = 'https://api.higgsfield.ai'

/**
 * En-tetes d'auth Higgsfield. L'endpoint de statut "/requests/{id}/status" exige
 * Authorization: "Key {id}:{secret}" (schema officiel OpenAPI). On envoie AUSSI
 * hf-api-key / hf-secret pour rester compatible avec la surface d'API legacy.
 * HIGGSFIELD_API_KEY est stockee au format "uuid:secret".
 */
function higgsfieldStatusHeaders(): Record<string, string> | null {
  const key = process.env.HIGGSFIELD_API_KEY
  if (!key) return null
  const idx = key.indexOf(':')
  if (idx === -1) return { 'hf-api-key': key, Authorization: `Key ${key}` }
  const id = key.slice(0, idx)
  const secret = key.slice(idx + 1)
  return { 'hf-api-key': id, 'hf-secret': secret, Authorization: `Key ${id}:${secret}` }
}

/**
 * Redemande a Higgsfield une URL fraiche pour une generation image->video ou un
 * transfert de mouvement Genjutsu. Higgsfield garde le resultat accessible via
 * son endpoint de statut, donc on peut recuperer une video terminee tant que la
 * copie permanente n'a pas encore ete faite.
 */
async function fetchFreshHiggsfieldUrl(ref: string): Promise<string | null> {
  const auth = higgsfieldStatusHeaders()
  if (!auth) return null
  try {
    const res = await fetch(`${HIGGSFIELD_API}/requests/${encodeURIComponent(ref)}/status`, {
      headers: auth,
    })
    if (!res.ok) return null
    const json = await res.json().catch(() => null)
    if (!json || json.status !== 'completed') return null
    // La video finale peut arriver sous plusieurs formes selon le modele.
    return (
      json.video?.url ||
      json.video_url ||
      json.result?.url ||
      json.result?.video?.url ||
      (Array.isArray(json.results) ? json.results[0]?.url || json.results[0]?.video?.url : null) ||
      json.output?.url ||
      json.output?.video?.url ||
      null
    )
  } catch {
    return null
  }
}

/**
 * Redemande au fournisseur une URL de telechargement fraiche pour une reference
 * donnee : HeyGen (photo_video / translation) ou Motion (Kling par defaut,
 * Higgsfield pour les anciennes generations).
 */
async function fetchFreshUrl(
  tool: VideoTool,
  ref: string,
  provider?: string,
): Promise<string | null> {
  try {
    // Genjutsu : toujours Higgsfield (transfert de mouvement).
    if (tool === 'genjutsu') {
      return await fetchFreshHiggsfieldUrl(ref)
    }
    // Motion : selon le fournisseur d'origine. Higgsfield (ancien) ou Kling.
    if (tool === 'motion') {
      if (provider === 'higgsfield') {
        return await fetchFreshHiggsfieldUrl(ref)
      }
      if (provider === 'kling') {
        // Kling : la source vit ~30j. On interroge la tache par son id.
        const task = await getMotionTask(ref).catch(() => null)
        return task?.status === 'succeeded' ? task.videoUrl || null : null
      }
      // Fournisseur INCONNU : c'est le cas quand la reparation est declenchee
      // depuis « Mes creations » (la ligne video_history ne stocke pas le
      // fournisseur). On tente Kling (Motion Control) puis Higgsfield
      // (image->video) : l'un des deux repond pour toute generation Motion.
      const task = await getMotionTask(ref).catch(() => null)
      if (task?.status === 'succeeded' && task.videoUrl) return task.videoUrl
      return await fetchFreshHiggsfieldUrl(ref)
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
  // Fournisseur d'origine (utile pour Motion : 'kling' ou 'higgsfield').
  provider?: string
}): Promise<string | null> {
  const { userId, tool, providerRef, title, provider } = input
  // Tous les outils sont reparables : HeyGen (photo_video/translation) via
  // l'API de statut, Motion via Kling (~30j) ou Higgsfield (anciennes videos).
  const freshUrl = await fetchFreshUrl(tool, providerRef, provider)
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
  if (tool === 'genjutsu') return 'Genjutsu'
  return 'Motion Control'
}
