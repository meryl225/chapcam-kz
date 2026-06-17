import { createClient } from '@/lib/supabase/server'
import { ProxyProClient } from '@/components/dashboard/proxy-pro-client'
import { getPricedProxyProducts } from '@/lib/proxy/products'
import { getPlan, proxyQuotaForPlan } from '@/lib/plans'

export default async function ProxyProPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
  const quotaGb = proxyQuotaForPlan(planId)
  const planLabel = planId
    ? `${getPlan(planId)?.name ?? 'Forfait'} — ${quotaGb} Go`
    : 'Aucun forfait actif'

  // Prix client FCFA calculés en direct (coût fournisseur × taux × marge ×3).
  const products = await getPricedProxyProducts()

  return (
    <ProxyProClient products={products} hasPlan={quotaGb > 0} planLabel={planLabel} />
  )
}
