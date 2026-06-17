import { createClient } from '@/lib/supabase/server'
import { ProxyClient } from '@/components/dashboard/proxy-client'

const PLAN_LABELS: Record<string, string> = {
  free: 'Gratuit',
  '1day': 'Plan 1 jour',
  '30days': '10 Go / mois',
  '90days': '30 Go / 90 jours',
  '365days': '120 Go / an',
}

// Quota par défaut du forfait proxy (Go). Le vrai forfait sera mappé plus tard.
const DEFAULT_QUOTA_GB = 10

export default async function ProxyPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Abonnements proxy de l'utilisateur (isolés par RLS) : on agrège le quota.
  const { data: subs } = await supabase
    .from('proxy_subscriptions')
    .select('quota_gb, used_gb')
    .eq('user_id', user?.id ?? '')

  const quotaGb = subs && subs.length > 0
    ? subs.reduce((sum, s) => sum + Number(s.quota_gb ?? 0), 0)
    : DEFAULT_QUOTA_GB
  const usedGb = subs?.reduce((sum, s) => sum + Number(s.used_gb ?? 0), 0) ?? 0

  // Forfait global (table subscriptions) pour l'intitulé "Mon abonnement".
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', user?.id ?? '')
    .single()

  const planLabel = PLAN_LABELS[subscription?.plan ?? 'free'] ?? '10 Go / mois'

  return <ProxyClient planLabel={planLabel} quotaGb={quotaGb} usedGb={usedGb} />
}
