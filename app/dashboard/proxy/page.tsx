import { createClient } from '@/lib/supabase/server'
import { ProxyClient } from '@/components/dashboard/proxy-client'
import { getPlan, proxyQuotaForPlan } from '@/lib/plans'

export default async function ProxyPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Forfait actif (table subscriptions) : c'est lui qui dimensionne le quota proxy.
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, is_active, expires_at')
    .eq('user_id', user?.id ?? '')
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const planActive =
    !!subscription?.is_active &&
    (!subscription?.expires_at || new Date(subscription.expires_at) > new Date())
  const planId = planActive ? (subscription?.plan ?? null) : null

  // Pool de quota UNIQUE partagé entre tous les pays (rentable), selon le forfait.
  const quotaGb = proxyQuotaForPlan(planId)
  const planLabel = planId
    ? `${getPlan(planId)?.name ?? 'Forfait'} — ${quotaGb} Go`
    : 'Aucun forfait actif'

  // Consommation réelle agrégée sur les pays activés (isolée par RLS).
  const { data: subs } = await supabase
    .from('proxy_subscriptions')
    .select('used_gb')
    .eq('user_id', user?.id ?? '')

  const usedGb = subs?.reduce((sum, s) => sum + Number(s.used_gb ?? 0), 0) ?? 0

  return (
    <ProxyClient planLabel={planLabel} quotaGb={quotaGb} usedGb={usedGb} hasPlan={quotaGb > 0} />
  )
}
