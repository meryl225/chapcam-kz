import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getVideoHistoryItem, getVideoHistoryItemByPath } from '@/lib/video-history'
import { headVideo, isVideoKey, signedDownloadUrl } from '@/lib/r2'

// ============================================================
// TELECHARGEMENT D'UNE VIDEO — une seule route, Cloudflare R2 uniquement.
//
//   GET /api/videos/download?id=<id video_history>
//
//   1) session utilisateur (cookie) ;
//   2) cle R2 PERMANENTE relue en base (jamais une URL signee) ;
//   3) l'objet existe-t-il vraiment dans le bucket ? (HeadObject) ;
//   4) NOUVELLE URL signee R2 generee a l'instant (10 min) avec
//      Content-Type: video/mp4 + Content-Disposition: attachment; filename=….mp4 ;
//   5) redirection : le navigateur enregistre le .mp4 directement
//      (iPhone Safari, Android, ordinateur).
//
// Toute erreur renvoie une PAGE HTML claire (jamais un 404/403 brut que le
// telephone enregistrerait dans un faux ".mp4").
// ============================================================
export const dynamic = 'force-dynamic'

function errorPage(title: string, message: string, status: number): NextResponse {
  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · ChapCam</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0f14;color:#e6edf3;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:24px}
  .card{max-width:420px;width:100%;background:#121821;border:1px solid #233041;border-radius:16px;padding:28px;text-align:center}
  h1{font-size:18px;margin:0 0 10px}
  p{font-size:14px;line-height:1.55;color:#a9b4c0;margin:0 0 18px}
  a{display:inline-block;background:#c6f542;color:#000;font-weight:600;text-decoration:none;padding:10px 16px;border-radius:10px;font-size:14px}
</style></head>
<body><main class="card"><h1>${title}</h1><p>${message}</p><a href="/dashboard">Retour au tableau de bord</a></main></body></html>`
  return new NextResponse(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function buildFilename(tool: string, id: string, createdAt: string | Date | null): string {
  const d = createdAt ? new Date(createdAt) : new Date()
  const ymd = Number.isNaN(d.getTime()) ? '' : `-${d.toISOString().slice(0, 10).replace(/-/g, '')}`
  return `chapcam-${tool}${ymd}-${id.slice(0, 8)}.mp4`
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim()
  const path = request.nextUrl.searchParams.get('pathname')?.trim()
  if (!id && !path) {
    return errorPage('Lien invalide', 'Ce lien de téléchargement est incomplet. Reviens sur « Mes vidéos » et clique de nouveau sur Télécharger.', 400)
  }

  // 1) Session.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return errorPage('Connexion requise', 'Ta session a expiré. Reconnecte-toi puis reviens sur « Mes vidéos » pour télécharger.', 401)
  }

  try {
    // 2) Cle permanente depuis la base (filtree par proprietaire).
    const item = id
      ? await getVideoHistoryItem(user.id, id)
      : await getVideoHistoryItemByPath(user.id, path as string)
    if (!item) {
      return errorPage('Vidéo introuvable', 'Cette vidéo n’existe pas dans ton historique.', 404)
    }
    const key = item.r2_key
    if (!isVideoKey(key)) {
      // Ancienne video pas encore migree dans R2.
      return errorPage('Vidéo en cours de migration', 'Cette vidéo est en cours de transfert vers le nouveau stockage. Réessaie dans quelques minutes.', 503)
    }

    // 3) Existence REELLE dans le bucket.
    const meta = await headVideo(key)
    if (!meta) {
      return errorPage('Vidéo introuvable', 'Ce fichier n’existe plus dans le stockage : il a peut-être été supprimé. Tu peux régénérer la vidéo depuis le studio.', 410)
    }

    // 4) + 5) URL signee fraiche -> redirection.
    const filename = buildFilename(item.tool, item.id, item.created_at)
    const url = await signedDownloadUrl(key, filename, 600)
    return NextResponse.redirect(url, { status: 302, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const err = error as { name?: string; message?: string; Code?: string; $metadata?: { httpStatusCode?: number } }
    // Cause technique visible (sans aucun secret) : indispensable pour
    // diagnostiquer la production, ou le message generique cachait tout.
    const cause = [err?.name, err?.Code, err?.$metadata?.httpStatusCode, err?.message]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 200)
    console.error('[videos/download] Erreur:', cause)
    return errorPage('Téléchargement indisponible', `Une erreur est survenue. Réessaie dans un instant. (${cause || 'erreur inconnue'})`, 500)
  }
}
