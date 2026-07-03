'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { getInitials } from '@/lib/numbers/data'
import {
  Phone, LayoutDashboard, Store, MessageSquareText, Settings, Menu, X,
  ArrowUpRight, Wallet, History, LifeBuoy, SignalHigh, ShieldAlert, Globe,
} from 'lucide-react'

const NAV = [
  { href: '/numbers/app', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { href: '/numbers/app/marketplace', label: 'Acheter un numéro', icon: Store },
  { href: '/numbers/app/numbers', label: 'Mes numéros', icon: SignalHigh },
  { href: '/numbers/app/messages', label: 'Messages', icon: MessageSquareText, badge: true },
  { href: '/numbers/app/history', label: 'Historique', icon: History },
  { href: '/numbers/app/wallet', label: 'Portefeuille', icon: Wallet },
  { href: '/numbers/app/support', label: 'Assistance', icon: LifeBuoy },
  { href: '/numbers/app/settings', label: 'Paramètres', icon: Settings },
]

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { unreadCount } = useNumbers()
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active ? 'bg-[#2563EB]/15 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white',
            )}
          >
            <item.icon className={cn('h-[18px] w-[18px]', active && 'text-[#60a5fa]')} />
            <span className="flex-1">{item.label}</span>
            {item.badge && unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2563EB] px-1.5 text-[11px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

// Email de l'administratrice : seul ce compte voit l'accès Admin.
const ADMIN_EMAIL = 'fanny.guck@gmail.com'

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useNumbers()
  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL
  return (
    <div className="flex h-full flex-col gap-5 p-4">
      <Link href="/numbers/app" className="flex items-center gap-2 px-2 pt-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB]">
          <Phone className="h-4 w-4 text-white" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-white">
          ChapCam <span className="text-slate-400">Numbers</span>
        </span>
      </Link>

      <NavList onNavigate={onNavigate} />

      {/* Visuel ChapSim cliquable — image exacte de la presentation */}
      <Link
        href="/chapsim"
        onClick={onNavigate}
        className="group block overflow-hidden rounded-xl border border-white/10 shadow-lg shadow-[#7c3aed]/20 transition-transform duration-200 hover:scale-[1.02]"
        aria-label="Découvrir ChapSim"
      >
        <img
          src="/chapsim/presentation.jpg"
          alt="ChapSim — Numéros virtuels, SMS OTP et proxies premium"
          className="h-auto w-full"
        />
      </Link>

      {/* Bouton vedette ChapSim — numeros virtuels, SMS OTP & proxies premium */}
      <Link
        href="/chapsim"
        onClick={onNavigate}
        className="group relative flex items-center gap-3 overflow-hidden rounded-lg bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] px-3 py-3 text-sm font-bold text-white shadow-lg shadow-[#7c3aed]/40 transition-all duration-200 hover:brightness-110"
      >
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        <Globe className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1 leading-tight">ChapSim</span>
        <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-extrabold tracking-wide">
          OTP
        </span>
      </Link>

      <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
        {isAdmin && (
          <Link href="/numbers/app/admin" onClick={onNavigate} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300">
            <ShieldAlert className="h-[18px] w-[18px]" /> Admin
          </Link>
        )}
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white">
          <ArrowUpRight className="h-[18px] w-[18px]" /> Retour à ChapCam
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB]/20 text-xs font-bold text-[#60a5fa]">
            {getInitials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AppSidebar() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-[#0a0e1a]/90 px-4 backdrop-blur md:hidden">
        <Link href="/numbers/app" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2563EB]"><Phone className="h-4 w-4 text-white" /></span>
          <span className="text-sm font-semibold text-white">ChapCam Numbers</span>
        </Link>
        <button onClick={() => setOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-white/10 bg-[#0c1322] md:block">
        <SidebarInner />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[260px] border-r border-white/10 bg-[#0c1322]">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            <SidebarInner onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
