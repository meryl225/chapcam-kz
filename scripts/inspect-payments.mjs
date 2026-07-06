import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ojmzqokffbptmcktnwdy.supabase.co'
const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const EMAIL = 'evelynemolette120@gmail.com'

// Toute la table processed_payments (colonnes inconnues -> select *)
const { data: all, error } = await admin
  .from('processed_payments')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(30)
if (error) console.log('processed_payments error:', error.message)
else console.log('LAST PROCESSED_PAYMENTS:', JSON.stringify(all, null, 2))

// Filtrer par email si colonne existe
const { data: byEmail, error: e2 } = await admin
  .from('processed_payments')
  .select('*')
  .eq('email', EMAIL)
if (e2) console.log('by email error:', e2.message)
else console.log('BY EMAIL:', JSON.stringify(byEmail, null, 2))
