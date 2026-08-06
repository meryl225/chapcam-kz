import { createClient } from '@/lib/supabase/server'
import { POINTS_PER_SECOND_SD } from '@/lib/swap-pricing'

// Nombre minimal de points pour DEMARRER un swap : 1 palier de deduction (5s)
// au tarif de base 720p (2 pts/s) = 10 points. Meme regle que le hook client.
export const MIN_POINTS_TO_START = POINTS_PER_SECOND_SD * 5

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
  reason: 'ok' | 'no_subscription' | 'inactive' | 'insufficient_points'
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

  const isExpired = sub.expires_at ? new Date(sub.expires_at) < new Date() : false
  const isActive = Boolean(sub.is_active) && !isExpired
  const points = Number(sub.points) || 0
  const plan = String(sub.plan || 'free')

  if (!isActive) {
    return { allowed: false, points, plan, isActive: false, reason: 'inactive' }
  }
  if (points < MIN_POINTS_TO_START) {
    return { allowed: false, points, plan, isActive: true, reason: 'insufficient_points' }
  }

  return { allowed: true, points, plan, isActive: true, reason: 'ok' }
}
