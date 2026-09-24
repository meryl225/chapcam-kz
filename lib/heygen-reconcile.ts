import 'server-only'
import {
  listAllProcessingGenerations,
  finalizeCompletedVideo,
  saveVideoHistory,
} from '@/lib/video-history'

// ============================================================
// Reconciliation SERVEUR des generations "Studio Photo en Video" (HeyGen).
//
// POURQUOI : chaque appel a HeyGen debite des credits DES la creation de la
// video, bien avant qu'elle soit prete. Si l'utilisateur ferme l'onglet pendant
// le rendu ET que le webhook n'aboutit pas, la video est FACTUREE mais reste
// "processing" cote app : elle n'apparait jamais, l'utilisateur croit a un echec
// et relance -> double (voire triple) facturation.
//
// Ce module interroge HeyGen pour chaque job "processing" et :
//   - finalise (re-hebergement Blob permanent) les videos terminees ;
//   - marque en echec les videos reellement echouees ;
//   - debloque en echec les jobs "coinces" depuis trop longtemps.
// Il est appele par le cron (toutes les 5 min) pour couvrir les utilisateurs qui
// ne reviennent jamais sur la page, en complement de la reconciliation au
// chargement de la page et du webhook.
// ============================================================

const HEYGEN_API = 'https://api.heygen.com'
// Au-dela de ce delai sans statut exploitable, on debloque le job en echec.
const STUCK_MS = 30 * 60 * 1000

export interface HeygenReconcileResult {
  checked: number
  completed: number
  failed: number
  stillProcessing: number
}

export async function reconcileProcessingPhotoVideos(
  limit = 40,
): Promise<HeygenReconcileResult> {
  const apiKey = process.env.HEYGEN_API_KEY
  const out: HeygenReconcileResult = { checked: 0, completed: 0, failed: 0, stillProcessing: 0 }
  if (!apiKey) return out

  const pending = await listAllProcessingGenerations('photo_video', {
    limit,
    minAgeSeconds: 90,
    maxAgeHours: 24,
  }).catch(() => [])
  out.checked = pending.length

  for (const job of pending) {
    try {
      const r = await fetch(
        `${HEYGEN_API}/v1/video_status.get?video_id=${encodeURIComponent(job.providerRef)}`,
        { headers: { 'X-Api-Key': apiKey } },
      )
      const j = await r.json().catch(() => null)
      const d = j?.data || {}

      if (d.status === 'completed' && d.video_url) {
        await finalizeCompletedVideo({
          userId: job.userId,
          tool: 'photo_video',
          providerRef: job.providerRef,
          providerUrl: d.video_url,
          title: 'Studio Photo en Vidéo',
          thumbnailUrl: d.thumbnail_url || null,
        }).catch(() => {})
        out.completed++
      } else if (d.status === 'failed') {
        await saveVideoHistory({
          userId: job.userId,
          tool: 'photo_video',
          providerRef: job.providerRef,
          blobPathname: null,
          title: 'Studio Photo en Vidéo',
          status: 'failed',
        }).catch(() => {})
        out.failed++
      } else {
        const ageMs = Date.now() - new Date(job.createdAt).getTime()
        if (ageMs > STUCK_MS && (!d.status || d.status === 'unknown')) {
          await saveVideoHistory({
            userId: job.userId,
            tool: 'photo_video',
            providerRef: job.providerRef,
            blobPathname: null,
            title: 'Studio Photo en Vidéo',
            status: 'failed',
          }).catch(() => {})
          out.failed++
        } else {
          out.stillProcessing++
        }
      }
    } catch {
      out.stillProcessing++
    }
  }

  return out
}
