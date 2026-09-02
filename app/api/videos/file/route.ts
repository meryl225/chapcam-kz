import { type NextRequest, NextResponse } from 'next/server'
import { getDownloadUrl, head, issueSignedToken, presignUrl } from '@vercel/blob'
import { createClient } from '@/lib/supabase/server'

// Sert une video de l'historique depuis le store Blob PRIVE.
//
// ARCHITECTURE (corrige le bug "500 en production uniquement") :
// On NE fait PLUS transiter les octets de la video a travers la fonction
// serverless. En production, les fonctions Vercel imposent une limite de taille
// de reponse (~4,5 Mo) absente du serveur de dev de la preview v0 -> toute video
// plus lourde renvoyait un 500 en prod alors que tout marchait en preview.
//
// A la place, comme le font les apps pro (URLs presignees facon S3) :
//   1) on authentifie l'utilisateur ET on verifie que le fichier lui appartient
//      (prefixe videos/<user_id>/) — securite STRICTEMENT identique a avant ;
//   2) on genere une URL presignee temporaire (1h) vers le store Blob prive ;
//   3) on redirige (303) le navigateur vers cette URL.
// Le CDN Blob sert alors les octets directement : Range/seek natifs, aucune
// limite de taille (gere meme les fichiers de 100+ Mo), et la fonction renvoie
// une reponse minuscule -> plus jamais de 500.
export const dynamic = 'force-dynamic'

// Duree de validite de l'URL presignee. Large marge pour lire une video en
// entier sans que le lien n'expire en cours de lecture.
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

  try {
    // Verifie l'existence du blob. `head` deduit prive/public du token, donc pas
    // d'option `access`. Les metadonnees stockees portent deja le bon
    // content-type video/* et `Content-Disposition: inline` (garanti par le
    // re-hebergement + le backfill), ce qui rend la lecture iOS/Safari fiable.
    const meta = await head(pathname).catch(() => null)
    if (!meta) {
      return new NextResponse('Introuvable', { status: 404 })
    }

    const validUntil = Date.now() + PRESIGN_TTL_MS

    // 1) Jeton signe autorisant UNIQUEMENT la lecture (get) de CE pathname.
    const token = await issueSignedToken({
      pathname,
      operations: ['get'],
      validUntil,
    })

    // 2) URL presignee temporaire vers le store prive. useCache:false -> lit
    //    l'origine (metadonnees a jour). Le content-type et la disposition
    //    proviennent des metadonnees stockees du blob (video/* + inline).
    const { presignedUrl } = await presignUrl(token, {
      operation: 'get',
      pathname,
      access: 'private',
      validUntil,
      useCache: false,
    })

    // 3a) MODE TELECHARGEMENT (?download=1) : TELECHARGEMENT EN 1 CLIC.
    //     Le navigateur NAVIGUE vers cette route (simple <a href>, aucun fetch
    //     JS), on le redirige vers l'URL presignee suffixee `?download=1` : le
    //     CDN Blob renvoie alors `Content-Disposition: attachment` (verifie),
    //     donc le navigateur ENREGISTRE le fichier au lieu de le lire.
    //     Pourquoi c'est la methode la plus fiable : une navigation n'est
    //     soumise ni a la CSP connect-src, ni au CORS, ni aux bloqueurs de
    //     fetch ; aucune copie en memoire (OK pour les gros fichiers et les
    //     mobiles) ; fonctionne sur iOS Safari, Android Chrome et desktop.
    if (request.nextUrl.searchParams.get('download') === '1') {
      return NextResponse.redirect(getDownloadUrl(presignedUrl), {
        status: 303,
        headers: { 'Cache-Control': 'private, no-store' },
      })
    }

    // 3b) MODE LECTURE (<video>) : redirection classique vers le CDN Blob.
    //     303 pour que la requete suivante soit bien un GET.
    return NextResponse.redirect(presignedUrl, {
      status: 303,
      headers: {
        // La redirection elle-meme ne doit pas etre mise en cache (l'URL
        // presignee expire) ; le CDN gere le cache des octets video.
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('[videos/file] Erreur service video:', error)
    return NextResponse.json(
      { error: 'Échec du service de la vidéo' },
      { status: 500 },
    )
  }
}
