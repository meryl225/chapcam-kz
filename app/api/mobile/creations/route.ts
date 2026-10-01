import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { listVideoHistory } from '@/lib/video-history'
import { getSignedStreamUrls } from '@/lib/cloudflare-stream'
import { isVideoKey, signedPlaybackUrl } from '@/lib/r2'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

// The native app has no Supabase cookies: it authenticates with the session
// access token (Authorization: Bearer). Supabase validates the token and every
// query below is scoped to that user id only.
export async function GET(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })
  }

  try {
    const items = await listVideoHistory(user.id)
    const creations = await Promise.all(
      items.map(async (v) => {
        let videoUrl: string | null = null
        if (v.status === 'completed' && isVideoKey(v.r2_key)) {
          videoUrl = await signedPlaybackUrl(v.r2_key, 3600).catch(() => null)
        }

        let hlsUrl: string | null = null
        let posterUrl: string | null = null
        if (v.stream_uid) {
          try {
            const urls = await getSignedStreamUrls(v.stream_uid, v.stream_customer_code)
            hlsUrl = urls.hls
            posterUrl = urls.thumbnail
          } catch {
            // Poster/HLS are optional; the R2 file remains the playback source.
          }
        }

        return {
          id: v.id,
          tool: v.tool,
          title: v.title,
          status: v.status,
          created_at: v.created_at,
          thumbnail_url: posterUrl || v.thumbnail_url || null,
          playback_url: videoUrl || hlsUrl,
        }
      }),
    )
    return NextResponse.json({ creations }, { headers: NO_STORE })
  } catch (error) {
    console.error('[mobile/creations] Erreur:', error)
    return NextResponse.json({ error: 'Chargement impossible' }, { status: 500, headers: NO_STORE })
  }
}
