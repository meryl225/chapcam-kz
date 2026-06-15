import { NextResponse, type NextRequest } from 'next/server'
import { requireUserId, UnauthorizedError } from '@/lib/numbers/auth'
import { adjustWallet } from '@/lib/numbers/db'

// Rechargement du portefeuille.
// NOTE : crédit manuel en attendant l'intégration des API de paiement
// (Wave, Orange Money, carte, crypto). À sécuriser via webhook de paiement.
const MIN_XOF = 100
const MAX_XOF = 1_000_000

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = (await req.json().catch(() => ({}))) as { amountXof?: number; method?: string }
    const amount = Math.floor(Number(body.amountXof))
    const method = (body.method || 'Mobile Money').toString().slice(0, 40)
    if (!Number.isFinite(amount) || amount < MIN_XOF || amount > MAX_XOF) {
      return NextResponse.json({ error: `Montant invalide (entre ${MIN_XOF} et ${MAX_XOF} FCFA).` }, { status: 400 })
    }
    const balanceXof = await adjustWallet(userId, amount, {
      kind: 'deposit',
      method,
      reference: `TOPUP-${Date.now().toString(36).toUpperCase()}`,
    })
    return NextResponse.json({ balanceXof })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.log('[v0] wallet deposit error:', (e as Error)?.message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
