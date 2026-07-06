import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Source de verite: lib/plans.ts
const PLAN = {
  starter: { points: 500, days: 1 },
  standard: { points: 1250, days: 30 },
  premium: { points: 2500, days: 90 },
  ultimate: { points: 4250, days: 365 },
}
const DAY = 24 * 60 * 60 * 1000

// Rejoue les paiements plan (comme activateSubscription) pour obtenir le max_points
// correct de la fenetre active courante.
function simulateMax(planPayments) {
  let active = false
  let maxPoints = 0
  let end = null
  for (const p of planPayments) {
    const t = new Date(p.created_at).getTime()
    const prevActive = active && end && end > t
    const prevMax = prevActive ? maxPoints : 0
    const base = prevActive ? end : t
    const cfg = PLAN[p.product_id]
    if (!cfg) continue
    maxPoints = prevMax + cfg.points
    end = base + cfg.days * DAY
    active = true
  }
  return maxPoints
}

const { data: subs } = await admin
  .from('subscriptions')
  .select('id, email, plan, points, max_points')
  .limit(5000)

const fixes = []
for (const s of subs || []) {
  if (!s.email) continue
  const { data: pays } = await admin
    .from('processed_payments')
    .select('product_id, created_at, credited')
    .eq('email', s.email)
    .order('created_at', { ascending: true })

  const planPays = (pays || []).filter((p) => p.credited && PLAN[p.product_id])
  const simMax = simulateMax(planPays)
  const actualMax = Number(s.max_points || 0)
  const actualPoints = Number(s.points || 0)

  // Sur-credit detecte : le max stocke depasse ce que la logique aurait produit.
  if (actualMax > simMax) {
    const consumed = Math.max(0, actualMax - actualPoints)
    const newPoints = Math.max(0, simMax - consumed)
    fixes.push({
      id: s.id,
      email: s.email,
      plan: s.plan,
      actualMax,
      simMax,
      over: actualMax - simMax,
      actualPoints,
      consumed,
      newPoints,
      newMax: simMax,
    })
  }
}

fixes.sort((a, b) => b.over - a.over)
console.log('SUBS scannes:', subs?.length)
console.log('COMPTES SUR-CREDITES:', fixes.length)
console.log('trop-credite total (max):', fixes.reduce((s, f) => s + f.over, 0))
console.log(JSON.stringify(fixes, null, 2))
