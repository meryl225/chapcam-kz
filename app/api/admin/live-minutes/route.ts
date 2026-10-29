import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_EMAIL, isAdminRequest } from '@/lib/admin-auth'
import { creditPoints } from '@/lib/points-ledger'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveUserIdByEmail } from '@/lib/fulfillment'
import { POINTS_PER_SECOND_SD } from '@/lib/swap-pricing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ============================================================
// Ajout MANUEL de minutes Live Swap a un utilisateur (admin).
//
// IMPORTANT : le Live Swap consomme le solde `points` de la table
// `subscriptions` (2 points/seconde en 720p). C'est ce compteur que voit
// l'utilisateur sur la page Live. On credite donc des POINTS ici :
//   1 minute = 60 s x 2 pts/s = 120 points.
// Les points s'accumulent au solde existant et ne se decomptent qu'a
// l'utilisation reelle (rien ne se perd si l'utilisateur est hors ligne).
// Fourchette autorisee : 1 a 1000 minutes.
// ============================================================

const MIN_MINUTES = 1
const MAX_MINUTES = 1000
const POINTS_PER_MINUTE = POINTS_PER_SECOND_SD * 60 // 120 points / minute (720p)

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body?.email || '').trim()
    const minutes = Number(body?.minutes)

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
    }
    if (!Number.isInteger(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES) {
      return NextResponse.json(
        { error: `Le nombre de minutes doit etre un entier entre ${MIN_MINUTES} et ${MAX_MINUTES}.` },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    const userId = await resolveUserIdByEmail(admin, email)
    if (!userId) {
      return NextResponse.json({ error: `Aucun compte trouve pour ${email}.` }, { status: 404 })
    }

    const pointsToAdd = minutes * POINTS_PER_MINUTE

    const { data: sub, error: fetchErr } = await admin
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchErr) {
      console.error('[live-minutes] fetch subscription:', fetchErr)
      return NextResponse.json({ error: 'Erreur lecture abonnement.' }, { status: 500 })
    }

    if (!sub) {
      // Pas d'abonnement : ligne minimale active, creditee ensuite par credit_points().
      const { error: insErr } = await admin.from('subscriptions').insert({
        user_id: userId,
        email,
        plan: 'bonus',
        is_active: true,
        status: 'active',
        points: 0,
        max_points: 0,
        updated_at: new Date().toISOString(),
      })
      if (insErr) {
        console.error('[live-minutes] insert subscription:', insErr)
        return NextResponse.json({ error: 'Erreur creation du solde.' }, { status: 500 })
      }
    }

    // Chaque ajout est journalise (qui, quand, combien) dans points_ledger, et
    // les ajouts superieurs a 3 h levent une alerte dans credit_alerts.
    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const credit = await creditPoints(admin, {
      userId,
      delta: pointsToAdd,
      kind: 'admin_grant',
      source: 'admin:live-minutes',
      actor: `admin:${ADMIN_EMAIL}`,
      meta: { email, minutes, ip: forwardedFor },
    })
    const newPoints = credit.balance

    const totalMinutes = Math.floor(newPoints / POINTS_PER_MINUTE)

    return NextResponse.json({
      success: true,
      message: `+${minutes} min Live Swap ajoutees a ${email} (+${pointsToAdd} points). Solde total : ${newPoints} points (~${totalMinutes} min de Live Swap en 720p).`,
      pointsAdded: pointsToAdd,
      pointsTotal: newPoints,
      minutesTotal: totalMinutes,
    })
  } catch (e: any) {
    console.error('[live-minutes] Error:', e)
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 })
  }
}
