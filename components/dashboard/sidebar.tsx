'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Zap, Users, BarChart2, Settings, LogOut, Menu, Battery, Shield, ShieldCheck, CreditCard, Home, Languages, ImageIcon, Film, HelpCircle, AudioLines, Globe, ChevronRight, Crown, Mic, MessageSquare, Sparkles, Plus } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggleCompact } from '@/components/theme-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { useT } from '@/lib/i18n/language-provider'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import JetonsPage from '@/app/dashboard/jetons/page'

const fetcher = (url: string) => fetch(url).then((response) => response.json())

const PLAN_LABELS: Record<string, string> = {
  free: 'Gratuit',
  starter: 'Starter',
  standard: 'Standard',
  premium: 'Premium',
  ultimate: 'VIP PRO',
  vipdebout: 'VIP DEBOUT',
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-500 text-white',
  starter: 'bg-blue-500 text-white',
  standard: 'bg-green-500 text-white',
  premium: 'bg-purple-500 text-white',
  ultimate: 'bg-yellow-500 text-black',
  vipdebout: 'bg-yellow-500 text-black',
}

// Forfaits VIP : rendu premium (dore, logo couronne, halo).
const VIP_PLANS = new Set(['ultimate', 'vipdebout'])

const PLAN_POINTS: Record<string, number> = {
  free: 0,
  '1day': 600,
  '30days': 3000,
  '90days': 7500,
  '365days': 15000,
}

interface NavItem {
  href: string
  icon: React.ElementType
  label: string
  color: string
  // highlight = met l'element en avant en permanence (fond teinte + halo),
  // meme quand il n'est pas la page active. Utilise pour "RECHARGER".
  highlight?: boolean
}

// Elements utilitaires : lignes compactes et sobres (pas des cartes d'outils).
const navItems: NavItem[] = [
  { href: '/dashboard/stats', icon: BarChart2, label: 'STATISTIQUES', color: '#4ade80' },
  { href: '/dashboard/plans', icon: CreditCard, label: 'RECHARGER', color: '#facc15', highlight: true },
  { href: '/dashboard/settings', icon: Settings, label: 'PARAMETRES', color: '#94a3b8' },
]

// Outils IA premium : rendus en cartes glassmorphism avec couleur d'accent
// distincte, badge et micro-description. C'est le coeur visuel de la sidebar.
interface Tool {
  href: string
  icon: React.ElementType
  title: string
  description: string
  badge?: 'LIVE' | 'PRO' | 'NEW' | 'OTP'
  color: string
}

const tools: Tool[] = [
  { href: '/dashboard/chapverify', icon: ShieldCheck, title: 'ChapVerify', description: 'Détecte les deepfakes', badge: 'NEW', color: '#dc2626' },
  { href: '/dashboard/live-swap', icon: Zap, title: 'Live Swap', description: 'Change de visage en direct', badge: 'LIVE', color: '#3b82f6' },
  { href: '/dashboard/photo-video', icon: ImageIcon, title: 'Photos en Vidéo', description: 'Anime ta photo en vidéo', badge: 'NEW', color: '#22c55e' },
  { href: '/dashboard/genjutsu', icon: Sparkles, title: 'Genjutsu', description: 'Anime tes images', badge: 'NEW', color: '#c6f542' },
  { href: '/dashboard/video-translation', icon: Languages, title: 'Traduction Vidéo', description: 'Traduis ta vidéo en 190+ langues', badge: 'NEW', color: '#14b8a6' },
  { href: '/chapsim', icon: Globe, title: 'ChapSim', description: 'SMS OTP & proxy privé', badge: 'OTP', color: '#8b5cf6' },
  { href: '/dashboard/voice-swap', icon: AudioLines, title: 'Voice Swap', description: 'Change ta voix en temps réel', badge: 'PRO', color: '#ef4444' },
  { href: '/dashboard/message-vocal', icon: MessageSquare, title: 'Message Vocal', description: 'Change ta voix ou crée-la depuis un texte', badge: 'NEW', color: '#00d4ff' },
  { href: '/dashboard/voice-translator', icon: Mic, title: 'Voice Traducteur', description: 'Traduis et clone ta voix', badge: 'NEW', color: '#f59e0b' },
  { href: '/dashboard/avatars', icon: Users, title: 'Mes Avatars', description: 'Personnages IA réalistes', color: '#ec4899' },
  { href: '/dashboard/motion', icon: Film, title: 'Motion', description: 'Anime ta photo en 3D', badge: 'NEW', color: '#6366f1' },
]

