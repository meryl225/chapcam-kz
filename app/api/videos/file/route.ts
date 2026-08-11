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
    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
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
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    // ?download=1 -> force le telechargement (enregistrement mobile/ordinateur)
    // au lieu d'une lecture inline, avec un nom de fichier lisible.
    const wantsDownload = request.nextUrl.searchParams.get('download') === '1'
    const ext = result.blob.contentType.includes('webm') ? 'webm' : 'mp4'
    const downloadName = `chapcam-${(pathname.split('/').pop() || 'video').replace(/\.(mp4|webm)$/i, '')}.${ext}`

    const headers: Record<string, string> = {
      'Content-Type': result.blob.contentType,
      ETag: result.blob.etag,
      'Cache-Control': 'private, no-cache',
    }
    if (wantsDownload) {
      headers['Content-Disposition'] = `attachment; filename="${downloadName}"`
    }

    return new NextResponse(result.stream, { headers })
  } catch (error) {
    console.error('[videos/file] Erreur service video:', error)
    return NextResponse.json({ error: 'Échec du service de la vidéo' }, { status: 500 })
  }
}
