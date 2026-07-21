import { createClient } from '@supabase/supabase-js'
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const EMAIL = `v0-crypto-${Date.now()}@example.com`
const { data, error } = await admin.auth.admin.createUser({ email: EMAIL, password: 'azerty123', email_confirm: true })
if (error) { console.log('ERR', error.message); process.exit(1) }
await admin.from('subscriptions').insert({ user_id: data.user.id, email: EMAIL, plan: 'free', points: 0, max_points: 500, is_active: false })
console.log('READY', EMAIL, data.user.id)
