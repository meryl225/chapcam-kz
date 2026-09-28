import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMinutesOffer } from '@/lib/minutes-offers'

// Pack de minutes qui donne droit au rendu SANS logo pendant sa validite.
const NO_WATERMARK_MINUTES_PACK_ID = 'minutes_4'

/**
 * Regles de watermark par forfait (offres de recharge) :
 *  - starter (10 000 F) et standard (25 000 F)  -> AVEC watermark
 *  - premium (50 000 F)                         -> SANS watermark automatiquement
 *  - ultimate (85 000 F) / vipdebout            -> SANS watermark automatiquement
 *
 * Le watermark est applique par l'API Decart en fonction de la CLE utilisee :
 *  - DECART_API_KEY                -> rend une video AVEC watermark
 *  - DECART_API_KEY_NO_WATERMARK   -> rend une video SANS watermark
 *
 * Cette resolution se fait cote serveur uniquement : le client ne choisit jamais
 * sa cle, il recoit seulement un token ephemere deja lie a la bonne cle.
 */

// Forfaits qui donnent droit au sans-watermark automatique.
const AUTO_NO_WATERMARK_PLANS = new Set(['premium', 'ultimate', 'vipdebout'])
// Forfaits eligibles au sans-watermark manuel (active par l'admin).
const MANUAL_NO_WATERMARK_PLANS = new Set<string>([])

export type WatermarkDecision = {
  /** true => utiliser la cle sans watermark */
  noWatermark: boolean
  /** plan effectif retenu (pour les logs) */
  plan: string
  /** origine de la decision (pour les logs) */
  reason: 'auto' | 'manual' | 'pack' | 'default'
}

type SubRow = {
  plan?: string | null
  is_active?: boolean | null
  status?: string | null
  expires_at?: string | null
  end_date?: string | null
} | null

function isSubscriptionActive(sub: SubRow): boolean {
  if (!sub) return false
  // La table utilise a la fois is_active (booleen) et status='active' selon les
  // ecritures : on considere l'abonnement actif si l'un des deux l'indique.
  const flaggedActive = sub.is_active === true || sub.status === 'active'
  if (!flaggedActive) return false
  // Expiration : on accepte expires_at ou end_date.
  const expRaw = sub.expires_at || sub.end_date
  if (expRaw) {
    const exp = new Date(expRaw).getTime()
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
    .select('plan, is_active, status, expires_at, end_date')
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

  // PACK DE MINUTES "4 minutes supplementaires" (10 000 F) : rendu SANS logo
  // pendant la validite du pack. Ce pack credite des points SANS changer le
  // `plan` (ex : un Starter reste "starter"), donc la regle par forfait
  // ci-dessus le laissait AVEC logo alors qu'il a paye. On regarde donc les
  // achats approuves du pack dans sa fenetre de validite.
  if (await hasActiveMinutesPack(userId)) {
    return { noWatermark: true, plan, reason: 'pack' }
  }

  // Tous les autres cas : avec watermark.
  return { noWatermark: false, plan, reason: 'default' }
}

// Statuts consideres comme "paye" dans payment_requests (les webhooks ecrivent
// 'approved' ; on tolere les variantes historiques).
const PAID_STATUSES = ['approved', 'paid', 'completed', 'success']

/**
 * true si l'utilisateur a un achat APPROUVE du pack "4 minutes" (minutes_4)
 * encore dans sa fenetre de validite. Lecture avec le service_role : la table
 * payment_requests n'est pas forcement lisible par le client (RLS).
 */
async function hasActiveMinutesPack(userId: string): Promise<boolean> {
  const offer = getMinutesOffer(NO_WATERMARK_MINUTES_PACK_ID)
  if (!offer) return false
  const since = new Date(Date.now() - offer.validityDays * 24 * 60 * 60 * 1000).toISOString()
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('payment_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('plan', offer.id)
      .in('status', PAID_STATUSES)
      .gte('created_at', since)
      .limit(1)
    return Array.isArray(data) && data.length > 0
  } catch (e) {
    console.warn('[watermark] Lecture pack minutes echouee:', (e as Error)?.message)
    return false
  }
}

/**
 * Renvoie la cle Decart a utiliser selon la decision de watermark.
 * Pour un compte éligible au sans-watermark, il est interdit de basculer vers
 * la clé standard : cela rendrait une vidéo filigranée malgré l'offre payée.
 */
export function pickDecartApiKey(noWatermark: boolean): { apiKey: string | undefined; usedNoWatermark: boolean } {
  const withWm = process.env.DECART_API_KEY
  const withoutWm = process.env.DECART_API_KEY_NO_WATERMARK

  if (noWatermark) {
    // Pas de fallback vers la clé avec watermark : mieux vaut refuser la session
    // et protéger la promesse commerciale que livrer un rendu filigrané.
    return withoutWm
      ? { apiKey: withoutWm, usedNoWatermark: true }
      : { apiKey: undefined, usedNoWatermark: false }
  }

  if (withWm) return { apiKey: withWm, usedNoWatermark: false }
  // Pour les comptes standard, le fallback sans watermark reste acceptable :
  // il n'enlève pas un droit promis et évite une panne inutile.
  if (withoutWm) return { apiKey: withoutWm, usedNoWatermark: true }
  return { apiKey: undefined, usedNoWatermark: false }
}

/**
 * Renvoie les cles Decart candidates par ordre de priorité pour l'émission d'un
 * token. Pour une offre sans-watermark, la clé avec watermark est volontairement
 * exclue : il vaut mieux refuser la session que livrer un rendu filigrané payé
 * comme étant sans logo. Pour les offres standard, le fallback reste possible.
 */
export function getDecartApiKeyCandidates(
  noWatermark: boolean,
): { apiKey: string; usedNoWatermark: boolean }[] {
  const withWm = process.env.DECART_API_KEY
  const withoutWm = process.env.DECART_API_KEY_NO_WATERMARK

  // Ordre de preference selon la politique de watermark souhaitee.
  const ordered: { apiKey: string | undefined; usedNoWatermark: boolean }[] = noWatermark
    ? [
        { apiKey: withoutWm, usedNoWatermark: true },
      ]
    : [
        { apiKey: withWm, usedNoWatermark: false },
        { apiKey: withoutWm, usedNoWatermark: true },
      ]

  // Ne garder que les cles reellement configurees (non vides) et dedupliquer.
  const seen = new Set<string>()
  const candidates: { apiKey: string; usedNoWatermark: boolean }[] = []
  for (const c of ordered) {
    if (!c.apiKey || seen.has(c.apiKey)) continue
    seen.add(c.apiKey)
    candidates.push({ apiKey: c.apiKey, usedNoWatermark: c.usedNoWatermark })
  }
  return candidates
}
