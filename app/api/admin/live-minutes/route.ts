import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveUserIdByEmail } from '@/lib/fulfillment'
import { addLiveMinutes } from '@/lib/live-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ============================================================
// Ajout MANUEL de minutes Live Swap a un utilisateur (admin).
// Mode "immediat" : les minutes prolongent la fenetre active tout de suite
// (ou en demarrent une maintenant). Le decompte s'ecoule des l'ajout.
// Fourchette autorisee : 1 a 1000 minutes.
// ============================================================

const MIN_MINUTES = 1
const MAX_MINUTES = 1000

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
      return NextResponse.json(
        { error: `Aucun compte trouve pour ${email}.` },
        { status: 404 },
      )
    }

    const { secondsRemaining, expiresAt } = await addLiveMinutes(admin, userId, minutes)
    const minutesRemaining = Math.round(secondsRemaining / 60)

    return NextResponse.json({
      success: true,
      message: `+${minutes} min Live Swap ajoutees a ${email}. Temps restant : ~${minutesRemaining} min (expire a ${new Date(
        expiresAt,
      ).toLocaleString('fr-FR')}).`,
      secondsRemaining,
      expiresAt,
    })
  } catch (e: any) {
    console.error('[live-minutes] Error:', e)
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 })
  }
}
