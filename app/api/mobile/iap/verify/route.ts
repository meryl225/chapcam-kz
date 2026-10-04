import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { applyAppleTransaction, verifyAppleTransaction, type AppleApplyResult } from '@/lib/apple-iap'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }
const MAX_TRANSACTIONS = 20

// L'app envoie les transactions StoreKit 2 signees (JWS) apres un achat ou une
// restauration. Rien n'est credite tant qu'Apple n'a pas signe la transaction.
export async function POST(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })
  }
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })
  }

  const body = await request.json().catch(() => null)
  const signed: unknown = body?.transactions
  if (!Array.isArray(signed) || signed.length === 0 || signed.length > MAX_TRANSACTIONS || !signed.every((s) => typeof s === 'string' && s.length < 20000)) {
    return NextResponse.json({ error: 'Transactions invalides' }, { status: 400, headers: NO_STORE })
  }

  const admin = createAdminClient()
  const source = body?.source === 'restore' ? 'apple_restore' : 'apple_purchase'
  const results: (AppleApplyResult & { jws: number })[] = []
  for (const [index, jws] of (signed as string[]).entries()) {
    try {
      const tx = await verifyAppleTransaction(jws)
      results.push({ jws: index, ...(await applyAppleTransaction(admin, tx, { userId: user.id, email: user.email, source })) })
    } catch (error) {
      console.error('[mobile/iap/verify] Transaction refusee:', (error as Error).message)
      results.push({ jws: index, status: 'rejected', productId: null, transactionId: null, expiresAt: null, reason: 'Signature Apple invalide' })
    }
  }

  return NextResponse.json({
    results,
    active: results.some((r) => r.status === 'activated' || r.status === 'already'),
  }, { headers: NO_STORE })
}
