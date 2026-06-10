import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ToolsGrid } from '@/components/dashboard/hub/tools-grid'
import { HeaderActions } from '@/components/dashboard/hub/header-actions'
import { ConsentCard } from '@/components/dashboard/consent-card'
import { UserCircle, Cloud, Sparkles, Gauge, Clock, Crown, Check, Zap, Timer, Users, Hourglass } from 'lucide-react'

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
    { data: activeAvatar },
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
      .select('name')
      .eq('user_id', user?.id ?? '')
      .eq('is_active', true)
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
  const avatarName = activeAvatar?.name ?? 'Aucun avatar'
  const consentAccepted = (user?.user_metadata?.consent_accepted as boolean | undefined) ?? false

  const infoCards = [
    { icon: UserCircle, label: 'Avatar actif', value: avatarName, sub: 'Naturel', color: '#00ff88' },
    { icon: Cloud, label: 'Mode', value: 'Cloud', sub: 'Connecté', color: '#22d3ee' },
    { icon: Sparkles, label: 'Qualité', value: 'Ultra HD', sub: '4K', color: '#22d3ee' },
    { icon: Gauge, label: 'Latence', value: '120 ms', sub: 'Faible', color: '#2563eb' },
    { icon: Clock, label: 'Crédits restants', value: fmtMinutes(points), sub: PLAN_LABELS[plan] || plan, color: '#f97316' },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      {/* Hero header */}
      <header className="relative mb-6 overflow-hidden rounded-3xl border border-hairline bg-card p-6 md:p-8">
        {/* subtle brand glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(0,255,136,0.25), transparent 70%)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 right-1/3 h-56 w-56 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.25), transparent 70%)' }}
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-background/60 px-3 py-1 text-xs font-semibold text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {isPro ? PLAN_LABELS[plan] || plan : 'Compte gratuit'}
            </span>
            <h1 className="mt-3 text-2xl font-bold text-foreground md:text-3xl text-balance">
              {`Bonjour ${displayName}`}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              Tous tes outils de transformation IA réunis au même endroit. Choisis un outil et lance-toi.
            </p>
          </div>
          <HeaderActions />
        </div>

        {/* Quick account chips */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {infoCards.map((c) => (
            <div
              key={c.label}
              className="flex items-center gap-3 rounded-2xl border border-hairline bg-background/50 p-3 backdrop-blur transition-colors hover:border-primary/30"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${c.color}22` }}
              >
                <c.icon className="h-[18px] w-[18px]" style={{ color: c.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-text-faint">{c.label}</p>
                <p className="truncate text-sm font-bold text-foreground">{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* Confirmation d'utilisation responsable */}
      <ConsentCard initiallyAccepted={consentAccepted} />

      {/* Tools */}
      <section aria-label="Outils ChapCam" className="mt-2">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground md:text-2xl">Tous les outils ChapCam</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choisis l’outil que tu souhaites utiliser.</p>
          </div>
        </div>
        <ToolsGrid />
      </section>

      {/* Utilisation rapide */}
      <section aria-label="Utilisation rapide" className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-foreground md:text-2xl">Utilisation rapide</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: Zap, label: 'Swaps aujourd’hui', value: String(swapsToday), color: '#00ff88' },
            { icon: Timer, label: 'Minutes restantes', value: fmtMinutes(points), color: '#f97316' },
            { icon: Users, label: 'Avatars créés', value: String(avatarCount ?? 0), color: '#22d3ee' },
            { icon: Hourglass, label: 'Temps aujourd’hui', value: `${minutesToday} min`, color: '#00ff88' },
          ].map((s) => (
            <div
              key={s.label}
              className="group rounded-2xl border border-hairline bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_12px_40px_-12px_rgba(0,255,136,0.25)]"
            >
              <div
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: `${s.color}22` }}
              >
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="mt-0.5 text-xs text-text-faint">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Premium banner */}
      {!isPro && (
        <section className="relative mt-10 overflow-hidden rounded-3xl border border-hairline bg-card p-6 md:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full opacity-40 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(0,255,136,0.22), transparent 70%)' }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 right-0 h-56 w-56 rounded-full opacity-30 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.22), transparent 70%)' }}
          />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground md:text-xl text-balance">
                  Passe en Pro et débloque tout le potentiel de ChapCam
                </h3>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
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
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-6 py-3 font-bold text-black shadow-[0_0_24px_rgba(0,255,136,0.35)] transition-all hover:bg-primary/90"
            >
              Voir les offres
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
