import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Retourne le solde de minutes Voice Swap (ChapVoice) de l'utilisateur courant.
 * Source : table voice_subscriptions (creditee par le paiement PayDunya).
 * Distinct des "points" de Face Swap (table subscriptions).
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifie' }, { status: 401 })
    }

    const { data: sub } = await supabase
      .from('voice_subscriptions')
      .select('plan, seconds_remaining, seconds_total, expires_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!sub) {
      return NextResponse.json({
        success: true,
        plan: 'none',
        secondsRemaining: 0,
        secondsTotal: 0,
        minutesRemaining: 0,
        minutesTotal: 0,
        expiresAt: null,
        active: false,
      })
    }

    const isExpired = sub.expires_at ? new Date(sub.expires_at) < new Date() : false
    const secondsRemaining = isExpired ? 0 : sub.seconds_remaining ?? 0

    return NextResponse.json({
      success: true,
      plan: sub.plan ?? 'none',
      secondsRemaining,
      secondsTotal: sub.seconds_total ?? 0,
      minutesRemaining: Math.floor(secondsRemaining / 60),
      minutesTotal: Math.floor((sub.seconds_total ?? 0) / 60),
      expiresAt: sub.expires_at,
      active: secondsRemaining > 0,
    })
  } catch (error) {
    console.error('[VoiceSubscription] Error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
