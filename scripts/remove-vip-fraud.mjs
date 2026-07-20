import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(url, service, { auth: { persistSession: false } })

const APPLY = process.env.APPLY === '1'
const rows = JSON.parse(fs.readFileSync('/tmp/fraud-vip-ids.json', 'utf8'))
console.log(`${rows.length} abonnements VIP frauduleux a traiter (APPLY=${APPLY})`)

if (!APPLY) {
  console.log('DRY-RUN : rien supprime. Lancer avec APPLY=1 pour appliquer.')
  for (const r of rows) console.log(`  ${r.email} (${r.plan})`)
  process.exit(0)
}

let subDeleted = 0
let usersDeleted = 0
for (const r of rows) {
  // 1) Supprime l'abonnement.
  const { error: se } = await admin.from('subscriptions').delete().eq('id', r.id)
  if (se) console.error(`  [sub ${r.email}]`, se.message)
  else subDeleted++

  // 2) Supprime le compte bot associe.
  if (r.user_id) {
    const { error: ue } = await admin.auth.admin.deleteUser(r.user_id)
    if (ue) console.error(`  [user ${r.email}]`, ue.message)
    else usersDeleted++
  }
}

console.log(`\nTermine. Abonnements supprimes: ${subDeleted}/${rows.length} | Comptes supprimes: ${usersDeleted}`)
