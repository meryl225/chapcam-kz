import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: firstPp } = await admin
  .from('processed_payments')
  .select('created_at')
  .order('created_at', { ascending: true })
  .limit(1)
const { count: ppCount } = await admin
  .from('processed_payments')
  .select('*', { count: 'exact', head: true })

console.log('processed_payments: 1ere ligne =', firstPp?.[0]?.created_at, '| total =', ppCount)

// Autres tables candidates comme registre de paiements
for (const t of ['payment_logs', 'payment_requests']) {
  const { data: first } = await admin
    .from(t)
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
  const { count } = await admin.from(t).select('*', { count: 'exact', head: true })
  console.log(`${t}: total =`, count, '| 1ere =', first?.[0]?.created_at, '| colonnes =', first?.[0] ? Object.keys(first[0]).join(',') : '-')
}
