import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(url, key, { auth: { persistSession: false } })

const today = new Date().toISOString().slice(0, 10)

// Abos crees AUJOURD'HUI
const { data: subs } = await admin
  .from('subscriptions')
  .select('id, user_id, email, plan, amount, points, max_points, started_at, updated_at, expires_at')
  .gte('started_at', today + 'T00:00:00Z')
  .limit(5000)
console.log(`Abos started_at aujourd'hui: ${subs.length}`)

// Emails avec vrai paiement
const paidEmails = new Set()
for (const t of ['payment_logs', 'processed_payments']) {
  let from = 0
  while (true) {
    const { data, error } = await admin.from(t).select('email').range(from, from + 999)
    if (error || !data || data.length === 0) break
    data.forEach((r) => r.email && paidEmails.add(String(r.email).toLowerCase().trim()))
    if (data.length < 1000) break
    from += 1000
  }
}

const fraud = subs.filter((s) => {
  const em = String(s.email || '').toLowerCase().trim()
  return !em || !paidEmails.has(em)
})
const paidToday = subs.length - fraud.length
console.log(`  -> avec vrai paiement (legitimes): ${paidToday}`)
console.log(`  -> SANS paiement (fraude): ${fraud.length}`)

// Verifier date creation compte Auth pour un echantillon de fraude
console.log("\n=== Date creation compte Auth (echantillon 12 fraude) ===")
for (const s of fraud.slice(0, 12)) {
  const { data } = await admin.auth.admin.getUserById(s.user_id)
  const created = data?.user?.created_at || '?'
  console.log(`  ${s.email} | plan ${s.plan} | compte cree: ${created}`)
}

// Repartition plan de la fraude du jour
const byPlan = {}
for (const s of fraud) byPlan[s.plan] = (byPlan[s.plan] || 0) + 1
console.log('\n=== Plans de la fraude du jour ===')
Object.entries(byPlan).forEach(([p, n]) => console.log(`  ${p}: ${n}`))

// Sauvegarder les IDs de fraude pour suppression eventuelle
import('node:fs').then((fs) => {
  fs.writeFileSync('/tmp/fraud-ids.json', JSON.stringify(fraud.map((s) => ({ id: s.id, user_id: s.user_id, email: s.email, plan: s.plan })), null, 2))
  console.log(`\n${fraud.length} IDs sauvegardes dans /tmp/fraud-ids.json`)
})
