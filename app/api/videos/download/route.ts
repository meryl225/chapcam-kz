import { type NextRequest, NextResponse } from 'next/server'
import { issueSignedToken, presignUrl } from '@vercel/blob'
import { verifyDownloadToken } from '@/lib/video-download-token'

// ============================================================
// ETAPE 2 du telechargement : SERVIR le fichier MP4.
//
// Le navigateur (ou le gestionnaire de telechargement iOS/Android) NAVIGUE
// vers cette URL. Aucune session requise : l'autorisation est dans le jeton
// signe `t` (10 min, un fichier, un utilisateur). Puis :
//   1) on genere une NOUVELLE signed URL du storage prive (jamais une URL
//      signee stockee en base -> impossible qu'elle soit expiree) ;
//   2) on STREAME les octets a travers cette fonction en imposant nos propres
//      en-tetes : `Content-Type: video/mp4`, `Content-Disposition: attachment;
//      filename="chapcam-....mp4"`, `Accept-Ranges`, `Content-Length` ;
//   3) on relaie les requetes `Range` (206) : indispensable pour iOS, qui
//      telecharge souvent par morceaux, et pour la reprise de telechargement.
//
// Pourquoi streamer plutot que rediriger vers le storage : c'est le SEUL moyen
// de garantir le vrai nom de fichier .mp4 et le bon Content-Type sur tous les
// appareils (le storage impose son propre nom). Le streaming n'est pas soumis
// a la limite de 4,5 Mo des reponses Vercel (elle ne concerne que les reponses
// non streamees) -> les videos lourdes passent.
//
// Ce lien ne renvoie JAMAIS un 404/403 brut pour un fichier valide. En cas
// d'erreur (jeton expire, fichier disparu) on renvoie une PAGE HTML CLAIRE,
// pas un texte que le telephone enregistrerait dans un faux ".mp4".
// ============================================================
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // videos lourdes / connexions lentes

const PRESIGN_TTL_MS = 15 * 60 * 1000 // signed URL storage : 15 min, generee a l'instant

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
      // Surtout PAS de Content-Disposition ici : on veut afficher la page,
      // jamais l'enregistrer comme un fichier.
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t')
  if (!token) {
    return errorPage('Lien invalide', 'Ce lien de téléchargement est incomplet. Reviens sur « Mes vidéos » et clique de nouveau sur Télécharger.', 400)
  }

  const verified = verifyDownloadToken(token)
  if (!verified.ok) {
    if (verified.reason === 'expired') {
      return errorPage('Lien expiré', 'Ce lien de téléchargement n’est valable que 10 minutes. Reviens sur « Mes vidéos » et clique de nouveau sur Télécharger.', 410)
    }
    return errorPage('Lien invalide', 'Ce lien de téléchargement n’est pas valide. Reviens sur « Mes vidéos » et clique de nouveau sur Télécharger.', 400)
  }

  const { p: pathname, u: userId, f: filename } = verified.payload
  // Defense en profondeur : le chemin doit appartenir au proprietaire du jeton.
  if (!pathname.startsWith(`videos/${userId}/`)) {
    return errorPage('Accès refusé', 'Ce fichier ne t’appartient pas.', 403)
  }

  try {
    // 1) NOUVELLE signed URL vers le storage prive, generee maintenant.
    const validUntil = Date.now() + PRESIGN_TTL_MS
    const signed = await issueSignedToken({ pathname, operations: ['get'], validUntil })
    const { presignedUrl } = await presignUrl(signed, {
      operation: 'get',
      pathname,
      access: 'private',
      validUntil,
      useCache: false,
    })

    // 2) Recuperer les octets (en relayant un eventuel Range).
    const range = request.headers.get('range')
    const upstream = await fetch(presignedUrl, {
      headers: range ? { Range: range } : undefined,
      cache: 'no-store',
    })

    if (upstream.status === 404 || upstream.status === 410) {
      return errorPage('Vidéo introuvable', 'Ce fichier n’existe plus dans le stockage : il a peut-être été supprimé ou a expiré. Tu peux régénérer la vidéo depuis le studio.', 410)
    }
    if (upstream.status === 416) {
      return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${upstream.headers.get('content-length') ?? '*'}` } })
    }
    if (!upstream.ok || !upstream.body) {
      console.error('[videos/download] Storage HTTP', upstream.status, 'pour', pathname)
      return errorPage('Téléchargement indisponible', 'Le stockage n’a pas répondu correctement. Réessaie dans un instant.', 502)
    }

    // 3) En-tetes de telechargement maitrises par NOUS.
    const isWebm = /\.webm$/i.test(pathname)
    const contentType = isWebm ? 'video/webm' : 'video/mp4'
    const safeName = filename.replace(/[^\w.-]/g, '_')
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    })
    const len = upstream.headers.get('content-length')
    if (len) headers.set('Content-Length', len)
    const contentRange = upstream.headers.get('content-range')
    if (contentRange) headers.set('Content-Range', contentRange)

    // Streaming direct : aucune copie complete en memoire, pas de limite 4,5 Mo.
    return new NextResponse(upstream.body, { status: upstream.status === 206 ? 206 : 200, headers })
  } catch (error) {
    console.error('[videos/download] Erreur:', error)
    return errorPage('Téléchargement indisponible', 'Une erreur est survenue. Réessaie dans un instant.', 500)
  }
}
