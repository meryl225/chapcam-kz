export interface SubscriptionRow {
  plan: string | null
  is_active: boolean | null
  status: string | null
  expires_at: string | null
  end_date: string | null
}

const PLAN_NAMES: Record<string, string> = {
  testeur: 'Forfait Testeur',
  starter: 'Starter',
  standard: 'Standard',
  premium: 'Premium',
  ultimate: 'VIP PRO',
  vip: 'VIP PRO',
  'vip pro': 'VIP PRO',
  vipdebout: 'VIP DEBOUT',
  'vip debout': 'VIP DEBOUT',
}

export interface ActivePlan {
  name: string
  expiresAt: Date | null
}

// A row only counts as the current plan when it is explicitly active and not
// expired: a default or lapsed row must never be presented as a subscription.
export function resolveActivePlan(sub: SubscriptionRow | null): ActivePlan | null {
  const raw = sub?.plan?.trim().toLowerCase()
  if (!sub || !raw || raw === 'free') return null
  if (sub.is_active !== true) return null
  if (sub.status && sub.status.toLowerCase() !== 'active') return null

  const end = sub.expires_at || sub.end_date
  const expiresAt = end ? new Date(end) : null
  if (expiresAt && Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) return null

  const name = PLAN_NAMES[raw] ?? raw.replace(/\b\w/g, (c) => c.toUpperCase())
  return { name, expiresAt }
}
