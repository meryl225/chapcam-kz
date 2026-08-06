import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'
import { getPlan } from '@/lib/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase()

// Actions admin_logs qui prouvent un credit legitime (paiement approuve
// manuellement ou don/attribution manuelle par l'admin).
const PROOF_ADMIN_ACTIONS = new Set([
  'manual_subscription',
  'manual_live_access',
  'manual_voice_minutes',
  'approve',
  'paydunya_approve',
  'nowpayments_approve',
  'relink',
])

// Actions admin_logs qui representent explicitement un DON / une attribution
// gratuite decidee par l'admin (donc "sans paiement" mais volontaire).
const GIFT_ADMIN_ACTIONS = new Set([
  'manual_subscription',
  'manual_live_access',
  'manual_voice_minutes',
])

// Lit TOUTES les lignes d'une table par pagination (le client Supabase plafonne
// a 1000 lignes par requete).
async function fetchAll<T = any>(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  columns: string,
): Promise<T[]> {
  const out: T[] = []
  const step = 1000
  let from = 0
  // Garde-fou : on ne boucle jamais indefiniment.
  for (let i = 0; i < 100; i++) {
    const { data, error } = await admin
      .from(table)
      .select(columns)
      .range(from, from + step - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    const rows = (data as T[]) || []
    out.push(...rows)
    if (rows.length < step) break
    from += step
  }
  return out
}

const isFreePlan = (p: unknown) => /^(free|gratuit|essai|trial|)$/i.test(String(p ?? ''))

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  try {
    const admin = createAdminClient()

    const [subs, payLogs, payReqs, adminLogs] = await Promise.all([
      fetchAll(admin, 'subscriptions', 'id, user_id, email, plan, amount, points, max_points, is_active, status, start_date, end_date, expires_at'),
      fetchAll(admin, 'payment_logs', 'email, credited'),
      fetchAll(admin, 'payment_requests', 'email, status'),
      fetchAll(admin, 'admin_logs', 'action, details'),
    ])

    // --- Construction des ensembles d'emails avec preuve ---
    // 1) Paiement PayDunya credite
    const paidEmails = new Set<string>()
    for (const l of payLogs as any[]) if (l.credited && l.email) paidEmails.add(norm(l.email))

    // 2) Demande de paiement approuvee
    const approvedReqEmails = new Set<string>()
    for (const p of payReqs as any[]) {
      if (norm(p.status) === 'approved' && p.email) approvedReqEmails.add(norm(p.email))
    }

    // 3) Journaux admin (approbation manuelle ou don)
    const adminProofEmails = new Set<string>()
    const giftEmails = new Set<string>()
    for (const a of adminLogs as any[]) {
      const email = norm(a?.details?.email)
      if (!email) continue
      if (PROOF_ADMIN_ACTIONS.has(a.action)) adminProofEmails.add(email)
      if (GIFT_ADMIN_ACTIONS.has(a.action)) giftEmails.add(email)
    }

    const now = Date.now()
    const audited = (subs as any[])
      .filter((s) => !isFreePlan(s.plan) && Number(s.amount) > 0)
      .map((s) => {
        const email = norm(s.email)
        const planCfg = getPlan(s.plan)
        const expiry = s.expires_at || s.end_date
        const expired = expiry ? new Date(expiry).getTime() < now : false

        const hasPaydunya = paidEmails.has(email)
        const hasApprovedReq = approvedReqEmails.has(email)
        const hasAdminProof = adminProofEmails.has(email)
        const isGift = giftEmails.has(email)

        // Sources de preuve trouvees, pour affichage.
        const proofs: string[] = []
        if (hasPaydunya) proofs.push('PayDunya credite')
        if (hasApprovedReq) proofs.push('Demande approuvee')
        if (hasAdminProof) proofs.push(isGift ? 'Attribution admin (don)' : 'Approbation admin')

        // Verdict :
        //  - 'verified'   : au moins une preuve de paiement/approbation
        //  - 'gift'       : attribution manuelle admin (volontaire, sans paiement)
        //  - 'unverified' : AUCUNE trace -> a examiner
        let verdict: 'verified' | 'gift' | 'unverified'
        if (hasPaydunya || hasApprovedReq || (hasAdminProof && !isGift)) verdict = 'verified'
        else if (isGift) verdict = 'gift'
        else verdict = 'unverified'

        return {
          id: s.id,
          email: s.email,
          plan: s.plan,
          planName: planCfg?.name || s.plan,
          amount: s.amount ?? planCfg?.price ?? 0,
          points: s.points ?? 0,
          maxPoints: s.max_points ?? planCfg?.points ?? 0,
          active: !!s.is_active && !expired,
          expired,
          startDate: s.start_date,
          expiresAt: expiry,
          proofs,
          verdict,
        }
      })

    // Tri : non verifies d'abord, puis dons, puis par montant decroissant.
    const order = { unverified: 0, gift: 1, verified: 2 } as const
    audited.sort((a, b) => order[a.verdict] - order[b.verdict] || (b.amount || 0) - (a.amount || 0))

    const stats = {
      totalPaid: audited.length,
      verified: audited.filter((a) => a.verdict === 'verified').length,
      gift: audited.filter((a) => a.verdict === 'gift').length,
      unverified: audited.filter((a) => a.verdict === 'unverified').length,
      unverifiedActive: audited.filter((a) => a.verdict === 'unverified' && a.active).length,
      unverifiedAmount: audited
        .filter((a) => a.verdict === 'unverified')
        .reduce((sum, a) => sum + (a.amount || 0), 0),
    }

    return NextResponse.json({ audited, stats })
  } catch (err: any) {
    console.error('[admin/payments/audit] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
