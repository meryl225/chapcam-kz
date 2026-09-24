import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveUserIdByEmail } from '@/lib/fulfillment'
import { creditJetons, getJetonsBalance } from '@/lib/jetons'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ============================================================
// Ajout MANUEL de jetons a un utilisateur (admin).
//
// Les jetons sont le solde commun utilisable sur tous les outils sauf
// Live Swap (portefeuille `jetons_wallets` dans Neon). On credite ici
// directement ce portefeuille via creditJetons(), qui journalise aussi
// l'operation dans jetons_ledger.
// Fourchette autorisee : 1 a 1 000 000 jetons.
// ============================================================

const MIN_JETONS = 1
const MAX_JETONS = 1_000_000

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
    const jetons = Number(body?.jetons)

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
    }
    if (!Number.isInteger(jetons) || jetons < MIN_JETONS || jetons > MAX_JETONS) {
      return NextResponse.json(
        { error: `Le nombre de jetons doit etre un entier entre ${MIN_JETONS} et ${MAX_JETONS}.` },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    const userId = await resolveUserIdByEmail(admin, email)
    if (!userId) {
      return NextResponse.json({ error: `Aucun compte trouve pour ${email}.` }, { status: 404 })
    }

    const before = await getJetonsBalance(userId)
    const wallet = await creditJetons(userId, jetons, {
      source: 'admin_manual',
      email,
      addedBy: 'admin',
    })

    return NextResponse.json({
      success: true,
      message: `+${jetons.toLocaleString('fr-FR')} jetons ajoutes a ${email}. Nouveau solde : ${wallet.balance.toLocaleString('fr-FR')} jetons.`,
      jetonsAdded: jetons,
      balanceBefore: before.balance,
      balance: wallet.balance,
    })
  } catch (e: any) {
    console.error('[admin/jetons] Error:', e)
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 })
  }
}
