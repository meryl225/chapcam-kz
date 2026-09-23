import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ToolsGrid } from '@/components/dashboard/hub/tools-grid'
import { PremiumHeader } from '@/components/dashboard/premium-header'
import { ConsentCard } from '@/components/dashboard/consent-card'
import { SupportBanner } from '@/components/dashboard/support-banner'
import { Sparkles, Crown, Check, Zap, Timer, Users, Hourglass, ArrowRight, Clock } from 'lucide-react'
import { T } from '@/components/i18n/t'

const POINTS_PER_SECOND = 2

const PLAN_LABELS: Record<string, string> = {
  free: 'Gratuit',
  '1day': 'Plan 1 jour',
  '30days': 'Plan 30 jours',
  '90days': 'Plan 90 jours',
  '365days': 'Plan 365 jours',
}

function fmtMinutes(points: number) {
  const totalSeconds = Math.floor(points / POINTS_PER_SECOND)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')} min`
}

export default async function DashboardHubPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [
    { data: subscription },
    { count: avatarCount },
    { data: todaySessions },
  ] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('plan, points, max_points, is_active')
      .eq('user_id', user?.id ?? '')
      .maybeSingle(),
    supabase
      .from('user_avatars')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user?.id ?? ''),
    supabase
      .from('swap_sessions')
      .select('duration_seconds')
      .eq('user_id', user?.id ?? '')
      .gte('started_at', startOfToday.toISOString()),
  ])

  const swapsToday = todaySessions?.length ?? 0
  const secondsToday = (todaySessions ?? []).reduce(
    (acc, s) => acc + (s.duration_seconds ?? 0),
    0,
  )
  const minutesToday = Math.floor(secondsToday / 60)

  const points = subscription?.points ?? 0
  const plan = subscription?.plan ?? 'free'
  const isPro = plan !== 'free' && (subscription?.is_active ?? false)
  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Bienvenue'
  const consentAccepted = (user?.user_metadata?.consent_accepted as boolean | undefined) ?? false

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-5 md:px-8 md:py-8">
      <PremiumHeader
        displayName={displayName}
        planLabel={PLAN_LABELS[plan] || plan}
        points={points}
        maxPoints={subscription?.max_points ?? 0}
        minutesLabel={fmtMinutes(points)}
        isPro={isPro}
      />

      {/* ===== Bannière assistance / support ===== */}
      <SupportBanner />

      {/* ===== Bannière utilisation responsable (compacte) ===== */}
      <ConsentCard initiallyAccepted={consentAccepted} />

      {/* ===== OUTILS (highlight) ===== */}
      <section aria-label="Outils ChapCam" className="mt-2">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl text-balance">
              <T>Tous les outils ChapCam</T>
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground md:text-base">
              <T>Choisis l’outil que tu souhaites utiliser.</T>
            </p>
          </div>
        </div>
        <ToolsGrid />
      </section>

      {/* ===== Utilisation rapide ===== */}
      <section aria-label="Utilisation rapide" className="mt-10">
        <h2 className="mb-5 text-xl font-bold text-foreground md:text-2xl"><T>Utilisation rapide</T></h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { icon: Zap, label: 'Swaps aujourd’hui', value: String(swapsToday), color: '#00ff88' },
            { icon: Timer, label: 'Minutes restantes', value: fmtMinutes(points), color: '#22d3ee' },
            { icon: Users, label: 'Avatars créés', value: String(avatarCount ?? 0), color: '#8b5cf6' },
            { icon: Hourglass, label: 'Temps aujourd’hui', value: `${minutesToday} min`, color: '#f97316' },
          ].map((s) => (
            <div
              key={s.label}
              className="group relative overflow-hidden rounded-2xl border border-hairline bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_16px_44px_-16px_rgba(0,0,0,0.6)]"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-70"
                style={{ background: `radial-gradient(circle, ${s.color}55, transparent 70%)` }}
              />
              <div
                className="relative mb-4 flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: `${s.color}22` }}
              >
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
              <p className="relative text-2xl font-bold text-foreground md:text-3xl">{s.value}</p>
              <p className="relative mt-1 text-xs text-text-faint"><T>{s.label}</T></p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Bannière Pro ===== */}
      {!isPro && (
        <section className="relative mt-10 overflow-hidden rounded-[22px] border border-white/[0.08] bg-card p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.8)] md:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(100% 100% at 0% 0%, rgba(0,255,136,0.16), transparent 45%), radial-gradient(100% 100% at 100% 100%, rgba(139,92,246,0.16), transparent 45%)',
            }}
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Crown className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-bold text-foreground md:text-2xl text-balance">
                  <T>Passe en Pro et débloque tout ChapCam</T>
                </h3>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground md:text-base">
                {['Plus de crédits', 'Qualité 4K', 'Avatars premium', 'Support prioritaire'].map((b) => (
                  <li key={b} className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-primary" />
                    <T>{b}</T>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/dashboard/plans"
              className="btn-glow inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-3.5 text-base font-bold text-black hover:bg-primary/90"
            >
              <T>Voir les offres</T>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
