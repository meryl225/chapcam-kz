import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

const admin = createClient(url, key, { auth: { persistSession: false } })

const { data, error } = await admin.from('processed_payments').select('*').limit(1)
if (error) {
  console.log('ERROR', error.message)
} else {
  console.log('processed_payments columns:', data?.[0] ? Object.keys(data[0]) : '(no rows)')
  console.log('sample row:', JSON.stringify(data?.[0] || null, null, 2))
}
