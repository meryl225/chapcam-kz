import { createClient as createServerClient } from '@/lib/supabase/server'

/**
 * Regles de watermark par forfait (offres de recharge) :
 *  - starter (10 000 F) et standard (25 000 F)  -> AVEC watermark
 *  - premium (50 000 F)                         -> AVEC watermark par defaut,
 *      SANS watermark UNIQUEMENT si l'admin l'active manuellement
 *      (drapeau user_metadata.no_watermark = true)
 *  - ultimate (85 000 F)                        -> SANS watermark automatiquement
 *
 * Le watermark est applique par l'API Decart en fonction de la CLE utilisee :
 *  - DECART_API_KEY                -> rend une video AVEC watermark
 *  - DECART_API_KEY_NO_WATERMARK   -> rend une video SANS watermark
 *
 * Cette resolution se fait cote serveur uniquement : le client ne choisit jamais
 * sa cle, il recoit seulement un token ephemere deja lie a la bonne cle.
 */

// Forfaits qui donnent droit au sans-watermark automatique.
const AUTO_NO_WATERMARK_PLANS = new Set(['ultimate'])
// Forfaits eligibles au sans-watermark manuel (active par l'admin).
const MANUAL_NO_WATERMARK_PLANS = new Set(['premium'])

export type WatermarkDecision = {
  /** true => utiliser la cle sans watermark */
  noWatermark: boolean
  /** plan effectif retenu (pour les logs) */
  plan: string
  /** origine de la decision (pour les logs) */
  reason: 'auto' | 'manual' | 'default'
}

function isSubscriptionActive(sub: { is_active?: boolean | null; expires_at?: string | null } | null): boolean {
  if (!sub?.is_active) return false
  if (sub.expires_at) {
    const exp = new Date(sub.expires_at).getTime()
    if (Number.isFinite(exp) && exp < Date.now()) return false
  }
  return true
}

/**
 * Determine si l'utilisateur courant a droit au rendu sans watermark.
 * A appeler cote serveur (route API) apres avoir authentifie l'utilisateur.
 */
export async function resolveWatermarkForUser(userId: string): Promise<WatermarkDecision> {
  const supabase = await createServerClient()

  // Plan actif depuis la table subscriptions (source de verite du forfait).
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, is_active, expires_at')
    .eq('user_id', userId)
    .maybeSingle()

  const plan = (isSubscriptionActive(sub) ? String(sub?.plan || '') : '').toLowerCase()

  // 85 000 F : sans watermark automatique.
  if (AUTO_NO_WATERMARK_PLANS.has(plan)) {
    return { noWatermark: true, plan, reason: 'auto' }
  }

  // 50 000 F : sans watermark uniquement si l'admin l'a active manuellement.
  if (MANUAL_NO_WATERMARK_PLANS.has(plan)) {
    const { data: { user } } = await supabase.auth.getUser()
    const manual = user?.user_metadata?.no_watermark === true
    if (manual) return { noWatermark: true, plan, reason: 'manual' }
  }

  // Tous les autres cas : avec watermark.
  return { noWatermark: false, plan, reason: 'default' }
}

/**
 * Renvoie la cle Decart a utiliser selon la decision de watermark.
 * Repli sur la cle avec watermark si la cle sans watermark n'est pas configuree.
 */
export function pickDecartApiKey(noWatermark: boolean): { apiKey: string | undefined; usedNoWatermark: boolean } {
  const withWm = process.env.DECART_API_KEY
  const withoutWm = process.env.DECART_API_KEY_NO_WATERMARK

  if (noWatermark && withoutWm) {
    return { apiKey: withoutWm, usedNoWatermark: true }
  }
  // Repli securise : si la cle sans watermark manque, on ne casse pas le swap,
  // on retombe sur la cle avec watermark.
  return { apiKey: withWm, usedNoWatermark: false }
}
