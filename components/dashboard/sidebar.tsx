'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Zap, Users, BarChart2, Settings, LogOut, Menu, Battery, Shield, ShieldCheck, CreditCard, Home, Languages, ImageIcon, Film, HelpCircle, Monitor, AudioLines, Smartphone, Globe, ChevronRight } from 'lucide-react'
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
  '1day': 'Plan 1 jour',
  '30days': 'Plan 30 jours',
  '90days': 'Plan 90 jours',
  '365days': 'Plan 365 jours',
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-500',
  '1day': 'bg-blue-500',
  '30days': 'bg-green-500',
  '90days': 'bg-purple-500',
  '365days': 'bg-yellow-500',
}

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
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: Home, label: 'DASHBOARD' },
  { href: '/dashboard/live-swap', icon: Zap, label: 'LIVE SWAP' },
  { href: '/dashboard/voice-swap', icon: AudioLines, label: 'VOICE SWAP', badge: 'PRO' },
  { href: '/dashboard/voice-translator', icon: Languages, label: 'VOICE TRADUCTEUR', badge: 'NEW' },
  { href: '/dashboard/photo-video', icon: ImageIcon, label: 'PHOTOS EN VIDEO', badge: 'NEW' },
  { href: '/dashboard/video-translation', icon: Film, label: 'TRADUCTION VIDEO', badge: 'NEW' },
  { href: '/dashboard/proxy', icon: Shield, label: 'NAVIGATION SECURISEE', badge: 'NEW' },
  { href: '/dashboard/proxy-pro', icon: ShieldCheck, label: 'CHAPCAM PROXY PRO', badge: 'PRO' },
  { href: '/dashboard/avatars', icon: Users, label: 'MES AVATARS' },
  { href: '/dashboard/stats', icon: BarChart2, label: 'STATISTIQUES' },
  { href: '/dashboard/plans', icon: CreditCard, label: 'RECHARGER' },
  { href: '/dashboard/settings', icon: Settings, label: 'PARAMETRES' },
]

type FeaturedTone = 'green' | 'blue' | 'purple'

const FEATURED_TONES: Record<
  FeaturedTone,
  { bg: string; border: string; shadow: string; tile: string; badge: string; sub: string }
> = {
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
      <div className="p-6">
        <h1 className="text-2xl font-bold">
          <span className="text-foreground">Chap</span>
          <span className="text-primary">Cam</span>
        </h1>
        <p className="mt-1 text-xs uppercase tracking-wider text-text-faint">
          SWAP EN TEMPS REEL
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-1">
        {navItems.map((item) => {
          const isActivePath = pathname === item.href
          return (
            <div key={item.href}>
              {/* Boutons vedette premium (ChapCam PC / ESIM / ChapSim) */}
              {item.href === '/dashboard/live-swap' && (
                <div className="mb-3 mt-1">
                  <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-faint">
                    Premium
                  </p>
                  <FeaturedLink
                    href="/dashboard/chapcam-pc"
                    icon={Monitor}
                    title="ChapCam PC"
                    subtitle="Windows · licence à vie"
                    badge="À vie"
                    tone="green"
                    active={pathname === '/dashboard/chapcam-pc'}
                  />
                  <FeaturedLink
                    href="/numbers"
                    icon={Smartphone}
                    title="ESIM ChapCam"
                    subtitle="Numéros virtuels · 150+ pays"
                    badge="New"
                    tone="blue"
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
              className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-bold uppercase tracking-tight transition-all duration-200 ${
                isActivePath
                  ? 'border-l-2 border-primary bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
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
            </div>
          )
        })}

        {/* Aide & Support */}
        <a
          href="https://t.me/chapcam_support"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-bold uppercase tracking-tight text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
        >
          <HelpCircle className="h-[18px] w-[18px] shrink-0" />
          <span className="flex-1 truncate">AIDE & SUPPORT</span>
        </a>

        {/* Lien Secret Admin Stats */}
        {isAdmin && (
          <Link
            href="/admin/stats"
            className="mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-bold uppercase tracking-tight text-primary transition-all duration-200 hover:bg-muted border-l-2 border-primary"
          >
            <Shield className="h-[18px] w-[18px] shrink-0" />
            ADMIN STATS
          </Link>
        )}
      </nav>

      {/* User Info */}
      <div className="border-t border-hairline p-4">
        <p className="mb-3 truncate text-xs text-muted-foreground">{email}</p>

        <div className="mb-3 flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold text-foreground ${PLAN_COLORS[plan] || 'bg-gray-500'}`}>
            {PLAN_LABELS[plan] || plan}
          </span>
          {isExpired && <span className="text-xs text-red-400">Expire</span>}
        </div>

        <div className="mb-3 rounded-lg bg-muted p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Battery className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-foreground">Points restants</span>
            </div>
            <span className="text-sm font-bold text-foreground">
              {pointsRemaining.toLocaleString()}/{pointsTotal.toLocaleString()}
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
