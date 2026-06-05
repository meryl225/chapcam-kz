import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ToolsGrid } from '@/components/dashboard/hub/tools-grid'
import { ChapCamPcCard } from '@/components/dashboard/hub/chapcam-pc-card'
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
    { icon: Sparkles, label: 'Qualité', value: 'Ultra HD', sub: '4K', color: '#8b5cf6' },
    { icon: Gauge, label: 'Latence', value: '120 ms', sub: 'Faible', color: '#2563eb' },
    { icon: Clock, label: 'Crédits restants', value: fmtMinutes(points), sub: PLAN_LABELS[plan] || plan, color: '#f97316' },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl text-balance">
            {`Bienvenue ${displayName} `}
            <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Voici un aperçu de tous les outils ChapCam.</p>
        </div>
        <HeaderActions />
      </header>

      {/* Confirmation d'utilisation responsable */}
      <ConsentCard initiallyAccepted={consentAccepted} />

      {/* Info bar */}
      <section
        aria-label="Aperçu du compte"
        className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        {infoCards.map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-3 rounded-2xl border border-hairline bg-card p-4"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${c.color}22` }}
            >
              <c.icon className="h-5 w-5" style={{ color: c.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-faint">{c.label}</p>
              <p className="truncate text-sm font-bold text-foreground">{c.value}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Tools */}
      <section aria-label="Outils ChapCam">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-foreground">Tous les outils ChapCam</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choisissez l’outil que vous souhaitez utiliser.</p>
        </div>
        <ToolsGrid />
      </section>

      {/* Offre ChapCam PC */}
      <section aria-label="ChapCam PC" className="mt-8">
        <ChapCamPcCard />
      </section>

      {/* Utilisation rapide */}
      <section aria-label="Utilisation rapide" className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-foreground">Utilisation rapide</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: Zap, label: 'Swaps aujourd’hui', value: String(swapsToday), color: '#00ff88' },
            { icon: Timer, label: 'Minutes restantes', value: fmtMinutes(points), color: '#f97316' },
            { icon: Users, label: 'Avatars créés', value: String(avatarCount ?? 0), color: '#8b5cf6' },
            { icon: Hourglass, label: 'Temps aujourd’hui', value: `${minutesToday} min`, color: '#22d3ee' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-hairline bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30"
            >
              <div
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg"
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
        <section className="mt-8 overflow-hidden rounded-2xl border border-hairline bg-gradient-to-r from-primary/15 via-[#0f1a14] to-violet-600/20 p-6 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground md:text-xl text-balance">
                  Passez en Pro et débloquez tout le potentiel de ChapCam
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
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-6 py-3 font-bold text-black transition-colors hover:bg-primary/90"
            >
              Voir les offres
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
