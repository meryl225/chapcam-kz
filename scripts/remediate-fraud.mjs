import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(url, service, { auth: { persistSession: false } })

const APPLY = process.env.APPLY === '1'
const TODAY = '2026-07-20'

// 1. Charger tous les abonnements crees aujourd'hui.
const { data: subs, error } = await admin
  .from('subscriptions')
  .select('id, user_id, email, plan, points, max_points, amount, is_active, started_at, expires_at')
  .gte('started_at', `${TODAY}T00:00:00`)
  .lte('started_at', `${TODAY}T23:59:59`)

if (error) {
  console.error('Erreur lecture subscriptions:', error.message)
  process.exit(1)
}
console.log(`Abonnements crees aujourd'hui (${TODAY}): ${subs.length}`)

// 2. Charger les paiements reels (par email) pour distinguer les legitimes.
const emails = [...new Set(subs.map((s) => (s.email || '').toLowerCase()).filter(Boolean))]

const paidEmails = new Set()
// payment_logs
{
  const { data } = await admin
    .from('payment_logs')
    .select('email')
    .gte('created_at', `${TODAY}T00:00:00`)
  for (const r of data || []) if (r.email) paidEmails.add(r.email.toLowerCase())
}
// processed_payments (au cas ou l'email y figure)
{
  const { data } = await admin.from('processed_payments').select('email').gte('created_at', `${TODAY}T00:00:00`)
  for (const r of data || []) if (r?.email) paidEmails.add(r.email.toLowerCase())
}

// 3. Fraude = cree aujourd'hui + AUCUN paiement reel associe a l'email.
const fraud = subs.filter((s) => !paidEmails.has((s.email || '').toLowerCase()))
const legit = subs.filter((s) => paidEmails.has((s.email || '').toLowerCase()))

console.log(`  -> avec paiement reel (legitimes, gardes): ${legit.length}`)
console.log(`  -> SANS paiement (frauduleux): ${fraud.length}`)
console.log('\nRepartition frauduleux par plan:')
const byPlan = {}
for (const s of fraud) byPlan[s.plan] = (byPlan[s.plan] || 0) + 1
console.log(byPlan)

console.log('\nExemples (10 premiers frauduleux):')
for (const s of fraud.slice(0, 10)) {
  console.log(`  ${s.email} | ${s.plan} | ${s.points}/${s.max_points} pts | ${s.started_at}`)
}

if (legit.length) {
  console.log('\nLegitimes gardes:')
  for (const s of legit) console.log(`  KEEP ${s.email} | ${s.plan}`)
}

if (!APPLY) {
  console.log('\n[DRY-RUN] Aucune suppression effectuee. Relancer avec APPLY=1 pour appliquer.')
  process.exit(0)
}

// 4. APPLIQUER : supprimer les abonnements frauduleux.
const fraudIds = fraud.map((s) => s.id)
const fraudUserIds = [...new Set(fraud.map((s) => s.user_id).filter(Boolean))]

console.log(`\n[APPLY] Suppression de ${fraudIds.length} abonnements frauduleux...`)
let delSubs = 0
for (let i = 0; i < fraudIds.length; i += 100) {
  const batch = fraudIds.slice(i, i + 100)
  const { error: e } = await admin.from('subscriptions').delete().in('id', batch)
  if (e) console.error('  erreur delete subs batch:', e.message)
  else delSubs += batch.length
}
console.log(`  Abonnements supprimes: ${delSubs}`)

// 5. Supprimer les comptes bots (Auth) correspondants.
console.log(`\n[APPLY] Suppression de ${fraudUserIds.length} comptes bots (Auth)...`)
let delUsers = 0
for (const uid of fraudUserIds) {
  const { error: e } = await admin.auth.admin.deleteUser(uid)
  if (e) console.error(`  erreur delete user ${uid}:`, e.message)
  else delUsers++
}
console.log(`  Comptes supprimes: ${delUsers}`)
console.log('\n[APPLY] Termine.')
