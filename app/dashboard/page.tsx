import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ToolsGrid } from '@/components/dashboard/hub/tools-grid'
import { HeaderActions } from '@/components/dashboard/hub/header-actions'
import { EsimPromo } from '@/components/dashboard/esim-promo'
import { ConsentCard } from '@/components/dashboard/consent-card'
import { SupportBanner } from '@/components/dashboard/support-banner'
import { Sparkles, Crown, Check, Zap, Timer, Users, Hourglass, ArrowRight, Clock } from 'lucide-react'

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
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
      {/* ===== HERO ===== */}
      <header className="relative mb-8 overflow-hidden rounded-[28px] border border-hairline bg-card p-6 md:p-10">
        {/* dégradé premium purple-teal-cyan */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(120% 120% at 100% 0%, rgba(139,92,246,0.16), transparent 45%), radial-gradient(120% 120% at 0% 100%, rgba(0,255,136,0.14), transparent 45%), radial-gradient(90% 90% at 60% 50%, rgba(34,211,238,0.10), transparent 60%)',
          }}
        />
        {/* fine grille lumineuse */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full opacity-50 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.25), transparent 70%)' }}
        />

        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4 md:gap-5">
              {/* Avatar de profil ChapCam */}
              <div className="relative shrink-0">
                <div
                  aria-hidden
                  className="absolute -inset-2 rounded-full opacity-70 blur-xl"
                  style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.45), transparent 70%)' }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/dashboard/hero-avatar.jpg"
                  alt="Ton avatar ChapCam"
                  width={80}
                  height={80}
                  className="relative h-16 w-16 rounded-full border-2 border-primary/40 object-cover shadow-[0_8px_30px_-8px_rgba(99,102,241,0.6)] md:h-20 md:w-20"
                />
                <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary md:h-4 md:w-4" />
              </div>

              <div className="min-w-0">
                <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-background/50 px-3 py-1 text-xs font-semibold text-muted-foreground backdrop-blur">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  {isPro ? PLAN_LABELS[plan] || plan : 'Compte gratuit'}
                  <span className="mx-1 h-3 w-px bg-hairline" />
                  <Clock className="h-3 w-3" />
                  {fmtMinutes(points)} restantes
                </span>

                <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-5xl text-balance">
                  {`Bonjour ${displayName}`}
                </h1>
              </div>
            </div>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg text-pretty">
              Transforme ton apparence et ta voix en temps réel avec l’IA.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard/live-swap"
                className="group inline-flex items-center gap-2.5 rounded-2xl bg-primary px-7 py-3.5 text-base font-bold text-black shadow-[0_0_30px_rgba(0,255,136,0.4)] transition-all hover:scale-[1.02] hover:bg-primary/90 hover:shadow-[0_0_44px_rgba(0,255,136,0.55)]"
              >
                <Zap className="h-5 w-5" fill="currentColor" />
                Lancer le Live Swap
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/dashboard/plans"
                className="inline-flex items-center gap-2 rounded-2xl border border-hairline bg-background/40 px-6 py-3.5 text-base font-semibold text-foreground backdrop-blur transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Sparkles className="h-5 w-5" />
                Recharger
              </Link>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-4 lg:items-end">
            <EsimPromo />
            <HeaderActions />
          </div>
        </div>
      </header>

      {/* ===== Bannière assistance / support ===== */}
      <SupportBanner />

      {/* ===== Bannière utilisation responsable (compacte) ===== */}
      <ConsentCard initiallyAccepted={consentAccepted} />

      {/* ===== OUTILS (highlight) ===== */}
      <section aria-label="Outils ChapCam" className="mt-2">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl text-balance">
              Tous les outils ChapCam
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground md:text-base">
              Choisis l’outil que tu souhaites utiliser.
            </p>
          </div>
        </div>
        <ToolsGrid />
      </section>

      {/* ===== Utilisation rapide ===== */}
      <section aria-label="Utilisation rapide" className="mt-12">
        <h2 className="mb-5 text-xl font-bold text-foreground md:text-2xl">Utilisation rapide</h2>
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
              <p className="relative mt-1 text-xs text-text-faint">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Bannière Pro ===== */}
      {!isPro && (
        <section className="relative mt-12 overflow-hidden rounded-[28px] border border-hairline bg-card p-6 md:p-10">
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
                  Passe en Pro et débloque tout ChapCam
                </h3>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground md:text-base">
                {['Plus de crédits', 'Qualité 4K', 'Avatars premium', 'Support prioritaire'].map((b) => (
                  <li key={b} className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-primary" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/dashboard/plans"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-3.5 text-base font-bold text-black shadow-[0_0_30px_rgba(0,255,136,0.4)] transition-all hover:scale-[1.02] hover:bg-primary/90"
            >
              Voir les offres
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
