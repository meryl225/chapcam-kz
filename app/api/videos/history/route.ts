import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listVideoHistory, deleteVideoHistory, type VideoTool } from '@/lib/video-history'
import { repairVideoRow } from '@/lib/video-history-repair'

// L'auto-reparation peut re-heberger plusieurs videos (fetch HeyGen + upload
// Blob) : on laisse de la marge pour eviter un timeout serverless.
export const maxDuration = 120

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

    // AUTO-REPARATION : certaines lignes "completed" n'ont pas de blob (echec du
    // re-hebergement au moment de la generation). Tant que la video est encore
    // chez HeyGen (~7j), on la re-heberge a la demande ici. Borne a quelques
    // reparations par requete pour ne pas ralentir le chargement de la page ;
    // les videos restantes seront reparees aux prochains "Actualiser".
    const MAX_REPAIRS = 4
    const repairable = items.filter(
      (v) =>
        v.status === 'completed' &&
        !v.blob_pathname &&
        !!v.provider_ref, // tous les outils sont reparables (HeyGen + Kling/Motion)
    )
    const healed = new Map<string, string>()
    if (repairable.length > 0) {
      const batch = repairable.slice(0, MAX_REPAIRS)
      const results = await Promise.all(
        batch.map((v) =>
          repairVideoRow({
            userId: user.id,
            id: v.id,
            tool: v.tool,
            providerRef: v.provider_ref as string,
            title: v.title,
          }).catch(() => null),
        ),
      )
      batch.forEach((v, i) => {
        const p = results[i]
        if (p) healed.set(v.id, p)
      })
    }

    // On expose une URL pretes a l'emploi (route de service privee) au lieu du
    // pathname brut : le client n'a jamais besoin de connaitre le store Blob.
    const videos = items.map((v) => {
      const pathname = v.blob_pathname || healed.get(v.id) || null
      return {
        id: v.id,
        tool: v.tool,
        title: v.title,
        status: v.status,
        created_at: v.created_at,
        thumbnail_url: v.thumbnail_url,
        video_url: pathname
          ? `/api/videos/file?pathname=${encodeURIComponent(pathname)}`
          : null,
      }
    })
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
