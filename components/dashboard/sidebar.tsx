'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Zap, Users, BarChart2, Settings, LogOut, Menu } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

const PLAN_LIMITS: Record<string, number> = {
  free: 0,
  '1day': 1,
  '30days': 3,
  '90days': 10,
  '365days': Infinity,
}

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

interface NavItem {
  href: string
  icon: React.ElementType
  label: string
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: Zap, label: 'LIVE SWAP' },
  { href: '/dashboard/avatars', icon: Users, label: 'MES AVATARS' },
  { href: '/dashboard/stats', icon: BarChart2, label: 'STATISTIQUES' },
  { href: '/dashboard/settings', icon: Settings, label: 'PARAMÈTRES' },
]

interface SidebarContentProps {
  email: string | undefined
  plan: string
  expiresAt: string | null
  isActive: boolean
  avatarCount: number
  onLogout: () => void
}

function SidebarContent({
  email,
  plan,
  expiresAt,
  isActive,
  avatarCount,
  onLogout,
}: SidebarContentProps) {
  const pathname = usePathname()
  const maxAvatars = PLAN_LIMITS[plan] ?? 0
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false
  const showUpgradeBanner = plan === 'free' || isExpired || !isActive

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold">
          <span className="text-white">Chap</span>
          <span className="text-[#00ff88]">Cam</span>
        </h1>
        <p className="mt-1 text-xs uppercase tracking-wider text-gray-500">
          SWAP EN TEMPS RÉEL
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold uppercase transition-all duration-200 ${
                isActive
                  ? 'border-l-2 border-[#00ff88] bg-white/5 text-[#00ff88]'
                  : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      <div className="border-t border-white/10 p-4">
        {/* Email */}
        <p className="mb-3 truncate text-xs text-gray-400">{email}</p>

        {/* Plan Badge */}
        <div className="mb-3 flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${PLAN_COLORS[plan]}`}
          >
            {PLAN_LABELS[plan]}
          </span>
          {isExpired && (
            <span className="text-xs text-red-400">Expiré</span>
          )}
        </div>

        {/* Avatar Usage */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-400">
            <span>Avatars utilisés</span>
            <span>
              {avatarCount}/{maxAvatars === Infinity ? '∞' : maxAvatars}
            </span>
          </div>
          <Progress
            value={maxAvatars === Infinity ? 0 : (avatarCount / maxAvatars) * 100}
            className="h-1.5 bg-white/10"
          />
        </div>

        {/* Upgrade Banner */}
        {showUpgradeBanner && (
          <div className="mb-3 rounded-lg bg-orange-500/20 p-3">
            <p className="mb-2 text-xs text-orange-300">
              ⚡ Upgrade pour accéder au swap
            </p>
            <Link
              href="/dashboard/plans"
              className="block rounded-lg bg-orange-500 py-2 text-center text-xs font-bold uppercase text-white transition-colors hover:bg-orange-600"
            >
              UPGRADER
            </Link>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </div>
  )
}

interface DashboardSidebarProps {
  email: string | undefined
  plan: string
  expiresAt: string | null
  isActive: boolean
  avatarCount: number
}

export function DashboardSidebar({
  email,
  plan,
  expiresAt,
  isActive,
  avatarCount,
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
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[240px] border-r border-white/10 bg-[#0a0a0a] md:block">
        <SidebarContent
          email={email}
          plan={plan}
          expiresAt={expiresAt}
          isActive={isActive}
          avatarCount={avatarCount}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile Topbar */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-white/10 bg-[#0a0a0a] px-4 md:hidden">
        <h1 className="text-xl font-bold">
          <span className="text-white">Chap</span>
          <span className="text-[#00ff88]">Cam</span>
        </h1>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="p-2 text-white">
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[280px] border-white/10 bg-[#0a0a0a] p-0"
          >
            <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
            <SidebarContent
              email={email}
              plan={plan}
              expiresAt={expiresAt}
              isActive={isActive}
              avatarCount={avatarCount}
              onLogout={() => {
                setMobileOpen(false)
                handleLogout()
              }}
            />
          </SheetContent>
        </Sheet>
      </header>
    </>
  )
}

interface PlanGuardBannerProps {
  plan: string
  expiresAt: string | null
  isActive: boolean
}

export function PlanGuardBanner({ plan, expiresAt, isActive }: PlanGuardBannerProps) {
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false
  const showBanner = plan === 'free' || isExpired || !isActive

  if (!showBanner) return null

  return (
    <div className="fixed left-0 right-0 top-14 z-40 flex items-center justify-between bg-orange-500 px-4 py-2 md:left-[240px] md:top-0">
      <p className="text-sm font-medium text-white">
        ⚡ Tu es sur le plan gratuit — Active un abonnement pour démarrer le swap
      </p>
      <Link
        href="/dashboard/plans"
        className="rounded-lg bg-white px-4 py-1.5 text-xs font-bold uppercase text-orange-500 transition-colors hover:bg-gray-100"
      >
        VOIR LES OFFRES
      </Link>
    </div>
  )
}
