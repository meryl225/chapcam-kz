import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Payment = {
  id: string
  user_id: string | null
  amount: number | null
  paid_amount: number | null
  paid_at: string | null
  validated_at: string | null
  created_at: string | null
  status: string | null
  paydunya_token: string | null
  wave_transaction_reference: string | null
}

type Subscription = {
  user_id: string
  is_active: boolean | null
  status: string | null
  started_at: string | null
  expires_at: string | null
  start_date: string | null
  end_date: string | null
}

const MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09']
const VALID_STATUSES = new Set(['approved', 'paid', 'completed', 'success', 'successful', 'validated'])

function monthKey(value: string) {
  return value.slice(0, 7)
}

function isValidPayment(payment: Payment) {
  return Boolean(
    payment.paid_at ||
    payment.validated_at ||
    (payment.status && VALID_STATUSES.has(payment.status.toLowerCase())),
  )
}

function paymentDate(payment: Payment) {
  return payment.paid_at || payment.validated_at || payment.created_at
}

function dedupePayments(rows: Payment[]) {
  const unique = new Map<string, Payment>()
  for (const row of rows.filter(isValidPayment)) {
    const key = row.paydunya_token || row.wave_transaction_reference || row.id
    const existing = unique.get(key)
    if (!existing || new Date(paymentDate(row) || 0) < new Date(paymentDate(existing) || 0)) unique.set(key, row)
  }
  return [...unique.values()]
}

function activeAt(sub: Subscription, date: Date) {
  if (sub.is_active === false || ['cancelled', 'canceled', 'expired', 'inactive'].includes((sub.status || '').toLowerCase())) return false
  const start = sub.start_date || sub.started_at
  const end = sub.end_date || sub.expires_at
  return (!start || new Date(start) <= date) && (!end || new Date(end) >= date)
}

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  const admin = createAdminClient()

  const [{ data: paymentRows, error: paymentError }, { data: subscriptionRows, error: subscriptionError }] = await Promise.all([
    admin.from('payment_requests').select('id,user_id,amount,paid_amount,paid_at,validated_at,created_at,status,paydunya_token,wave_transaction_reference').limit(100000),
    admin.from('subscriptions').select('user_id,is_active,status,started_at,expires_at,start_date,end_date').limit(100000),
  ])
  if (paymentError || subscriptionError) {
    console.error('[admin/financials] Supabase read error', paymentError?.message || subscriptionError?.message)
    return NextResponse.json({ error: 'Erreur lecture financière.' }, { status: 500 })
  }

  const payments = dedupePayments((paymentRows || []) as Payment[]).filter((row) => MONTHS.includes(monthKey(paymentDate(row) || '')))
  const subscriptions = (subscriptionRows || []) as Subscription[]
  const firstPaidMonth = new Map<string, string>()
  for (const payment of payments) {
    if (!payment.user_id) continue
    const month = monthKey(paymentDate(payment) || '')
    const previous = firstPaidMonth.get(payment.user_id)
    if (!previous || month < previous) firstPaidMonth.set(payment.user_id, month)
  }

  const rows = MONTHS.map((month, index) => {
    const monthPayments = payments.filter((payment) => monthKey(paymentDate(payment) || '') === month)
    const users = new Set(monthPayments.map((payment) => payment.user_id).filter(Boolean))
    const revenue = monthPayments.reduce((total, payment) => total + Number(payment.paid_amount ?? payment.amount ?? 0), 0)
    const monthEnd = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0, 23, 59, 59, 999))
    const activeSubscribers = new Set(subscriptions.filter((sub) => activeAt(sub, monthEnd)).map((sub) => sub.user_id)).size
    const previousRevenue = index ? rows[index - 1].revenue : null
    return {
      month,
      revenue,
      transactionsPaid: monthPayments.length,
      uniquePayingUsers: users.size,
      newPayingUsers: [...users].filter((userId) => firstPaidMonth.get(userId) === month).length,
      activeSubscribers,
      arppu: users.size ? revenue / users.size : 0,
      growthMoM: previousRevenue && previousRevenue !== 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : null,
    }
  })

  return NextResponse.json({ source: 'supabase.payment_requests + supabase.subscriptions', deduplicatedPayments: payments.length, months: rows }, { headers: { 'Cache-Control': 'no-store' } })
}

export { dedupePayments, activeAt }
