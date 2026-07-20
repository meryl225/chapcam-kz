import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(url, service, { auth: { persistSession: false } })

async function fetchAll(table, cols) {
  let all = []; let from = 0; const step = 1000
  for (;;) {
    const { data, error } = await admin.from(table).select(cols).range(from, from + step - 1)
    if (error) { console.error(`[${table}]`, error.message); break }
    all = all.concat(data || [])
    if (!data || data.length < step) break
    from += step
  }
  return all
}

// Decouvre les colonnes reelles de payment_logs.
const { data: plSample } = await admin.from('payment_logs').select('*').limit(1)
console.log('=== COLONNES payment_logs ===')
console.log(Object.keys(plSample?.[0] || {}).join(', ') || '(vide)')

const subs = await fetchAll('subscriptions', '*')
const plogs = await fetchAll('payment_logs', '*')
const pproc = await fetchAll('processed_payments', '*')

// Construit l'ensemble des emails ayant un vrai paiement (toutes sources).
const paidEmails = new Set()
const addEmailsFrom = (rows) => {
  for (const r of rows) {
    for (const [k, v] of Object.entries(r)) {
      if (v && /email/i.test(k)) paidEmails.add(String(v).toLowerCase().trim())
    }
  }
}
addEmailsFrom(plogs)
addEmailsFrom(pproc)
console.log(`\npayment_logs=${plogs.length} processed_payments=${pproc.length} emails_payes=${paidEmails.size}`)

const activeSubs = subs.filter((s) => s.is_active !== false && s.status !== 'cancelled')
const noPay = activeSubs.filter((s) => !paidEmails.has((s.email || '').toLowerCase().trim()))

// Focalise sur les plans VIP payants (jamais gratuits).
const VIP = new Set(['ultimate', 'vipdebout', 'vip', 'pro', 'vippro'])
const fraudVip = noPay.filter((s) => VIP.has(String(s.plan || '').toLowerCase()))
const otherNoPay = noPay.filter((s) => !VIP.has(String(s.plan || '').toLowerCase()))

console.log(`\n=== ACTIFS SANS PAIEMENT: ${noPay.length} ===`)
const planCount = {}
for (const s of noPay) planCount[s.plan] = (planCount[s.plan] || 0) + 1
console.log('par plan:', JSON.stringify(planCount))

console.log(`\n=== VIP PAYANTS SANS PAIEMENT (fraude): ${fraudVip.length} ===`)
for (const s of fraudVip) {
  console.log(`${(s.email || '?').padEnd(38)} ${String(s.plan).padEnd(10)} started=${(s.started_at||'').slice(0,10)} exp=${(s.expires_at||'').slice(0,10)} pts=${s.points}`)
}
console.log(`\n(plans non-VIP sans paiement, NON supprimes: ${otherNoPay.length} - probablement offre gratuite/ancienne)`)

// Sauvegarde les IDs VIP frauduleux pour suppression.
import('node:fs').then((fs) => {
  fs.writeFileSync('/tmp/fraud-vip-ids.json', JSON.stringify(fraudVip.map((s) => ({ id: s.id, user_id: s.user_id, email: s.email, plan: s.plan })), null, 2))
  console.log('\nIDs VIP frauduleux ecrits dans /tmp/fraud-vip-ids.json')
})
