'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Zap, Users, BarChart2, Settings, LogOut, Menu, Battery, Shield, CreditCard, Home, Languages, ImageIcon, Film, HelpCircle, AudioLines, Globe, ChevronRight, Crown } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggleCompact } from '@/components/theme-toggle'
import { useState, useEffect } from 'react'

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
  badge?: 'NEW' | 'PRO'
  color: string
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: Home, label: 'DASHBOARD', color: '#34d399' },
  { href: '/dashboard/voice-swap', icon: AudioLines, label: 'VOICE SWAP', badge: 'PRO', color: '#ef4444' },
  { href: '/dashboard/voice-translator', icon: Languages, label: 'VOICE TRADUCTEUR', badge: 'NEW', color: '#38bdf8' },
  { href: '/dashboard/avatars', icon: Users, label: 'MES AVATARS', color: '#22d3ee' },
  { href: '/dashboard/stats', icon: BarChart2, label: 'STATISTIQUES', color: '#4ade80' },
  { href: '/dashboard/plans', icon: CreditCard, label: 'RECHARGER', color: '#facc15' },
  { href: '/dashboard/settings', icon: Settings, label: 'PARAMETRES', color: '#94a3b8' },
]

// Formatage deterministe (identique serveur/client) pour eviter les erreurs
// d'hydratation liees a la locale du runtime (toLocaleString varie SSR vs navigateur).
function formatPoints(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f') // espace fine insecable comme separateur de milliers
}

type FeaturedTone = 'green' | 'blue' | 'purple' | 'cyan'

const FEATURED_TONES: Record<
  FeaturedTone,
  { bg: string; border: string; shadow: string; tile: string; badge: string; sub: string }
> = {
  cyan: {
    bg: 'bg-gradient-to-br from-[#0891b2] to-[#06b6d4] text-white',
    border: 'border-[#06b6d4]/40',
    shadow: 'shadow-[#0891b2]/40',
    tile: 'bg-white/15',
    badge: 'bg-white/20 text-white',
    sub: 'text-white/75',
  },
  green: {
    bg: 'bg-gradient-to-br from-primary to-emerald-400 text-black',
    border: 'border-primary/40',
    shadow: 'shadow-primary/30',
    tile: 'bg-black/15',
    badge: 'bg-black/20 text-black',
    sub: 'text-black/70',
  },
  blue: {
    bg: 'bg-gradient-to-br from-[#2563EB] to-[#3b82f6] text-white',
    border: 'border-[#3b82f6]/40',
    shadow: 'shadow-[#2563EB]/40',
    tile: 'bg-white/15',
    badge: 'bg-white/20 text-white',
    sub: 'text-white/75',
  },
  purple: {
    bg: 'bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] text-white',
    border: 'border-[#7c3aed]/40',
    shadow: 'shadow-[#7c3aed]/40',
    tile: 'bg-white/15',
    badge: 'bg-white/20 text-white',
    sub: 'text-white/75',
  },
}

