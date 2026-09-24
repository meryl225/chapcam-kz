import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveUserIdByEmail } from '@/lib/fulfillment'
import { addVoiceMessageCredits, getVoiceMessageBalance } from '@/lib/voice-message-quota'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ============================================================
// Ajout MANUEL de credits "Message Vocal" a un utilisateur (admin).
//
// 1 credit = 1 message vocal de 15 s max (texte->voix OU voix->voix,
// pool partage). Solde separe des jetons et des points Live Swap,
// stocke dans la table Neon `voice_message_credits`. On credite ici
// directement via addVoiceMessageCredits() (accumulation).
// Fourchette autorisee : 1 a 100 000 credits.
// ============================================================

const MIN_CREDITS = 1
const MAX_CREDITS = 100_000

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
    const credits = Number(body?.credits)

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
    }
    if (!Number.isInteger(credits) || credits < MIN_CREDITS || credits > MAX_CREDITS) {
      return NextResponse.json(
        { error: `Le nombre de messages vocaux doit etre un entier entre ${MIN_CREDITS} et ${MAX_CREDITS}.` },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    const userId = await resolveUserIdByEmail(admin, email)
    if (!userId) {
      return NextResponse.json({ error: `Aucun compte trouve pour ${email}.` }, { status: 404 })
    }

    const before = await getVoiceMessageBalance(userId)
    const balance = await addVoiceMessageCredits(userId, credits)

    return NextResponse.json({
      success: true,
      message: `+${credits.toLocaleString('fr-FR')} messages vocaux ajoutes a ${email}. Nouveau solde : ${balance.toLocaleString('fr-FR')} messages.`,
      creditsAdded: credits,
      balanceBefore: before.balance,
      balance,
    })
  } catch (e: any) {
    console.error('[admin/voice-messages] Error:', e)
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 })
  }
}
