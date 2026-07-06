import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ojmzqokffbptmcktnwdy.supabase.co'
const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// points attendus par plan (source: lib/plans.ts)
const EXPECT = { starter: 500, standard: 1250, premium: 2500, ultimate: 4250 }

const { data: subs } = await admin
  .from('subscriptions')
  .select('email, plan, points, max_points, amount, started_at')
  .order('started_at', { ascending: false })
  .limit(2000)

const suspects = []
for (const s of subs || []) {
  const exp = EXPECT[s.plan]
  if (!exp) continue
  // max_points multiple exact de l'attendu et > attendu => credit multiple
  if (s.max_points && s.max_points > exp && s.max_points % exp === 0) {
    suspects.push({
      email: s.email,
      plan: s.plan,
      max_points: s.max_points,
      expected: exp,
      factor: s.max_points / exp,
      points: s.points,
    })
  }
}
console.log('TOTAL SUBS:', subs?.length)
console.log('SUSPECTS (max_points multiple exact de l attendu):', suspects.length)
console.log(JSON.stringify(suspects, null, 2))
