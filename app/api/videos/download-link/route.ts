import { type NextRequest, NextResponse } from 'next/server'
import { head } from '@vercel/blob'
import { createClient } from '@/lib/supabase/server'
import { getVideoHistoryItem } from '@/lib/video-history'
import { buildDownloadFilename, createDownloadToken } from '@/lib/video-download-token'

// ============================================================
// ETAPE 1 du telechargement : PREPARER le lien.
//
// Appelee en XHR (meme origine, avec les cookies de session) au clic sur
// "Telecharger". Elle :
//   1) authentifie l'utilisateur ;
//   2) recupere le CHEMIN PERMANENT du fichier depuis la base (par id), ou
//      valide un pathname fourni (doit appartenir a l'utilisateur) ;
//   3) verifie que le fichier EXISTE REELLEMENT dans le storage ;
//   4) renvoie un lien /api/videos/download?t=<jeton signe 10 min> + le nom
//      de fichier final (.mp4).
// Si le fichier n'existe plus, on renvoie une erreur JSON CLAIRE : le client
// affiche un message au lieu de lancer un telechargement voue a l'echec.
// ============================================================
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Session expirée. Reconnecte-toi puis réessaie.', code: 'unauthorized' }, { status: 401 })
  }

  let body: { id?: unknown; pathname?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    // corps vide / invalide -> gere ci-dessous
  }
  const id = typeof body.id === 'string' ? body.id : null
  const rawPathname = typeof body.pathname === 'string' ? body.pathname : null
  if (!id && !rawPathname) {
    return NextResponse.json({ error: 'Vidéo non précisée.', code: 'bad_request' }, { status: 400 })
  }

  try {
    // 2) Chemin PERMANENT : priorite a la base de donnees (source de verite).
    let pathname: string | null = null
    let tool = 'video'
    let refId = id ?? ''
    let createdAt: string | null = null

    if (id) {
      const item = await getVideoHistoryItem(user.id, id)
      if (!item) {
        return NextResponse.json(
          { error: 'Cette vidéo n’existe plus dans ton historique.', code: 'not_in_history' },
          { status: 404 },
        )
      }
      if (item.status !== 'completed') {
        return NextResponse.json(
          { error: 'La vidéo n’est pas encore prête. Réessaie dans quelques instants.', code: 'not_ready' },
          { status: 409 },
        )
      }
      pathname = item.blob_pathname
      tool = item.tool
      createdAt = item.created_at
    } else if (rawPathname) {
      // Repli (anciens appels par pathname) : n'accepter QUE les chemins de
      // l'utilisateur courant, jamais une URL.
      if (/^https?:\/\//i.test(rawPathname) || !rawPathname.startsWith(`videos/${user.id}/`)) {
        return NextResponse.json({ error: 'Accès refusé à ce fichier.', code: 'forbidden' }, { status: 403 })
      }
      pathname = rawPathname
      const m = rawPathname.match(/^videos\/[^/]+\/([^/]+)\/([^/]+?)(?:-\d+)?\.(mp4|webm)$/i)
      tool = m?.[1] ?? 'video'
      refId = m?.[2] ?? 'video'
    }

    if (!pathname) {
      return NextResponse.json(
        { error: 'Le fichier de cette vidéo est indisponible (copie permanente absente).', code: 'no_file' },
        { status: 410 },
      )
    }
    // Securite : le chemin stocke doit lui aussi appartenir a l'utilisateur.
    if (!pathname.startsWith(`videos/${user.id}/`)) {
      return NextResponse.json({ error: 'Accès refusé à ce fichier.', code: 'forbidden' }, { status: 403 })
    }

    // 3) Le fichier existe-t-il REELLEMENT dans le storage ?
    //    On ne renvoie "n'existe plus" QUE si l'API Blob repond explicitement
    //    "not found". Toute autre erreur (reseau, quota, token de prod ne
    //    couvrant pas cette operation...) NE DOIT PAS bloquer : les fichiers
    //    sont bien la (les miniatures se lisent), et c'est la route de
    //    streaming qui tranchera avec le CDN (410 si vraiment absent).
    let meta: Awaited<ReturnType<typeof head>> | null = null
    let definitelyMissing = false
    for (let attempt = 0; attempt < 2 && !meta && !definitelyMissing; attempt++) {
      try {
        meta = await head(pathname)
      } catch (e) {
        const err = e as { name?: string; message?: string; status?: number }
        const msg = `${err?.name ?? ''} ${err?.message ?? ''}`.toLowerCase()
        if (err?.name === 'BlobNotFoundError' || err?.status === 404 || msg.includes('not found') || msg.includes('does not exist')) {
          definitelyMissing = true
        } else {
          console.warn(`[videos/download-link] head() indisponible (essai ${attempt + 1}):`, err?.message)
        }
      }
    }
    if (definitelyMissing) {
      return NextResponse.json(
        {
          error: 'Ce fichier n’existe plus dans le stockage. Il a peut-être été supprimé ou a expiré.',
          code: 'missing_in_storage',
        },
        { status: 410 },
      )
    }

    // 4) Lien signe (autorisation portee par l'URL -> fonctionne meme si le
    //    gestionnaire de telechargement du telephone n'envoie pas les cookies).
    const filename = buildDownloadFilename({ tool, id: refId || pathname, createdAt, pathname })
    const token = createDownloadToken({ pathname, userId: user.id, filename })
    const url = `/api/videos/download?t=${encodeURIComponent(token)}`

    return NextResponse.json(
      { success: true, url, filename, size: meta?.size ?? null, contentType: meta?.contentType ?? 'video/mp4' },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    console.error('[videos/download-link] Erreur:', error)
    return NextResponse.json(
      { error: 'Impossible de préparer le téléchargement. Réessaie.', code: 'server_error' },
      { status: 500 },
    )
  }
}
