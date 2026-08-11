import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listVideoHistory, deleteVideoHistory, type VideoTool } from '@/lib/video-history'

// Liste l'historique des videos generees par l'utilisateur courant.
// ?tool=photo_video|motion|translation pour filtrer (sinon tout).
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const toolParam = request.nextUrl.searchParams.get('tool')
  const tool = (['photo_video', 'motion', 'translation'] as const).includes(
    toolParam as VideoTool,
  )
    ? (toolParam as VideoTool)
    : undefined

  try {
    const items = await listVideoHistory(user.id, tool)
    // On expose une URL pretes a l'emploi (route de service privee) au lieu du
    // pathname brut : le client n'a jamais besoin de connaitre le store Blob.
    const videos = items.map((v) => ({
      id: v.id,
      tool: v.tool,
      title: v.title,
      status: v.status,
      created_at: v.created_at,
      thumbnail_url: v.thumbnail_url,
      video_url: v.blob_pathname
        ? `/api/videos/file?pathname=${encodeURIComponent(v.blob_pathname)}`
        : null,
    }))
    return NextResponse.json({ success: true, videos })
  } catch (error) {
    console.error('[videos/history] Erreur:', error)
    return NextResponse.json({ success: false, videos: [] })
  }
}

// Supprime une video de l'historique de l'utilisateur courant.
// Body JSON : { id: string }. La suppression efface aussi le fichier Blob.
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let id: string | null = null
  try {
    const body = await request.json()
    id = typeof body?.id === 'string' ? body.id : null
  } catch {
    // corps invalide
  }
  if (!id) {
    return NextResponse.json({ error: 'id manquant' }, { status: 400 })
  }

  try {
    const deleted = await deleteVideoHistory(user.id, id)
    if (!deleted) {
      return NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[videos/history] Erreur suppression:', error)
    return NextResponse.json({ error: 'Échec de la suppression' }, { status: 500 })
  }
}
