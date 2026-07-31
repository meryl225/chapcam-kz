// ============================================================
// Audit ponctuel : detecte les abonnements ACTIFS sans preuve de paiement.
// Une preuve de paiement = l'UNE de ces conditions :
//   - processed_payments.credited = true pour l'email  (PayDunya / crypto auto)
//   - payment_requests.status = 'approved' pour l'email/user (validation admin)
//   - payment_logs.credited = true pour l'email          (journal de credit)
// Les abonnements actifs SANS aucune de ces traces sont signales.
// Lecture seule : aucune ecriture en base.
// ============================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ojmzqokffbptmcktnwdy.supabase.co'
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY manquante dans l environnement.')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const norm = (e) => (e || '').trim().toLowerCase()

// Recupere toutes les lignes d une table en paginant (1000 par page).
async function fetchAll(table, columns) {
  const rows = []
  let from = 0
  const page = 1000
  for (;;) {
    const { data, error } = await admin.from(table).select(columns).range(from, from + page - 1)
    if (error) {
      console.error(`[${table}] erreur:`, error.message)
      break
    }
    rows.push(...(data || []))
    if (!data || data.length < page) break
    from += page
  }
  return rows
}

async function main() {
  const [subs, processed, requests, logs] = await Promise.all([
    fetchAll('subscriptions', 'id, user_id, email, plan, amount, status, is_active, start_date, end_date'),
    fetchAll('processed_payments', 'email, product_id, amount, credited, created_at'),
    fetchAll('payment_requests', 'email, user_id, plan, status, amount, created_at'),
    fetchAll('payment_logs', 'email, product_id, credited, status, created_at'),
  ])

  // Ensembles de preuves de paiement, indexes par email normalise.
  const paidEmails = new Set()
  for (const p of processed) if (p.credited) paidEmails.add(norm(p.email))
  for (const l of logs) if (l.credited) paidEmails.add(norm(l.email))

  const approvedEmails = new Set()
  const approvedUserIds = new Set()
  for (const r of requests) {
    if (String(r.status).toLowerCase() === 'approved') {
      approvedEmails.add(norm(r.email))
      if (r.user_id) approvedUserIds.add(r.user_id)
    }
  }

  // On ne considere que les abonnements reellement actifs.
  const activeSubs = subs.filter(
    (s) => s.is_active === true || String(s.status).toLowerCase() === 'active',
  )

  const suspicious = []
  for (const s of activeSubs) {
    const email = norm(s.email)
    const hasPaid = paidEmails.has(email)
    const hasApproved = approvedEmails.has(email) || (s.user_id && approvedUserIds.has(s.user_id))
    if (!hasPaid && !hasApproved) suspicious.push(s)
  }

  console.log('===== AUDIT ABONNEMENTS SANS PAIEMENT =====')
  console.log('Total lignes subscriptions      :', subs.length)
  console.log('Abonnements actifs              :', activeSubs.length)
  console.log('processed_payments (credited)   :', paidEmails.size, 'emails')
  console.log('payment_requests (approved)     :', approvedEmails.size, 'emails')
  console.log('---------------------------------------------')
  console.log('ABONNEMENTS ACTIFS SANS PREUVE DE PAIEMENT :', suspicious.length)
  console.log('=============================================')

  suspicious
    .sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0))
    .forEach((s, i) => {
      console.log(
        `${String(i + 1).padStart(3, ' ')}. ${(s.email || 'sans-email').padEnd(34)} | plan=${String(s.plan).padEnd(14)} | montant=${String(s.amount ?? '?').padStart(8)} | actif depuis ${String(s.start_date || '?').slice(0, 10)} | fin ${String(s.end_date || '?').slice(0, 10)} | user_id=${s.user_id || 'NULL'}`,
      )
    })

  if (suspicious.length === 0) {
    console.log('Aucun abonnement actif sans preuve de paiement. Tout est coherent.')
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
