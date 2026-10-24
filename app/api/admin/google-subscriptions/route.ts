import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveUserIdByEmail } from '@/lib/fulfillment'
import { getPlan } from '@/lib/plans'
import { syncRevenueCatCustomer } from '@/lib/revenuecat'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

// Les abonnements de test Google Play se renouvellent toutes les quelques minutes :
// une periode de moins d'un jour ne peut pas etre un vrai abonnement payant.
const TEST_PERIOD_MS = 24 * 60 * 60 * 1000

type GoogleLog = {
  email: string | null
  product_id: string | null
  amount: number | null
  status: string | null
  source: string | null
  token: string | null
  created_at: string
}

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })

  try {
    const admin = createAdminClient()
    const { data: logs, error } = await admin
      .from('payment_logs')
      .select('email, product_id, amount, status, source, token, created_at')
      .like('token', 'google:%')
      .eq('credit_kind', 'subscription')
      .in('status', ['completed', 'revoked'])
      .order('created_at', { ascending: false })
      .limit(2000)
    if (error) throw error

    const byEmail = new Map<string, GoogleLog[]>()
    for (const log of (logs ?? []) as GoogleLog[]) {
      const email = log.email?.trim().toLowerCase()
      if (!email) continue
      byEmail.set(email, [...(byEmail.get(email) ?? []), log])
    }

    const emails = [...byEmail.keys()]
    const { data: subs } = emails.length
      ? await admin
          .from('subscriptions')
          .select('user_id, email, plan, is_active, status, expires_at, end_date')
          .in('email', emails)
      : { data: [] }
    const subByEmail = new Map((subs ?? []).map((s) => [String(s.email).toLowerCase(), s]))

    const now = Date.now()
    const accounts = emails.map((email) => {
      const history = byEmail.get(email)!
      const completed = history.filter((h) => h.status === 'completed')
      const last = history[0]
      const sub = subByEmail.get(email)
      const expiresAt = sub?.expires_at || sub?.end_date || null
      const expiresMs = expiresAt ? new Date(expiresAt).getTime() : 0
      const expired = expiresAt ? expiresMs < now : true
      const revoked = last.status === 'revoked' || sub?.status === 'revoked'
      const state = revoked ? 'revoked' : sub?.is_active && !expired ? 'active' : 'expired'
      const planId = sub?.plan || last.product_id
      const likelyTest = Boolean(expiresAt) && expiresMs - new Date(last.created_at).getTime() < TEST_PERIOD_MS
      return {
        email,
        userId: sub?.user_id ?? null,
        plan: planId,
        planName: getPlan(planId as string)?.name || planId || '—',
        state,
        likelyTest,
        expiresAt,
        lastOrderId: last.token?.replace(/^google:/, '') ?? null,
        lastPurchaseAt: last.created_at,
        purchases: completed.length,
        totalAmount: completed.reduce((sum, h) => sum + (h.amount || 0), 0),
      }
    })

    return NextResponse.json({ accounts }, { headers: NO_STORE })
  } catch (error) {
    console.error('[admin/google-subscriptions] Erreur:', error)
    return NextResponse.json({ error: 'Chargement impossible' }, { status: 500, headers: NO_STORE })
  }
}

// Re-verifie un compte aupres de Google Play (via RevenueCat) et resynchronise son abonnement.
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || email.length > 320) return NextResponse.json({ error: 'E-mail invalide' }, { status: 400, headers: NO_STORE })

  try {
    const admin = createAdminClient()
    const userId = await resolveUserIdByEmail(admin, email)
    if (!userId) return NextResponse.json({ error: 'Compte introuvable' }, { status: 404, headers: NO_STORE })

    const result = await syncRevenueCatCustomer(userId, { email, source: 'admin_google_verify' })
    const message = result.subscriptionActive
      ? 'Abonnement confirmé actif.'
      : 'Aucun abonnement actif pour ce compte.'
    return NextResponse.json({ message, subscriptionActive: result.subscriptionActive }, { headers: NO_STORE })
  } catch (error) {
    console.error('[admin/google-subscriptions] Verification echouee:', error)
    return NextResponse.json({ error: 'Vérification Google Play impossible pour le moment' }, { status: 502, headers: NO_STORE })
  }
}
