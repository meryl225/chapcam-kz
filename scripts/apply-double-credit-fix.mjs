import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const APPLY = process.argv.includes('--apply')

// Points fantomes averes via payment_logs (tokens credites 2x sur un forfait).
const PHANTOM = {
  'morykonemoussa@icloud.com': 2500,
  'martinequipleure@gmail.com': 1250,
  'stevezadi46@gmail.com': 1250,
  'abracadabramagie8@gmail.com': 1250,
  'leclercqmathieu330@gmail.com': 1250,
  'joelmoulins33@gmail.com': 500,
  'landrygnatio76@gmail.com': 500,
  'evelynemolette120@gmail.com': 500,
}

console.log(APPLY ? '=== APPLICATION REELLE ===' : '=== DRY RUN (aucune ecriture) ===')
for (const [email, phantom] of Object.entries(PHANTOM)) {
  const { data: sub } = await admin
    .from('subscriptions')
    .select('id, plan, points, max_points')
    .eq('email', email)
    .maybeSingle()

  if (!sub) {
    console.log(`! ${email} : abonnement introuvable, ignore`)
    continue
  }

  const curMax = Number(sub.max_points || 0)
  const curPts = Number(sub.points || 0)
  const newMax = Math.max(0, curMax - phantom)
  const newPts = Math.min(curPts, newMax)

  console.log(
    `${email} [${sub.plan}] max ${curMax}->${newMax} | points ${curPts}->${newPts} (fantome ${phantom})`,
  )

  if (APPLY) {
    const { error } = await admin
      .from('subscriptions')
      .update({ max_points: newMax, points: newPts })
      .eq('id', sub.id)
    if (error) console.log('  ERREUR update:', error.message)
    else console.log('  OK corrige')
  }
}