function FeaturedLink({
  href,
  icon: Icon,
  title,
  subtitle,
  badge,
  tone,
  active,
}: {
  href: string
  icon: React.ElementType
  title: string
  subtitle: string
  badge: string
  tone: FeaturedTone
  active?: boolean
}) {
  const t = FEATURED_TONES[tone]
  return (
    <Link
      href={href}
      className={`group relative mb-2 flex items-center gap-3 overflow-hidden rounded-xl border ${t.border} ${t.bg} p-2.5 shadow-lg ${t.shadow} transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 ${active ? 'ring-2 ring-white/50' : ''}`}
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${t.tile}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-bold uppercase leading-tight tracking-tight">
            {title}
          </span>
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${t.badge}`}
          >
            {badge}
          </span>
        </span>
        <span className={`mt-0.5 block truncate text-[10px] font-medium normal-case ${t.sub}`}>
          {subtitle}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5" />
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
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-faint">
                Swap en temps réel
              </span>
            </span>
          </span>
        </Link>
      </div>

      {/* Separateur */}
      <div className="mx-5 mb-2 h-px bg-gradient-to-r from-transparent via-hairline to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-1">
        {navItems.map((item) => {
          const isActivePath = pathname === item.href
          return (
            <div key={item.href}>
              {/* Boutons vedette premium (Live Swap / ChapCam PC / ChapSim) */}
              {item.href === '/dashboard/voice-swap' && (
                <div className="mb-3 mt-1">
                  <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-faint">
                    Premium
                  </p>
                  <FeaturedLink
                    href="/dashboard/live-swap"
                    icon={Zap}
                    title="Live Swap"
                    subtitle="Change de visage en temps réel"
                    badge="Live"
                    tone="blue"
                    active={pathname === '/dashboard/live-swap'}
                  />
                  <FeaturedLink
                    href="/chapsim"
                    icon={Globe}
                    title="ChapSim"
                    subtitle="SMS OTP & proxies premium"
                    badge="OTP"
                    tone="purple"
                  />
                </div>
              )}
            <Link
              href={item.href}
              style={{ ['--nav-accent' as string]: item.color }}
              className={`group/nav mb-1 flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] font-bold uppercase tracking-tight transition-all duration-200 ${
                isActivePath
                  ? 'bg-[var(--nav-accent)]/10 text-foreground shadow-sm ring-1 ring-[var(--nav-accent)]/30'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm transition-all duration-200 group-hover/nav:brightness-110 group-hover/nav:shadow-[0_4px_14px_-4px_var(--nav-accent)]"
                style={{ backgroundColor: 'var(--nav-accent)' }}
              >
                <item.icon className="h-[17px] w-[17px]" strokeWidth={2.5} />
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge === 'NEW' && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                  NEW
                </span>
              )}
              {item.badge === 'PRO' && (
                <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold text-violet-300">
                  PRO
                </span>
              )}
            </Link>
            {/* Vedette : Studio Photo en Video, mis en avant juste sous Voice Swap */}
            {item.href === '/dashboard/voice-swap' && (
              <div className="mb-2 mt-2">
                <FeaturedLink
                  href="/dashboard/photo-video"
                  icon={ImageIcon}
                  title="Photos en Vidéo"
                  subtitle="Anime ta photo : elle parle avec ta voix"
                  badge="New"
                  tone="green"
                  active={pathname === '/dashboard/photo-video'}
                />
                <FeaturedLink
                  href="/dashboard/motion"
                  icon={Film}
                  title="Motion"
                  subtitle="Anime ta photo en clip avec mouvement de caméra"
                  badge="New"
                  tone="purple"
                  active={pathname === '/dashboard/motion'}
                />
                <FeaturedLink
                  href="/dashboard/video-translation"
                  icon={Languages}
                  title="Traduction Vidéo"
                  subtitle="Traduis ta vidéo dans 190 langues"
                  badge="New"
                  tone="cyan"
                  active={pathname === '/dashboard/video-translation'}
                />
              </div>
            )}
            </div>
          )
        })}

        {/* Aide & Support */}
        <a
          href="https://t.me/chapcam_support"
          target="_blank"
          rel="noopener noreferrer"
          style={{ ['--nav-accent' as string]: '#38bdf8' }}
          className="group/nav mb-1 flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] font-bold uppercase tracking-tight text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm transition-all duration-200 group-hover/nav:brightness-110 group-hover/nav:shadow-[0_4px_14px_-4px_var(--nav-accent)]"
            style={{ backgroundColor: 'var(--nav-accent)' }}
          >
            <HelpCircle className="h-[17px] w-[17px]" strokeWidth={2.5} />
          </span>
          <span className="flex-1 truncate">AIDE & SUPPORT</span>
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
            <span className="flex-1 truncate">ADMIN STATS</span>
          </Link>
        )}
      </nav>

      {/* User Info */}
      <div className="border-t border-hairline p-4">
        <p className="mb-3 truncate text-xs text-muted-foreground">{email}</p>

        <div className="mb-3 flex items-center gap-2">
          {VIP_PLANS.has(plan) ? (
            <span className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-black shadow-[0_0_16px_rgba(250,204,21,0.55)] ring-1 ring-yellow-200/60">
              <span className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_2.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              <Crown className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
              {PLAN_LABELS[plan] || plan}
            </span>
          ) : (
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${PLAN_COLORS[plan] || 'bg-gray-500 text-white'}`}>
              {PLAN_LABELS[plan] || plan}
            </span>
          )}
          {isExpired && <span className="text-xs text-red-400">Expire</span>}
        </div>

        <div className={`mb-3 rounded-lg p-3 ${VIP_PLANS.has(plan) ? 'bg-gradient-to-br from-yellow-500/10 to-amber-500/5 ring-1 ring-yellow-500/30' : 'bg-muted'}`}>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Battery className={`h-4 w-4 ${VIP_PLANS.has(plan) ? 'text-yellow-500' : 'text-primary'}`} />
              <span className="text-xs font-medium text-foreground">Points restants</span>
            </div>
            <span className="text-sm font-bold text-foreground">
              {formatPoints(pointsRemaining)}/{formatPoints(pointsTotal)}
            </span>
          </div>
          <Progress value={pointsPercentage} className="h-2 bg-secondary" />
          <p className="mt-2 text-xs text-text-faint">
            = {Math.floor(pointsRemaining / 2 / 60)} min de swap
          </p>
        </div>

        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Avatars utilises</span>
          <span>{avatarCount}/∞</span>
        </div>

        {/* Bascule clair / sombre */}
        <div className="mb-3">
          <ThemeToggleCompact />
        </div>

        {showUpgradeBanner && (
          <div className="mb-3 rounded-lg bg-orange-500/20 p-3">
            <p className="mb-2 text-xs text-orange-300">
              Recharge tes points pour continuer
            </p>
            <Link
              href="/dashboard/plans"
              className="block rounded-lg bg-orange-500 py-2 text-center text-xs font-bold uppercase text-white transition-colors hover:bg-orange-600"
            >
              VOIR LES OFFRES
            </Link>
          </div>
        )}

        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Deconnexion
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
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[240px] border-r border-hairline bg-sidebar md:block">
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
      </aside>

      <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-hairline bg-sidebar px-4 md:hidden">
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
            <SheetContent side="left" className="w-[280px] border-hairline bg-sidebar p-0">
              <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
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
  const pathname = usePathname()
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false

  // La page Voice Swap utilise un credit distinct (minutes ChapVoice). Si
  // l'utilisateur a des minutes de voix, on ne montre pas la banniere "points".
  const onVoiceSwap = pathname === '/dashboard/voice-swap'
  if (onVoiceSwap && voiceSecondsRemaining > 0) return null

  const showBanner = plan === 'free' || isExpired || !isActive || pointsRemaining <= 0

  if (!showBanner) return null

  return (
    <div className="fixed left-0 right-0 top-14 z-40 flex items-center justify-between bg-orange-500 px-4 py-2 md:left-[240px] md:top-0">
      <p className="text-sm font-medium text-foreground">
        {onVoiceSwap
          ? 'Recharge une offre ChapVoice pour activer le changement de voix'
          : pointsRemaining <= 0
            ? 'Tu as epuise tes points — Recharge pour continuer le swap'
            : 'Tu es sur le plan gratuit — Active un abonnement pour demarrer le swap'}
      </p>
      <Link
        href={onVoiceSwap ? '/dashboard/voice-swap' : '/dashboard/plans'}
        className="rounded-lg bg-white px-4 py-1.5 text-xs font-bold uppercase text-orange-500 transition-colors hover:bg-gray-100"
      >
        RECHARGER
      </Link>
    </div>
  )
}
