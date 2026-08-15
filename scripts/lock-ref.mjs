// One-off : verrouille une reference GeniusPay deja creditee manuellement pour
// empecher tout double credit futur (webhook tardif / retour page succes).
import { createClient } from '@supabase/supabase-js'

const ref = process.argv[2]
if (!ref) {
  console.error('Usage: node scripts/lock-ref.mjs <MTX-REFERENCE>')
  process.exit(1)
}

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const token = `genius_${ref}`

// 1) Retrouver la demande liee.
const { data: reqRow, error: reqErr } = await admin
  .from('payment_requests')
  .select('*')
  .eq('paydunya_token', ref)
  .maybeSingle()

if (reqErr) {
  console.error('Lecture payment_requests echouee:', reqErr.message)
  process.exit(1)
}
if (!reqRow) {
  console.error('Aucune demande trouvee pour', ref)
  process.exit(1)
}

console.log('Demande trouvee:', {
  id: reqRow.id,
  email: reqRow.email,
  plan: reqRow.plan,
  amount: reqRow.amount,
  status: reqRow.status,
})

const now = new Date().toISOString()

// 2) Reservation d'idempotence (verrou anti-double-credit).
const { error: claimErr } = await admin.from('processed_payments').upsert(
  {
    token,
    email: reqRow.email,
    product_id: reqRow.plan,
    amount: reqRow.amount,
    credited: true,
  },
  { onConflict: 'token' },
)
console.log('processed_payments:', claimErr ? `ERREUR ${claimErr.message}` : 'verrou pose (credited=true)')

// 3) Marquer la demande approuvee.
const { error: updErr } = await admin
  .from('payment_requests')
  .update({
    status: 'approved',
    validated_at: now,
    paid_amount: reqRow.amount,
    paid_at: now,
  })
  .eq('id', reqRow.id)
  .neq('status', 'approved')
console.log('payment_requests:', updErr ? `ERREUR ${updErr.message}` : 'status -> approved')

// 4) Tracer dans admin_logs.
const { error: logErr } = await admin.from('admin_logs').insert({
  action: 'geniuspay_manual_lock',
  payment_request_id: reqRow.id,
  admin_email: 'system',
  details: {
    reference: ref,
    product: reqRow.plan,
    amount: reqRow.amount,
    reason: 'Client debite (preuve SMS MTN) mais GeniusPay reste pending. Credite manuellement ; verrouillage anti-double-credit.',
  },
})
console.log('admin_logs:', logErr ? `ERREUR ${logErr.message}` : 'trace ajoutee')

console.log('\nTermine. Reference verrouillee:', ref)
