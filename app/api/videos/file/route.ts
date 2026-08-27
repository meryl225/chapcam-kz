import { type NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/blob'
import { createClient } from '@/lib/supabase/server'

// Sert une video de l'historique depuis le store Blob PRIVE.
// Securite : on exige un utilisateur authentifie ET on verifie que le pathname
// demande appartient bien a cet utilisateur (prefixe videos/<user_id>/).
// Ainsi personne ne peut lire les videos d'un autre compte en devinant un chemin.
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
  if (!pathname.startsWith(`videos/${user.id}/`)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  try {
    // Le <video> du navigateur envoie une requete "Range" (ex: bytes=0-) pour
    // pouvoir demarrer la lecture et permettre le seek. On la transmet telle
    // quelle au store Blob (qui supporte nativement les ranges) et on relaie
    // sa reponse partielle. SANS ca, la video restait bloquee a 0:00.
    const range = request.headers.get('range') ?? undefined

    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
      headers: range ? { Range: range } : undefined,
    })

    if (!result) {
      return new NextResponse('Introuvable', { status: 404 })
    }

    // Non modifie : le navigateur reutilise sa copie en cache.
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          'Cache-Control': 'private, max-age=3600',
        },
      })
    }

    // ?download=1 -> force le telechargement (enregistrement mobile/ordinateur)
    // au lieu d'une lecture inline, avec un nom de fichier lisible.
    const wantsDownload = request.nextUrl.searchParams.get('download') === '1'
    const ext = result.blob.contentType.includes('webm') ? 'webm' : 'mp4'
    const downloadName = `chapcam-${(pathname.split('/').pop() || 'video').replace(/\.(mp4|webm)$/i, '')}.${ext}`

    // Métadonnées de la reponse d'origine : taille totale, portion servie.
    const contentRange = result.headers.get('content-range') ?? undefined
    const contentLength =
      result.headers.get('content-length') ?? String(result.blob.size)

    const headers: Record<string, string> = {
      'Content-Type': result.blob.contentType,
      ETag: result.blob.etag,
      // Cache PRIVE autorise (jamais partage entre comptes). Chaque video a un
      // chemin unique et immuable -> on laisse le navigateur et le moteur media
      // stocker les portions d'octets. NE PAS utiliser `no-store` ni `no-cache`
      // ici : Safari/iOS en a besoin pour lire et seeker la video.
      'Cache-Control': 'private, max-age=3600',
      // Indispensable pour la lecture video : annonce la taille et le support
      // des requetes partielles (seek).
      'Accept-Ranges': 'bytes',
      'Content-Length': contentLength,
    }
    if (contentRange) {
      headers['Content-Range'] = contentRange
    }
    if (wantsDownload) {
      headers['Content-Disposition'] = `attachment; filename="${downloadName}"`
    }

    // 206 Partial Content quand le client a demande une portion (lecture/seek),
    // sinon 200 pour la reponse complete.
    const status = range && contentRange ? 206 : 200

    return new NextResponse(result.stream, { status, headers })
  } catch (error) {
    console.error('[videos/file] Erreur service video:', error)
    return NextResponse.json({ error: 'Échec du service de la vidéo' }, { status: 500 })
  }
}
