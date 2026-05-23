'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Zap, Users, BarChart2, Settings, LogOut, Menu, CreditCard, Battery, Shield } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
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
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: Zap, label: 'LIVE SWAP' },
  { href: '/dashboard/avatars', icon: Users, label: 'MES AVATARS' },
  { href: '/dashboard/stats', icon: BarChart2, label: 'STATISTIQUES' },
  { href: '/dashboard/settings', icon: Settings, label: 'PARAMETRES' },
  { href: '/dashboard/plans', icon: CreditCard, label: 'RECHARGE' },
]

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
          <span className="text-white">Chap</span>
          <span className="text-[#00ff88]">Cam</span>
        </h1>
        <p className="mt-1 text-xs uppercase tracking-wider text-gray-500">
          SWAP EN TEMPS REEL
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        {navItems.map((item) => {
          const isActivePath = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold uppercase transition-all duration-200 ${
                isActivePath
                  ? 'border-l-2 border-[#00ff88] bg-white/5 text-[#00ff88]'
                  : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}

        {/* Lien Secret Admin Stats */}
        {isAdmin && (
          <Link
            href="/admin/stats"
            className="mb-1 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold uppercase transition-all duration-200 text-[#00ff88] hover:bg-white/5 border-l-2 border-[#00ff88]"
          >
            <Shield className="h-5 w-5" />
            ADMIN STATS
          </Link>
        )}
      </nav>

      {/* User Info */}
      <div className="border-t border-white/10 p-4">
        <p className="mb-3 truncate text-xs text-gray-400">{email}</p>

        <div className="mb-3 flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${PLAN_COLORS[plan] || 'bg-gray-500'}`}>
            {PLAN_LABELS[plan] || plan}
          </span>
          {isExpired && <span className="text-xs text-red-400">Expire</span>}
        </div>

        <div className="mb-3 rounded-lg bg-white/5 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Battery className="h-4 w-4 text-[#00ff88]" />
              <span className="text-xs font-medium text-gray-300">Points restants</span>
            </div>
            <span className="text-sm font-bold text-white">
              {pointsRemaining.toLocaleString()}/{pointsTotal.toLocaleString()}
            </span>
          </div>
          <Progress value={pointsPercentage} className="h-2 bg-white/10" />
          <p className="mt-2 text-xs text-gray-500">
            = {Math.floor(pointsRemaining / 2 / 60)} min de swap
          </p>
        </div>

        <Link
          href="/dashboard/plans"
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-2.5 text-xs font-bold uppercase text-white transition-colors hover:bg-orange-600"
        >
          <Zap className="h-4 w-4" />
          + RECHARGER
        </Link>

        <div className="mb-3 flex items-center justify-between text-xs text-gray-400">
          <span>Avatars utilises</span>
          <span>{avatarCount}/∞</span>
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
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-red-400"
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
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[240px] border-r border-white/10 bg-[#0a0a0a] md:block">
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

      <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-white/10 bg-[#0a0a0a] px-4 md:hidden">
        <h1 className="text-xl font-bold">
          <span className="text-white">Chap</span>
          <span className="text-[#00ff88]">Cam</span>
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
            <Battery className="h-4 w-4 text-[#00ff88]" />
            <span className="text-xs font-bold text-white">{pointsRemaining}</span>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="p-2 text-white">
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] border-white/10 bg-[#0a0a0a] p-0">
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
}

export function PlanGuardBanner({ plan, expiresAt, isActive, pointsRemaining = 0 }: PlanGuardBannerProps) {
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false
  const showBanner = plan === 'free' || isExpired || !isActive || pointsRemaining <= 0

  if (!showBanner) return null

  return (
    <div className="fixed left-0 right-0 top-14 z-40 flex items-center justify-between bg-orange-500 px-4 py-2 md:left-[240px] md:top-0">
      <p className="text-sm font-medium text-white">
        {pointsRemaining <= 0 
          ? 'Tu as epuise tes points — Recharge pour continuer le swap'
          : 'Tu es sur le plan gratuit — Active un abonnement pour demarrer le swap'
        }
      </p>
      <Link
        href="/dashboard/plans"
        className="rounded-lg bg-white px-4 py-1.5 text-xs font-bold uppercase text-orange-500 transition-colors hover:bg-gray-100"
      >
        RECHARGER
      </Link>
    </div>
  )
}
