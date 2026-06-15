'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { timeAgo, getInitials } from '@/lib/numbers/data'
import { serviceBySlug } from '@/lib/numbers/catalog'
import { formatXOF } from '@/lib/numbers/types'
import { Bell, Wallet, Plus, ChevronDown, User, Settings, LogOut } from 'lucide-react'

const TITLES: Record<string, string> = {
  '/numbers/app': 'Tableau de bord',
  '/numbers/app/marketplace': 'Acheter un numéro',
  '/numbers/app/numbers': 'Mes numéros',
  '/numbers/app/messages': 'Messages',
  '/numbers/app/history': 'Historique',
  '/numbers/app/wallet': 'Portefeuille',
  '/numbers/app/support': 'Assistance',
  '/numbers/app/settings': 'Paramètres',
  '/numbers/app/admin': "Panneau d'administration",
}

export function AppTopbar() {
  const pathname = usePathname()
  const title = TITLES[pathname] ?? 'Tableau de bord'
  const { balanceXof, activations, unreadCount } = useNumbers()
  const { user } = useNumbers()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const recent = activations.filter((a) => a.code).sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
  const unread = unreadCount

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-white/10 bg-[#0a0e1a]/80 px-4 backdrop-blur-xl sm:px-6">
      <h1 className="text-lg font-semibold text-white">{title}</h1>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/numbers/app/wallet"
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm transition-colors hover:bg-white/10"
        >
          <Wallet className="h-4 w-4 text-[#60a5fa]" />
          <span className="font-semibold text-white">{formatXOF(balanceXof)}</span>
          <span className="hidden text-slate-400 sm:inline">solde</span>
          <Plus className="h-3.5 w-3.5 text-slate-400" />
        </Link>

        <div className="relative">
          <button
            onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false) }}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2563EB] px-1 text-[10px] font-bold text-white">{unread}</span>}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-11 w-80 overflow-hidden rounded-xl border border-white/10 bg-[#0c1322] shadow-2xl">
              <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">Notifications</div>
              <ul className="max-h-80 divide-y divide-white/5 overflow-y-auto">
                {recent.length === 0 && (
                  <li className="px-4 py-6 text-center text-xs text-slate-500">Aucune notification</li>
                )}
                {recent.map((a) => (
                  <li key={a.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">
                        {serviceBySlug(a.serviceSlug)?.label ?? a.serviceLabel}
                      </span>
                      <span className="text-[11px] text-slate-500">{timeAgo(a.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-400">{a.fullSms ?? `Code : ${a.code}`}</p>
                  </li>
                ))}
              </ul>
              <Link href="/numbers/app/messages" onClick={() => setNotifOpen(false)} className="block border-t border-white/10 px-4 py-2.5 text-center text-sm font-medium text-[#60a5fa] hover:bg-white/5">
                Voir tous les messages
              </Link>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false) }}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 py-1 pl-1 pr-2 transition-colors hover:bg-white/10"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2563EB]/20 text-xs font-bold text-[#60a5fa]">
              {getInitials(user.name)}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-11 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#0c1322] shadow-2xl">
              <div className="border-b border-white/10 px-4 py-3">
                <p className="truncate text-sm font-medium text-white">{user.name}</p>
                <p className="truncate text-xs text-slate-400">{user.email}</p>
              </div>
              <div className="p-1.5">
                <ProfileLink href="/numbers/app/settings" icon={User} label="Profil" onClick={() => setProfileOpen(false)} />
                <ProfileLink href="/numbers/app/settings" icon={Settings} label="Paramètres" onClick={() => setProfileOpen(false)} />
                <ProfileLink href="/dashboard" icon={LogOut} label="Retour à ChapCam" onClick={() => setProfileOpen(false)} />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function ProfileLink({ href, icon: Icon, label, onClick }: { href: string; icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
      <Icon className="h-4 w-4" /> {label}
    </Link>
  )
}
