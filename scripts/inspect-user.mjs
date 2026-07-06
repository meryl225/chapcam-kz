import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ojmzqokffbptmcktnwdy.supabase.co'
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY manquante')
  process.exit(1)
}
const admin = createClient(SUPABASE_URL, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const EMAIL = 'evelynemolette120@gmail.com'.toLowerCase()

// 1) Resoudre user id
let userId = null
for (let page = 1; page <= 10; page++) {
  const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
  const users = data?.users || []
  const match = users.find((u) => u.email?.toLowerCase() === EMAIL)
  if (match) { userId = match.id; break }
  if (users.length < 1000) break
}
console.log('USER ID:', userId)

if (userId) {
  const { data: subs } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
  console.log('SUBSCRIPTIONS:', JSON.stringify(subs, null, 2))

  // paiements traites lies a ce user (si colonne existe)
  const { data: pays, error: pErr } = await admin
    .from('processed_payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (pErr) console.log('processed_payments err:', pErr.message)
  else console.log('PROCESSED_PAYMENTS:', JSON.stringify(pays, null, 2))
}
