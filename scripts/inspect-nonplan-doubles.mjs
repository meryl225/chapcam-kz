import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let all = []
let from = 0
while (true) {
  const { data } = await admin
    .from('payment_logs')
    .select('token, email, product_id, amount, credited, already_done, created_at')
    .order('created_at', { ascending: true })
    .range(from, from + 999)
  if (!data || data.length === 0) break
  all = all.concat(data)
  if (data.length < 1000) break
  from += 1000
}

const realByToken = new Map()
for (const r of all) {
  if (r.credited === true && r.already_done !== true) {
    if (!realByToken.has(r.token)) realByToken.set(r.token, [])
    realByToken.get(r.token).push(r)
  }
}

const PLAN_POINTS = { starter: 500, standard: 1250, premium: 2500, ultimate: 4250 }
console.log('=== TOUS les tokens double-credites (detail) ===')
for (const [token, rows] of realByToken) {
  if (rows.length > 1) {
    const r = rows[0]
    const isPlan = !!PLAN_POINTS[r.product_id]
    console.log(
      `${isPlan ? '[PLAN]' : '[AUTRE]'} ${r.product_id} | ${r.email} | x${rows.length} | ${r.amount} FCFA | token ${token}`,
    )
  }
}
