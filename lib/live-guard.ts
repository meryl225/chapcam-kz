import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { POINTS_PER_SECOND_SD } from '@/lib/swap-pricing'

// Nombre minimal de points pour DEMARRER un swap : 1 palier de deduction (5s)
// au tarif de base 720p (2 pts/s) = 10 points. Meme regle que le hook client.
export const MIN_POINTS_TO_START = POINTS_PER_SECOND_SD * 5

// Expiration = annulation IMMEDIATE du forfait. Des que la date d'expiration
// est depassee, le forfait est annule : points remis a zero, forfait desactive
// et repasse en 'free'. Il n'y a AUCUNE fenetre de grace.
export async function cancelSubscription(userId: string): Promise<void> {
  // Ecriture avec le service_role : on force la remise a zero meme si la RLS
  // publique restreint la colonne is_active / plan.
  const admin = createAdminClient()
  await admin
    .from('subscriptions')
    .update({ points: 0, is_active: false, plan: 'free' })
    .eq('user_id', userId)
}

export type LiveGuardResult = {
  /** true => l'utilisateur peut recevoir un token Decart */
  allowed: boolean
  /** solde de points restant */
  points: number
  /** plan effectif */
  plan: string
  /** abonnement actif et non expire */
  isActive: boolean
  /** code de refus (pour la reponse API et les logs) */
  reason: 'ok' | 'no_subscription' | 'inactive' | 'insufficient_points' | 'expired'
}

/**
 * Verifie COTE SERVEUR que l'utilisateur a le droit de consommer du GPU Decart :
 * abonnement actif, non expire, et au moins un palier de points.
 *
 * C'est le verrou critique : sans lui, un compte a 0 point (ou expire) pouvait
 * obtenir un token ephemere et bruler du GPU sans jamais etre facture, car la
 * facturation est pilotee cote client.
 */
export async function checkLiveAccess(userId: string): Promise<LiveGuardResult> {
  const supabase = await createClient()

  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select('points, max_points, plan, expires_at, is_active')
    .eq('user_id', userId)
    .single()

  if (error || !sub) {
    return { allowed: false, points: 0, plan: 'free', isActive: false, reason: 'no_subscription' }
  }

  const now = Date.now()
  const expiresMs = sub.expires_at ? new Date(sub.expires_at).getTime() : null
  const isExpired = expiresMs !== null ? expiresMs < now : false
  const isActive = Boolean(sub.is_active) && !isExpired
  const points = Number(sub.points) || 0
  const plan = String(sub.plan || 'free')

  // Compte jamais actif (desactive manuellement, ou aucun abonnement paye)
  if (!sub.is_active) {
    return { allowed: false, points, plan, isActive: false, reason: 'inactive' }
  }

  // Abonnement expire : annulation IMMEDIATE, sans fenetre de grace. Des que la
  // date d'expiration est depassee, le forfait est annule et les points restants
  // sont definitivement remis a zero (forfait desactive et repasse en 'free').
  if (isExpired) {
    if (points > 0 || sub.is_active || plan !== 'free') {
      await cancelSubscription(userId)
    }
    return { allowed: false, points: 0, plan: 'free', isActive: false, reason: 'expired' }
  }

  if (points < MIN_POINTS_TO_START) {
    return { allowed: false, points, plan, isActive, reason: 'insufficient_points' }
  }

  return { allowed: true, points, plan, isActive, reason: 'ok' }
}
