import { createClient } from '@/lib/supabase/server'
import { POINTS_PER_SECOND_SD } from '@/lib/swap-pricing'

// Nombre minimal de points pour DEMARRER un swap : 1 palier de deduction (5s)
// au tarif de base 720p (2 pts/s) = 10 points. Meme regle que le hook client.
export const MIN_POINTS_TO_START = POINTS_PER_SECOND_SD * 5

// Fenetre de grace : apres expiration de l'abonnement, le client garde acces
// a ses points restants pendant ce nombre de jours (il a paye pour ces points).
// Passe ce delai, les points non utilises sont definitivement perdus.
export const GRACE_DAYS = 7

export type LiveGuardResult = {
  /** true => l'utilisateur peut recevoir un token Decart */
  allowed: boolean
  /** solde de points restant */
  points: number
  /** plan effectif */
  plan: string
  /** abonnement actif et non expire */
  isActive: boolean
  /** true => acces accorde via la fenetre de grace (abonnement expire mais points restants) */
  inGrace?: boolean
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

  // Abonnement expire : fenetre de grace. Le client peut consommer ses points
  // restants pendant GRACE_DAYS apres l'expiration, puis c'est bloque.
  let inGrace = false
  if (isExpired) {
    const daysSinceExpiry = expiresMs !== null ? (now - expiresMs) / 86_400_000 : Infinity
    if (daysSinceExpiry > GRACE_DAYS) {
      return { allowed: false, points, plan, isActive: false, reason: 'expired' }
    }
    inGrace = true
  }

  if (points < MIN_POINTS_TO_START) {
    return { allowed: false, points, plan, isActive, inGrace, reason: 'insufficient_points' }
  }

  return { allowed: true, points, plan, isActive, inGrace, reason: 'ok' }
}
