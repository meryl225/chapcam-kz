import { type NextRequest, NextResponse } from 'next/server'
import { head, issueSignedToken, presignUrl } from '@vercel/blob'
import { createClient } from '@/lib/supabase/server'

// Sert une video de l'historique depuis le store Blob PRIVE, en STREAMING
// same-origin.
//
// HISTORIQUE DES BUGS "marche en preview / casse en prod" :
//   1) Version d'origine : on bufferisait toute la video en memoire avant de la
//      renvoyer -> les fonctions Vercel imposent une limite de reponse ~4,5 Mo
//      (absente du dev v0) -> 500 en prod pour les gros clips.
//   2) Version suivante : on REDIRIGEAIT (303) le <video> vers l'URL presignee
//      du CDN Blob. Cross-origin sur un element media -> ECRAN NOIR en prod
//      (Safari + subtilites cache/redirect), alors que l'apercu v0 (qui retire
//      ces contraintes) l'acceptait.
//
// SOLUTION ACTUELLE : on relaie les octets DEPUIS NOTRE PROPRE ORIGINE, en
// streaming. Le navigateur ne voit qu'une seule URL same-origin (aucun
// redirect, aucun hote tiers a autoriser) -> comportement IDENTIQUE en preview
// et en prod. Le corps est passe en flux (`upstream.body`), donc jamais
// bufferise -> la limite 4,5 Mo ne s'applique pas. Le seek marche via le relais
// de l'en-tete Range (206 + Content-Range).
//   - Auth + verification de propriete (prefixe videos/<user_id>/) inchangees.
export const dynamic = 'force-dynamic'

// Duree de validite de l'URL presignee interne (usage serveur uniquement, non
// exposee au navigateur). Large marge pour lire une video entiere.
const PRESIGN_TTL_MS = 60 * 60 * 1000 // 1 heure

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const pathname = request.nextUrl.searchParams.get('pathname')
  if (!pathname) {
    return NextResponse.json({ error: 'pathname manquant' }, { status: 400 })
  }

  // Le chemin DOIT commencer par le prefixe de l'utilisateur courant.
  // C'est ce qui empeche un compte de lire les videos d'un autre en devinant
  // un chemin. (Verification inchangee par rapport a l'ancienne version.)
  if (!pathname.startsWith(`videos/${user.id}/`)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  // MODE TELECHARGEMENT (anciens liens `?download=1`) : on delegue a la route
  // unique /api/videos/download (Cloudflare R2).
  if (request.nextUrl.searchParams.get('download') === '1') {
    return NextResponse.redirect(
      new URL(`/api/videos/download?pathname=${encodeURIComponent(pathname)}`, request.nextUrl.origin),
      { status: 303, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  try {
    // Verifie l'existence du blob (2 essais : un hoquet reseau vers l'API Blob
    // ne doit pas produire un faux "introuvable"). `head` deduit prive/public
    // du token, donc pas d'option `access`. Les metadonnees stockees portent
    // deja le bon content-type video/* et `Content-Disposition: inline`.
    let meta = await head(pathname).catch(() => null)
    if (!meta) meta = await head(pathname).catch(() => null)
    if (!meta) {
      return NextResponse.json(
        { error: 'Ce fichier n’existe plus dans le stockage.' },
        { status: 410, headers: { 'Cache-Control': 'private, no-store' } },
      )
    }

    const validUntil = Date.now() + PRESIGN_TTL_MS

    // 1) Jeton signe autorisant UNIQUEMENT la lecture (get) de CE pathname.
    const token = await issueSignedToken({
      pathname,
      operations: ['get'],
      validUntil,
    })

    // 2) URL presignee temporaire vers le store prive. useCache:false -> lit
    //    l'origine (metadonnees a jour).
    const { presignedUrl } = await presignUrl(token, {
      operation: 'get',
      pathname,
      access: 'private',
      validUntil,
      useCache: false,
    })

    // 3) LECTURE : on PROXY les octets en STREAMING, en same-origin.
    //    On NE redirige PLUS le <video> vers le CDN Blob : une redirection
    //    cross-origin (*.private.blob.vercel-storage.com) sur un element media
    //    marche dans l'apercu v0 (indulgent) mais donne un ECRAN NOIR en
    //    production (Safari + subtilites cache/redirect sur les medias). En
    //    relayant le flux depuis notre propre origine, le navigateur ne voit
    //    qu'une seule URL same-origin -> comportement IDENTIQUE partout.
    //
    //    Le corps est renvoye en STREAM (on passe `upstream.body` directement) :
    //    les octets ne sont jamais bufferises en memoire par la fonction, donc
    //    la limite ~4,5 Mo des reponses serverless ne s'applique pas (c'etait la
    //    cause du 500 d'origine). Le seek video marche car on relaie l'en-tete
    //    `Range` et on renvoie le 206 + `Content-Range` du store.
    const range = request.headers.get('range')
    const upstream = await fetch(presignedUrl, {
      headers: range ? { Range: range } : {},
      // Pas de cache cote fetch : on veut les octets frais du store prive.
      cache: 'no-store',
    })

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json(
        { error: 'Ce fichier n’existe plus dans le stockage.' },
        { status: 410, headers: { 'Cache-Control': 'private, no-store' } },
      )
    }

    // On reconstruit des en-tetes propres pour la lecture <video> :
    //  - content-type video/* + disposition inline (depuis les metadonnees) ;
    //  - Accept-Ranges/Content-Range/Content-Length relayes pour le seek ;
    //  - cache PRIVE court (jamais `no-store` : Safari a besoin de mettre les
    //    portions d'octets en cache, sinon ecran noir).
    const headers = new Headers()
    headers.set('Content-Type', meta.contentType || 'video/mp4')
    headers.set('Content-Disposition', meta.contentDisposition || 'inline')
    headers.set('Accept-Ranges', 'bytes')
    headers.set('Cache-Control', 'private, max-age=3600')
    const contentRange = upstream.headers.get('content-range')
    if (contentRange) headers.set('Content-Range', contentRange)
    const contentLength = upstream.headers.get('content-length')
    if (contentLength) headers.set('Content-Length', contentLength)

    return new Response(upstream.body, {
      status: upstream.status, // 206 si Range, 200 sinon
      headers,
    })
  } catch (error) {
    console.error('[videos/file] Erreur service video:', error)
    return NextResponse.json(
      { error: 'Échec du service de la vidéo' },
      { status: 500 },
    )
  }
}
