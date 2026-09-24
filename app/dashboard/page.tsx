import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ToolsGrid } from '@/components/dashboard/hub/tools-grid'
import { PremiumHeader } from '@/components/dashboard/premium-header'
import { ConsentCard } from '@/components/dashboard/consent-card'
import { SupportBanner } from '@/components/dashboard/support-banner'
import { VideoHistorySection } from '@/components/video-history-section'
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

      {/* ===== OUTILS (highlight) ===== */}
      <section aria-label="Outils ChapCam" className="mt-1">
        <div className="mb-3 flex items-end justify-between gap-4 border-b border-border pb-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl text-balance">
              <T>Tous les outils ChapCam</T>
            </h2>
            <p className="mt-1 text-xs text-muted-foreground md:text-sm">
              <T>Des outils IA puissants pour donner vie à toutes tes idées.</T>
            </p>
          </div>
        </div>
        <ToolsGrid />
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="min-w-0 rounded-xl border border-border bg-card p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground"><T>Mes créations récentes</T></h2>
              <p className="mt-1 text-xs text-muted-foreground"><T>Retrouve rapidement tes dernières vidéos.</T></p>
            </div>
            <Link href="/dashboard/mes-demandes" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-700 transition hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200">
              <T>Voir toutes mes créations</T><ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <VideoHistorySection tool="all" compact />
        </div>
        <SupportBanner />
      </section>

      <section aria-label="Utilisation rapide" className="mt-5 border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground"><T>Utilisation rapide</T></span>
          <span><b className="text-foreground">{swapsToday}</b> <T>swaps aujourd’hui</T></span>
          <span><b className="text-foreground">{fmtMinutes(points)}</b> <T>minutes restantes</T></span>
          <span><b className="text-foreground">{avatarCount ?? 0}</b> <T>avatars créés</T></span>
          <span><b className="text-foreground">{minutesToday} min</b> <T>aujourd’hui</T></span>
        </div>
      </section>

      {/* ===== Bannière Pro ===== */}
      {!isPro && (
        <section className="relative mt-7 overflow-hidden rounded-xl border border-border bg-card p-4 md:p-5 dark:border-white/[0.08] dark:bg-white/[0.025]">
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
