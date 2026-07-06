import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// points par produit (source: lib/plans.ts)
const PLAN_POINTS = { starter: 500, standard: 1250, premium: 2500, ultimate: 4250 }

const EMAILS = [
  'evelynemolette120@gmail.com',
  'leclercqmathieu330@gmail.com',
  'joelmoulins33@gmail.com',
  'morykonemoussa@icloud.com',
  'cedricsonkoua71@gmail.com',
  'abracadabramagie8@gmail.com',
  'koftagne@protonmail.com',
  'silueoceane91@gmail.com',
  'amacratiniamacra@gmail.com',
  'florencemilane@gmail.com',
  'racheldavisofficiel@gmail.com',
  'tadjaniraimi44@gmail.com',
  'adelinajade1@gmail.com',
  'doloresb979@gmail.com',
  'stevezadi46@gmail.com',
  'toimoi5412@gmail.com',
  'landrygnatio76@gmail.com',
]

for (const email of EMAILS) {
  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan, points, max_points, start_date, end_date, is_active')
    .eq('email', email)
    .maybeSingle()

  const { data: pays } = await admin
    .from('processed_payments')
    .select('token, product_id, amount, credited, created_at')
    .eq('email', email)
    .order('created_at', { ascending: true })

  const legit = (pays || []).filter((p) => p.credited)
  // total attendu si on ne compte QUE les paiements plan legitimes
  const correctMax = legit.reduce((sum, p) => sum + (PLAN_POINTS[p.product_id] || 0), 0)

  console.log('========================================')
  console.log('EMAIL:', email)
  console.log('  SUB: plan=%s points=%s max_points=%s active=%s', sub?.plan, sub?.points, sub?.max_points, sub?.is_active)
  console.log('  SUB window:', sub?.start_date, '->', sub?.end_date)
  console.log('  processed_payments (credited=true):', legit.length)
  for (const p of legit) {
    console.log('    - %s | %s | %s FCFA | %s', p.created_at, p.product_id, p.amount, p.token)
  }
  console.log('  => correctMax (somme paiements plan legit):', correctMax)
  console.log('  => consommE actuel (max-points):', (sub?.max_points ?? 0) - (sub?.points ?? 0))
}