// Formatage deterministe (identique serveur/client) pour eviter les erreurs
// d'hydratation liees a la locale du runtime (toLocaleString varie SSR vs navigateur).
function formatPoints(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f') // espace fine insecable comme separateur de milliers
}

// Carte d'outil premium : fond verre sombre translucide, tuile d'icone en
// couleur d'accent, bordure lumineuse + halo au survol. La couleur est injectee
// via la variable CSS `--tool` pour un accent distinct par outil.
function ToolCard({
  href,
  icon: Icon,
  title,
  description,
  badge,
  color,
  active,
}: {
  href: string
  icon: React.ElementType
  title: string
  description: string
  badge?: string
  color: string
  active?: boolean
}) {
  const t = useT()
  return (
    <Link
      href={href}
      className={`group relative mb-1 flex items-center gap-3 overflow-hidden rounded-lg border p-2.5 transition-colors duration-200 ${
          active
            ? 'border-blue-400/25 bg-blue-400/[0.09] text-foreground'
            : 'border-transparent bg-transparent text-muted-foreground hover:border-white/[0.08] hover:bg-muted dark:hover:bg-white/[0.045] hover:text-foreground'
        }`}
    >
      {/* Barre d'accent verticale a gauche (identite couleur de l'outil) */}
      <span
        className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-blue-400 opacity-0 transition-all duration-200 group-hover:opacity-60 group-hover:h-7"
        style={{ backgroundColor: 'rgba(96, 165, 250, 0.7)' }}
      />
      {/* Icône neutre et homogène */}
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted dark:bg-white/[0.06] text-muted-foreground dark:text-slate-300 transition-colors duration-200 group-hover:bg-muted group-hover:text-foreground dark:group-hover:bg-white/[0.1] dark:group-hover:text-white"
        style={{ color: 'rgb(148 163 184)' }}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.4} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[12.5px] font-bold uppercase leading-tight tracking-tight text-black dark:text-foreground">
            {t(title)}
          </span>
          {badge && (
            <span
              className="shrink-0 rounded-full px-1.5 py-[1px] text-[8.5px] font-extrabold uppercase tracking-wide"
              style={{ color: 'rgb(148 163 184)', backgroundColor: 'rgba(148, 163, 184, 0.12)' }}
            >
              {badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[10px] font-medium normal-case text-black dark:text-muted-foreground">
          {t(description)}
        </span>
      </span>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  )
}

interface SidebarContentProps {
  email: string | undefined
  plan: string
  expiresAt: string | null
  isActive: boolean
  avatarCount: number
  pointsRemaining: number
  pointsTotal: number
  onLogout: () => void
}

function SidebarContent({
  email,
  plan,
  expiresAt,
  isActive,
  avatarCount,
  pointsRemaining,
  pointsTotal,
  onLogout,
}: SidebarContentProps) {
  const t = useT()
  const { data: jetons } = useSWR<{ balance: number }>('/api/jetons', fetcher, { refreshInterval: 15000 })
  const [jetonsOpen, setJetonsOpen] = useState(false)
  const pathname = usePathname()
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false
  const showUpgradeBanner = plan === 'free' || isExpired || !isActive || pointsRemaining <= 0
  const pointsPercentage = pointsTotal > 0 ? (pointsRemaining / pointsTotal) * 100 : 0

  // Lien secret Admin Stats (visible uniquement par toi)
  const isAdmin = email === 'fanny.guck@gmail.com'

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="px-5 pb-4 pt-6">
        <Link href="/dashboard" className="group flex items-center gap-3">
          {/* Tuile de marque : logo ChapCam (infini) dans un cercle */}
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black shadow-lg shadow-primary/30 ring-2 ring-primary/30 transition-transform duration-200 group-hover:scale-105">
            <img
              src="/chapcam-mark.png"
              alt="Logo ChapCam"
              className="h-8 w-8 object-contain"
            />
            <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </span>
          </span>

          <span className="min-w-0">
            <span className="block text-2xl font-extrabold leading-none tracking-tight">
              <span className="text-foreground">Chap</span>
              <span className="text-primary">Cam</span>
            </span>
            <span className="mt-1.5 flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black dark:text-text-faint">
                {t('Swap en temps réel')}
              </span>
            </span>
          </span>
        </Link>
      </div>

      {/* Separateur */}
      <div className="mx-5 mb-2 h-px bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-1">
        {/* Accueil */}
        <Link
          href="/dashboard"
          style={{ ['--nav-accent' as string]: '#34d399' }}
          className={`group/nav relative mb-2 flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-[12px] font-semibold uppercase tracking-wide transition-colors duration-200 ${
            pathname === '/dashboard'
              ? 'bg-blue-400/[0.1] text-black dark:text-foreground'
              : 'text-black hover:bg-muted dark:text-slate-200 dark:hover:bg-white/[0.045] hover:text-foreground'
          }`}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted dark:bg-white/[0.06] text-muted-foreground dark:text-slate-300 transition-colors duration-200 group-hover/nav:bg-slate-200 group-hover/nav:text-slate-900 dark:group-hover/nav:bg-white/[0.1] dark:group-hover/nav:text-white"
            style={{ color: 'var(--nav-accent)' }}
          >
            <Home className="h-[17px] w-[17px]" strokeWidth={2.5} />
          </span>
          <span className="flex-1 truncate">Dashboard</span>
        </Link>

        {/* Outils IA premium (cartes glassmorphism) */}
        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black dark:text-text-faint">
          {t('Outils premium')}
        </p>
        {tools.map((tool) => (
          <ToolCard
            key={tool.href}
            href={tool.href}
            icon={tool.icon}
            title={tool.title}
            description={tool.description}
            badge={tool.badge}
            color={tool.color}
            active={pathname === tool.href}
          />
        ))}

        {/* Separateur avant les utilitaires */}
        <div className="my-3 h-px bg-sidebar-border" />

        {/* Utilitaires (lignes compactes) */}
        {navItems.map((item) => {
          const isActivePath = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{ ['--nav-accent' as string]: item.color }}
              className={`group/nav relative mb-1 flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-[12px] font-semibold uppercase tracking-wide transition-colors duration-200 ${
                isActivePath
                  ? 'bg-blue-400/[0.1] text-black dark:text-foreground'
                  : item.highlight
                    ? 'bg-muted dark:bg-white/[0.035] text-slate-900 dark:text-foreground hover:bg-white/[0.07]'
                    : 'text-black hover:bg-muted dark:text-slate-200 dark:hover:bg-white/[0.045] hover:text-foreground'
              }`}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted dark:bg-white/[0.06] text-muted-foreground dark:text-slate-300 transition-colors duration-200 group-hover/nav:bg-slate-200 group-hover/nav:text-slate-900 dark:group-hover/nav:bg-white/[0.1] dark:group-hover/nav:text-white"
                style={{ color: 'var(--nav-accent)' }}
              >
                <item.icon className="h-[17px] w-[17px]" strokeWidth={2.5} />
              </span>
              <span className="flex-1 truncate">{t(item.label)}</span>
            </Link>
          )
        })}

        {/* Aide & Support */}
        <a
          href="https://t.me/chapcam_support"
          target="_blank"
          rel="noopener noreferrer"
          style={{ ['--nav-accent' as string]: '#38bdf8' }}
          className="group/nav mb-1 flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] font-bold uppercase tracking-tight text-black transition-all duration-200 hover:bg-muted hover:text-foreground dark:text-slate-200"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted dark:bg-white/[0.06] text-muted-foreground dark:text-slate-300 transition-colors duration-200 group-hover/nav:bg-slate-200 group-hover/nav:text-slate-900 dark:group-hover/nav:bg-white/[0.1] dark:group-hover/nav:text-white"
            style={{ color: 'var(--nav-accent)' }}
          >
            <HelpCircle className="h-[17px] w-[17px]" strokeWidth={2.5} />
          </span>
          <span className="flex-1 truncate">{t('AIDE & SUPPORT')}</span>
        </a>

        {/* Lien Secret Admin Stats */}
        {isAdmin && (
          <Link
            href="/admin/stats"
            className="group/nav mb-1 flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] font-bold uppercase tracking-tight text-primary transition-all duration-200 ring-1 ring-primary/30 bg-primary/10 hover:bg-primary/15"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Shield className="h-[17px] w-[17px]" strokeWidth={2.5} />
            </span>
            <span className="flex-1 truncate">{t('ADMIN STATS')}</span>
          </Link>
        )}
      </nav>

      {/* User Info */}
      <div className="border-t border-hairline p-4">
        <p className="mb-3 truncate text-xs text-muted-foreground">{email}</p>

        <div className="mb-3 flex items-center gap-2">
          {VIP_PLANS.has(plan) ? (
            <span className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-md border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-200">
              <span className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_2.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              <Crown className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
              {t(PLAN_LABELS[plan] || plan)}
            </span>
          ) : (
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${PLAN_COLORS[plan] || 'bg-gray-500 text-white'}`}>
              {t(PLAN_LABELS[plan] || plan)}
            </span>
          )}
          {isExpired && <span className="text-xs text-red-400">{t('Expire')}</span>}
        </div>

  <div className="relative mb-3 overflow-hidden rounded-lg border border-emerald-300/25 bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.16),transparent_52%),linear-gradient(135deg,rgba(236,253,245,0.98),rgba(240,249,255,0.98))] dark:bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.2),transparent_52%),linear-gradient(135deg,rgba(8,35,45,0.96),rgba(10,20,35,0.98))] p-3 shadow-[0_14px_34px_-20px_rgba(16,185,129,0.65),inset_0_1px_0_rgba(255,255,255,0.1)]">
  <div className="flex items-center justify-between gap-2">
  <div className="flex min-w-0 items-center gap-2">
  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-emerald-400/15 ring-1 ring-emerald-300/35"><img src="/images/jetons-logo.jpg" alt="Logo Jetons" className="h-full w-full object-cover" /></span>
  <div className="min-w-0"><p className="text-xs font-semibold tracking-wide text-foreground">Jetons</p><p className="truncate text-[10px] text-emerald-900/75 dark:text-emerald-200/60">Solde commun de tous les outils</p></div>
  </div>
  <div className="flex items-center gap-1.5"><span className="text-xl font-black tabular-nums text-emerald-950 drop-shadow-[0_0_12px_rgba(110,231,183,0.45)] dark:text-emerald-100">{jetons?.balance ?? 0}</span><button type="button" onClick={() => setJetonsOpen(true)} aria-label="Ajouter des jetons" title="Ajouter des jetons" className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-300 text-emerald-950 shadow-md shadow-emerald-950/30 transition hover:scale-105 hover:bg-emerald-200"><Plus className="h-4 w-4" strokeWidth={3} /></button></div>
  </div>
      <p className="mt-2 text-[11px] leading-4 text-black dark:text-text-faint">Utilisables sur tous les outils sauf Live Swap.</p>
      </div>
      {jetonsOpen && <JetonsPage modal onClose={() => setJetonsOpen(false)} />}

        <div className="mb-3 rounded-lg border border-border bg-card p-3 dark:border-white/[0.08] dark:bg-white/[0.035]">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Battery className={`h-4 w-4 ${VIP_PLANS.has(plan) ? 'text-yellow-500' : 'text-primary'}`} />
              <span className="text-xs font-medium text-foreground">{t('Points restants')}</span>
            </div>
            <span className="text-sm font-black text-cyan-950 drop-shadow-[0_0_10px_rgba(103,232,249,0.35)] dark:text-cyan-100">
              {formatPoints(pointsRemaining)}/{formatPoints(pointsTotal)}
            </span>
          </div>
          <Progress value={pointsPercentage} className="h-2 bg-slate-950/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.45)] [&>div]:bg-gradient-to-r [&>div]:from-emerald-300 [&>div]:to-cyan-300 [&>div]:shadow-[0_0_12px_rgba(45,212,191,0.75)]" />
          <p className="mt-2 text-xs text-black dark:text-text-faint">
            = {Math.floor(pointsRemaining / 2 / 60)} {t('min de swap')}
          </p>
        </div>

        <div className="mb-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{t('Avatars utilises')}</span>
          <span>{avatarCount}/∞</span>
        </div>

        {/* Bascule clair / sombre + langue */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <ThemeToggleCompact />
          <LanguageToggle />
        </div>

        {showUpgradeBanner && (
<div className="relative mb-3 overflow-hidden rounded-lg border border-cyan-300/20 bg-[radial-gradient(circle_at_100%_0%,rgba(59,130,246,0.18),transparent_55%),linear-gradient(135deg,rgba(9,25,52,0.96),rgba(19,19,52,0.96))] p-3 shadow-[0_14px_34px_-20px_rgba(59,130,246,0.6),inset_0_1px_0_rgba(255,255,255,0.1)]">
            <p className="mb-2 text-xs text-orange-300">
              {t('Recharge tes points pour continuer')}
            </p>
            <Link
              href="/dashboard/plans"
              className="block rounded-md bg-blue-500/80 py-2 text-center text-xs font-semibold uppercase text-white transition-colors hover:bg-orange-600"
            >
              {t('VOIR LES OFFRES')}
            </Link>
          </div>
        )}

        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          {t('Deconnexion')}
        </button>
      </div>
    </div>
  )
}

// Le reste du fichier reste identique (DashboardSidebar + PlanGuardBanner)
interface DashboardSidebarProps {
  email: string | undefined
  plan: string
  expiresAt: string | null
  isActive: boolean
  avatarCount: number
  pointsRemaining?: number
  pointsTotal?: number
}

export function DashboardSidebar({
  email,
  plan,
  expiresAt,
  isActive,
  avatarCount,
  pointsRemaining = 0,
  pointsTotal = 0,
}: DashboardSidebarProps) {
  const t = useT()
  const router = useRouter()
  const { data: jetons } = useSWR<{ balance: number }>('/api/jetons', fetcher, { refreshInterval: 15000 })
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <>
<aside className="fixed left-0 top-0 z-40 hidden h-screen w-[240px] border-r border-sidebar-border bg-sidebar md:block">
  <div className="relative h-full w-full overflow-hidden bg-sidebar">
            <SidebarContent
              email={email}
              plan={plan}
              expiresAt={expiresAt}
              isActive={isActive}
              avatarCount={avatarCount}
              pointsRemaining={pointsRemaining}
              pointsTotal={pointsTotal}
              onLogout={handleLogout}
            />
          </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 pb-[env(safe-area-inset-top)] md:hidden">
        <h1 className="text-xl font-bold">
          <span className="text-foreground">Chap</span>
          <span className="text-primary">Cam</span>
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full bg-muted px-3 py-1">
            <Battery className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground">{pointsRemaining}</span>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="p-2 text-foreground">
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] border-sidebar-border bg-sidebar p-0 pb-[env(safe-area-inset-bottom)] text-sidebar-foreground">
              <SheetTitle className="sr-only">{t('Menu de navigation')}</SheetTitle>
              <SidebarContent
                email={email}
                plan={plan}
                expiresAt={expiresAt}
                isActive={isActive}
                avatarCount={avatarCount}
                pointsRemaining={pointsRemaining}
                pointsTotal={pointsTotal}
                onLogout={() => {
                  setMobileOpen(false)
                  handleLogout()
                }}
              />
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  )
}

interface PlanGuardBannerProps {
  plan: string
  expiresAt: string | null
  isActive: boolean
  pointsRemaining?: number
  voiceSecondsRemaining?: number
}

export function PlanGuardBanner({ plan, expiresAt, isActive, pointsRemaining = 0, voiceSecondsRemaining = 0 }: PlanGuardBannerProps) {
  const t = useT()
  const pathname = usePathname()

  // La page Voice Swap utilise un credit distinct (minutes ChapVoice). Si
  // l'utilisateur a des minutes de voix, on ne montre pas la banniere "points".
  const onVoiceSwap = pathname === '/dashboard/voice-swap'
  if (onVoiceSwap && voiceSecondsRemaining > 0) return null

  // Expiration = annulation immediate (cf. lib/live-guard + /api/points) : un
  // forfait expire renvoie deja isActive=false et points=0. Le bandeau reflete
  // donc directement la capacite a swaper : on ne l'affiche que si le compte est
  // inactif (forfait expire/gratuit) ou s'il n'a plus de points.
  const canSwap = isActive && pointsRemaining > 0
  if (canSwap) return null

  return (
    <div className="fixed left-0 right-0 top-14 z-40 flex items-center justify-between bg-orange-500 px-4 py-2 md:left-[240px] md:top-0">
      <p className="text-sm font-medium text-foreground">
        {onVoiceSwap
          ? t('Recharge une offre ChapVoice pour activer le changement de voix')
          : pointsRemaining <= 0
            ? t('Tu as epuise tes points — Recharge pour continuer le swap')
            : t('Tu es sur le plan gratuit — Active un abonnement pour demarrer le swap')}
      </p>
      <Link
        href={onVoiceSwap ? '/dashboard/voice-swap' : '/dashboard/plans'}
        className="rounded-lg bg-white px-4 py-1.5 text-xs font-bold uppercase text-orange-500 transition-colors hover:bg-gray-100"
      >
        {t('RECHARGER')}
      </Link>
    </div>
  )
}
