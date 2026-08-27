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

    // AUTO-REPARATION a la demande. Deux cas sont rattrapes ici :
    //  1) lignes "completed" sans blob (echec du re-hebergement initial) ;
    //  2) lignes "processing" ANCIENNES : l'utilisateur a ferme l'onglet avant
    //     que le fichier soit pret, donc la finalisation cote client n'a jamais
    //     eu lieu. repairVideoRow reinterroge le fournisseur et ne finalise que
    //     si la generation est reellement terminee (sinon no-op sur une vraie
    //     video encore en cours). Tant que la source fournisseur est valide
    //     (HeyGen ~7j, Kling ~30j) la video est recuperee et rendue permanente.
    // Borne a quelques reparations par requete pour ne pas ralentir la page ;
    // le reste sera repare aux prochains "Actualiser".
    const MAX_REPAIRS = 4
    const STALE_PROCESSING_MS = 3 * 60 * 1000 // 3 min : au-dela, on reconcilie
    const now = Date.now()
    const repairable = items.filter((v) => {
      if (!v.provider_ref) return false
      if (v.status === 'completed' && !v.blob_pathname) return true
      if (v.status === 'processing') {
        const age = now - new Date(v.created_at).getTime()
        return age > STALE_PROCESSING_MS
      }
      return false
    })
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
      // Une ligne "processing" qui vient d'etre reparee est en realite terminee.
      const status = healed.has(v.id) ? 'completed' : v.status
      return {
        id: v.id,
        tool: v.tool,
        title: v.title,
        status,
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
