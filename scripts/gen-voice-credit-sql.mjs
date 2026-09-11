// Genere le SQL Neon accordant 3 messages vocaux gratuits aux abonnes payants.
// Lit les abonnements actifs depuis Supabase (REST), exclut le plan "free".
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
import { writeFileSync } from 'node:fs'

const r = await fetch(
  `${url}/rest/v1/subscriptions?select=user_id,plan,is_active,end_date,expires_at&is_active=eq.true`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } },
)
if (!r.ok) {
  console.error('HTTP', r.status, await r.text())
  process.exit(1)
}
const rows = await r.json()
const now = Date.now()
const paid = rows.filter((s) => {
  const end = s.end_date ?? s.expires_at
  return end && new Date(end).getTime() > now && s.plan && s.plan !== 'free'
})
const ids = [...new Set(paid.map((s) => s.user_id).filter(Boolean))]

const values = ids.map((id) => `  ('${id}', 3, 3, now())`).join(',\n')
const sql = [
  `-- Bonus unique : 3 messages vocaux gratuits aux ${ids.length} abonnes payants ChapCam.`,
  `-- A EXECUTER DANS L'EDITEUR SQL NEON (base des credits), PAS dans Supabase.`,
  ``,
  `CREATE TABLE IF NOT EXISTS voice_message_credits (`,
  `  user_id TEXT PRIMARY KEY,`,
  `  balance INTEGER NOT NULL DEFAULT 0,`,
  `  total_credited INTEGER NOT NULL DEFAULT 0,`,
  `  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
  `);`,
  ``,
  `INSERT INTO voice_message_credits (user_id, balance, total_credited, updated_at) VALUES`,
  values,
  `ON CONFLICT (user_id) DO NOTHING;`,
  ``,
  `-- Verification :`,
  `SELECT count(*) AS comptes_credites, sum(balance) AS total_messages FROM voice_message_credits;`,
  ``,
].join('\n')

writeFileSync('/tmp/grant-voice-credits.sql', sql)
console.log('comptes payants:', ids.length)
console.log('par plan:', JSON.stringify(paid.reduce((a, s) => ((a[s.plan] = (a[s.plan] || 0) + 1), a), {})))
console.log('fichier: /tmp/grant-voice-credits.sql')
