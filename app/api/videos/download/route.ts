import { type NextRequest, NextResponse } from 'next/server'
import { getDownloadUrl, issueSignedToken, presignUrl } from '@vercel/blob'
import { verifyDownloadToken } from '@/lib/video-download-token'

// ============================================================
// ETAPE 2 du telechargement : SERVIR le fichier MP4.
//
// Le navigateur (ou le gestionnaire de telechargement iOS/Android) NAVIGUE
// vers cette URL. Aucune session requise : l'autorisation est dans le jeton
// signe `t` (10 min, un fichier, un utilisateur). Puis :
//   1) on genere une NOUVELLE signed URL du storage prive (jamais une URL
//      signee stockee en base -> impossible qu'elle soit expiree) ;
//   2) on verifie que le fichier existe (1 octet) ;
//   3) on REDIRIGE vers cette URL en mode telechargement (`?download=1`) : le
//      CDN sert le .mp4 avec `Content-Type: video/mp4` et
//      `Content-Disposition: attachment`. Simple, sans proxy ni streaming.
//
// Ce lien ne renvoie JAMAIS un 404/403 brut pour un fichier valide. En cas
// d'erreur (jeton expire, fichier disparu) on renvoie une PAGE HTML CLAIRE,
// pas un texte que le telephone enregistrerait dans un faux ".mp4".
// ============================================================
export const dynamic = 'force-dynamic'

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

    // 2) Le fichier existe-t-il ? On demande juste le premier octet au CDN.
    const probe = await fetch(presignedUrl, { headers: { Range: 'bytes=0-0' }, cache: 'no-store' })
    if (probe.status === 404 || probe.status === 410) {
      return errorPage('Vidéo introuvable', 'Ce fichier n’existe plus dans le stockage : il a peut-être été supprimé ou a expiré. Tu peux régénérer la vidéo depuis le studio.', 410)
    }

    // 3) SIMPLE : redirection vers l'URL signee en mode telechargement.
    //    Le CDN du storage repond lui-meme `Content-Type: video/mp4` +
    //    `Content-Disposition: attachment` (verifie) : le navigateur enregistre
    //    le .mp4 directement. Aucun proxy, aucun streaming via nos fonctions,
    //    donc rien qui puisse planter ou depasser une limite.
    return NextResponse.redirect(getDownloadUrl(presignedUrl), {
      status: 302,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('[videos/download] Erreur:', (error as Error)?.message, error)
    return errorPage('Téléchargement indisponible', 'Une erreur est survenue. Réessaie dans un instant.', 500)
  }
}
