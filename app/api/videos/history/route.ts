import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listVideoHistory, deleteVideoHistory, type VideoTool } from '@/lib/video-history'
import { repairVideoRow } from '@/lib/video-history-repair'
import { getSignedStreamUrls } from '@/lib/cloudflare-stream'

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

    // On expose des URLs pretes a l'emploi :
    //  - player_url / poster_url : lecture via Cloudflare Stream (HLS adaptatif,
    //    signe, rapide en 3G, iOS natif) quand la video a un stream_uid ;
    //  - video_url : route Blob privee, conservee comme source de TELECHARGEMENT
    //    (master original) et comme repli de lecture si Stream absent.
    const videos = await Promise.all(
      items.map(async (v) => {
        const pathname = v.blob_pathname || healed.get(v.id) || null
        // Une ligne "processing" qui vient d'etre reparee est en realite terminee.
        const status = healed.has(v.id) ? 'completed' : v.status
        const blobUrl = pathname
          ? `/api/videos/file?pathname=${encodeURIComponent(pathname)}`
          : null

        // URLs de lecture Stream signees (jeton court, genere a chaque requete).
        // On expose le manifeste HLS signe (lecture dans un <video> natif +
        // hls.js) PLUTOT que l'iframe cloudflarestream.com : l'iframe tierce est
        // frequemment bloquee par les bloqueurs de pub / anti-pistage / cookies
        // tiers ("Ce contenu est bloqué"). Le HLS direct sur notre propre <video>
        // n'est pas une iframe tierce -> rien a bloquer.
        let hlsUrl: string | null = null
        let playerUrl: string | null = null
        let posterUrl: string | null = null
        if (v.stream_uid) {
          try {
            const urls = await getSignedStreamUrls(v.stream_uid, v.stream_customer_code)
            hlsUrl = urls.hls
            playerUrl = urls.iframe // repli ultime
            posterUrl = urls.thumbnail
          } catch {
            // En cas d'echec de signature, on retombera sur video_url (Blob).
          }
        }

        return {
          id: v.id,
          tool: v.tool,
          title: v.title,
          status,
          created_at: v.created_at,
          // Poster : miniature Stream signee en priorite, sinon miniature fournisseur.
          thumbnail_url: posterUrl || v.thumbnail_url,
          // Lecture prioritaire : HLS signe dans un <video> natif.
          hls_url: hlsUrl,
          // Repli ultime : iframe Stream (rare).
          player_url: playerUrl,
          // Telechargement (et repli de lecture) : master Blob.
          video_url: blobUrl,
        }
      }),
    )
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
