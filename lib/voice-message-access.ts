import 'server-only'
import type { createClient } from '@/lib/supabase/server'
import { getJetonsBalance } from '@/lib/jetons'

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

/**
 * Recupere l'abonnement actif + le solde effectif de Message Vocal (avec seed du
 * quota inclus si l'abonne n'a pas encore de ligne). Partage par les 2 modes.
 */
export async function resolveVoiceMessageBalance(
  supabase: SupabaseServer,
  userId: string,
): Promise<{ balance: number; subActive: boolean; plan: string | null }> {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, end_date, expires_at, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  const subEnd = sub?.end_date ?? sub?.expires_at ?? null
  const subActive = !!sub && !!subEnd && new Date(subEnd).getTime() > Date.now()
  const balance = (await getJetonsBalance(userId)).balance
  return { balance, subActive, plan: subActive ? (sub as { plan: string }).plan : null }
}
