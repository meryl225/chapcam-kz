import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PLAN_POINTS = { starter: 500, standard: 1250, premium: 2500, ultimate: 4250 }

// Charge tout payment_logs (pagination 1000 par 1000)
let all = []
let from = 0
while (true) {
  const { data, error } = await admin
    .from('payment_logs')
    .select('token, email, product_id, status, credited, already_done, created_at')
    .order('created_at', { ascending: true })
    .range(from, from + 999)
  if (error) { console.log('ERR', error.message); break }
  if (!data || data.length === 0) break
  all = all.concat(data)
  if (data.length < 1000) break
  from += 1000
}
console.log('payment_logs charges:', all.length)

// Un CREDIT REEL = credited=true ET already_done!=true (pas juste une reverif)
const realCreditsByToken = new Map()
for (const r of all) {
  if (r.credited === true && r.already_done !== true) {
    if (!realCreditsByToken.has(r.token)) realCreditsByToken.set(r.token, [])
    realCreditsByToken.get(r.token).push(r)
  }
}

// Tokens credites REELLEMENT plus d'une fois = double credit avere
const doubles = []
for (const [token, rows] of realCreditsByToken) {
  if (rows.length > 1) {
    const r = rows[0]
    const pts = PLAN_POINTS[r.product_id] || 0
    doubles.push({
      token,
      email: r.email,
      product_id: r.product_id,
      creditCount: rows.length,
      phantomCredits: rows.length - 1,
      pointsPerCredit: pts,
      phantomPoints: (rows.length - 1) * pts,
      times: rows.map((x) => x.created_at),
    })
  }
}

doubles.sort((a, b) => b.phantomPoints - a.phantomPoints)
console.log('TOKENS DOUBLE-CREDITES (avere via payment_logs):', doubles.length)

// Agrege par email
const byEmail = new Map()
for (const d of doubles) {
  if (!byEmail.has(d.email)) byEmail.set(d.email, { email: d.email, phantomPoints: 0, tokens: 0 })
  const e = byEmail.get(d.email)
  e.phantomPoints += d.phantomPoints
  e.tokens += 1
}
const emails = [...byEmail.values()].sort((a, b) => b.phantomPoints - a.phantomPoints)
console.log('COMPTES AFFECTES:', emails.length)
console.log('PHANTOM POINTS TOTAL:', emails.reduce((s, e) => s + e.phantomPoints, 0))
console.log(JSON.stringify(emails, null, 2))
