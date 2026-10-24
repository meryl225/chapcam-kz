import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { isAdminRequest } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlan } from '@/lib/plans'
import { getLiveOffer } from '@/lib/live-offers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }
const PAGE_SIZE = 1000
const MAX_PAGES = 20

const MANUAL_ACTIONS = ['manual_subscription', 'manual_live_access', 'manual_voice_minutes', 'geniuspay_manual_credit'] as const

export type ManualCreditKind = 'subscription' | 'live' | 'voice' | 'geniuspay' | 'jetons'

export type ManualCredit = {
  id: string
  kind: ManualCreditKind
  email: string
  label: string
  detail: string
  creditedAt: string
  endDate: string | null
  adminEmail: string | null
}

type AdminLog = {
  id: string | number
  action: (typeof MANUAL_ACTIONS)[number]
  admin_email: string | null
  payment_request_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v))
const num = (v: unknown) => Number(v) || 0
const planName = (id: string) => getPlan(id)?.name || id || '—'

async function fetchManualLogs(admin: ReturnType<typeof createAdminClient>) {
  const rows: AdminLog[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await admin
      .from('admin_logs')
      .select('id, action, admin_email, payment_request_id, details, created_at')
      .in('action', MANUAL_ACTIONS as unknown as string[])
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    rows.push(...((data || []) as AdminLog[]))
    if (!data || data.length < PAGE_SIZE) break
  }
  return rows
}

async function fetchManualJetons(): Promise<ManualCredit[]> {
  if (!process.env.DATABASE_URL) return []
  const sql = neon(process.env.DATABASE_URL)
  const rows = (await sql`
    SELECT id, amount, meta, created_at
    FROM jetons_ledger
    WHERE kind = 'credit' AND meta->>'source' = 'admin_manual'
    ORDER BY created_at DESC
    LIMIT 5000
  `) as { id: string; amount: number; meta: Record<string, unknown> | null; created_at: string }[]
  return rows.map((r) => ({
    id: `jetons-${r.id}`,
    kind: 'jetons',
    email: str(r.meta?.email).toLowerCase(),
    label: 'Jetons',
    detail: `+${num(r.amount).toLocaleString('fr-FR')} jetons`,
    creditedAt: new Date(r.created_at).toISOString(),
    endDate: null,
    adminEmail: null,
  }))
}

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })

  try {
    const admin = createAdminClient()
    const [logs, jetons] = await Promise.all([
      fetchManualLogs(admin),
      fetchManualJetons().catch((e) => {
        console.error('[admin/manual-credits] Jetons ledger:', e)
        return [] as ManualCredit[]
      }),
    ])

    const requestIds = logs.filter((l) => l.action === 'geniuspay_manual_credit' && l.payment_request_id).map((l) => l.payment_request_id as string)
    const requestEmails = new Map<string, string>()
    if (requestIds.length) {
      const { data } = await admin.from('payment_requests').select('id, email').in('id', requestIds)
      for (const r of data || []) requestEmails.set(String(r.id), str(r.email).toLowerCase())
    }

    const fromLogs: ManualCredit[] = logs.map((log) => {
      const d = log.details || {}
      const base = {
        id: `log-${log.id}`,
        creditedAt: log.created_at,
        adminEmail: log.admin_email,
        email: str(d.email).toLowerCase(),
        endDate: null as string | null,
      }
      switch (log.action) {
        case 'manual_subscription':
          return {
            ...base,
            kind: 'subscription',
            label: planName(str(d.plan)),
            detail: `${num(d.points).toLocaleString('fr-FR')} points`,
            endDate: str(d.end_date) || null,
          }
        case 'manual_live_access': {
          const windows = num(d.windows) || 1
          return {
            ...base,
            kind: 'live',
            label: getLiveOffer(str(d.offer))?.name || 'Accès Live',
            detail: `${windows} fenêtre${windows > 1 ? 's' : ''}`,
          }
        }
        case 'manual_voice_minutes': {
          const days = num(d.validityDays)
          const end = days ? new Date(new Date(log.created_at).getTime() + days * 86_400_000).toISOString() : null
          return { ...base, kind: 'voice', label: 'Voice Swap', detail: `${num(d.minutes)} min`, endDate: end }
        }
        case 'geniuspay_manual_credit':
          return {
            ...base,
            kind: 'geniuspay',
            email: requestEmails.get(str(log.payment_request_id)) || base.email,
            label: planName(str(d.product)),
            detail: `${num(d.amount).toLocaleString('fr-FR')} FCFA · ${str(d.reference) || 'GeniusPay'}`,
          }
      }
    })

    const credits = [...fromLogs, ...jetons].sort((a, b) => b.creditedAt.localeCompare(a.creditedAt))
    return NextResponse.json({ credits }, { headers: NO_STORE })
  } catch (e) {
    console.error('[admin/manual-credits] Error:', e)
    return NextResponse.json({ error: (e as Error).message || 'Erreur serveur' }, { status: 500, headers: NO_STORE })
  }
}
