import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
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

    // Recuperer l'abonnement (source du solde Live Swap).
    const { data: sub, error: fetchErr } = await admin
      .from('subscriptions')
      .select('id, points, max_points')
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchErr) {
      console.error('[live-minutes] fetch subscription:', fetchErr)
      return NextResponse.json({ error: 'Erreur lecture abonnement.' }, { status: 500 })
    }

    const now = new Date().toISOString()
    let newPoints: number

    if (sub) {
      const current = sub.points || 0
      newPoints = current + pointsToAdd
      // On releve le plafond si besoin pour ne jamais ecreter le cadeau admin.
      const newMax = Math.max(sub.max_points || 0, newPoints)
      const { error: updErr } = await admin
        .from('subscriptions')
        .update({ points: newPoints, max_points: newMax, updated_at: now })
        .eq('id', sub.id)
      if (updErr) {
        console.error('[live-minutes] update points:', updErr)
        return NextResponse.json({ error: 'Erreur mise a jour des points.' }, { status: 500 })
      }
    } else {
      // Pas d'abonnement : on en cree un minimal actif porteur des points offerts.
      newPoints = pointsToAdd
      const { error: insErr } = await admin.from('subscriptions').insert({
        user_id: userId,
        email,
        plan: 'bonus',
        is_active: true,
        status: 'active',
        points: newPoints,
        max_points: newPoints,
        updated_at: now,
      })
      if (insErr) {
        console.error('[live-minutes] insert subscription:', insErr)
        return NextResponse.json({ error: 'Erreur creation du solde.' }, { status: 500 })
      }
    }

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
