import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureLiveAccess } from '@/lib/live-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Le client envoie un battement toutes les ~5 s pendant la session.
// Le serveur fait foi sur le temps consomme (anti-triche).
// On plafonne l'ecart pour eviter qu'un long delai entre deux beats ne brule tout l'essai.
const MAX_ELAPSED_PER_BEAT = 15 // secondes

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie.' }, { status: 401 })
    }

    let action = 'beat'
    try {
      const body = await req.json()
      if (body?.action) action = String(body.action)
    } catch {
      /* corps vide : battement par defaut */
    }

    const admin = createAdminClient()
    const row = await ensureLiveAccess(admin, user.id)
    const now = Date.now()

    // --- Fenetre payante en cours ---
    const windowMs = row.active_window_expires_at
      ? new Date(row.active_window_expires_at).getTime()
      : 0
    if (windowMs > now) {
      const secondsRemaining = Math.max(0, Math.floor((windowMs - now) / 1000))
      return NextResponse.json({ mode: 'paid', secondsRemaining, stop: secondsRemaining <= 0 })
    }

    // La fenetre payante vient d'expirer
    if (row.active_window_expires_at && windowMs <= now) {
      return NextResponse.json({ mode: 'none', secondsRemaining: 0, stop: true })
    }

    // --- Mode essai gratuit ---
    if (row.trial_last_beat_at && row.trial_seconds_remaining > 0) {
      const last = new Date(row.trial_last_beat_at).getTime()
      const elapsed = Math.min(MAX_ELAPSED_PER_BEAT, Math.max(0, Math.floor((now - last) / 1000)))
      const remaining = Math.max(0, row.trial_seconds_remaining - elapsed)

      await admin
        .from('live_access')
        .update({
          trial_seconds_remaining: remaining,
          // sur 'stop' on libere le compteur pour ne pas continuer a debiter hors ligne
          trial_last_beat_at: action === 'stop' ? null : new Date(now).toISOString(),
          updated_at: new Date(now).toISOString(),
        })
        .eq('user_id', user.id)

      return NextResponse.json({
        mode: 'trial',
        secondsRemaining: remaining,
        stop: remaining <= 0,
      })
    }

    // Plus aucun acces
    return NextResponse.json({ mode: 'none', secondsRemaining: 0, stop: true })
  } catch (err: any) {
    console.error('[live/heartbeat] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
