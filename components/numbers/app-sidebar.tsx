'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useNumbers } from '@/components/numbers/numbers-provider'
import {
  Hash,
  LayoutDashboard,
  Store,
  Phone,
  MessageSquareText,
  Code2,
  Settings,
  Menu,
  X,
  ArrowUpRight,
} from 'lucide-react'

const NAV = [
  { href: '/numbers/app', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/numbers/app/marketplace', label: 'Marketplace', icon: Store },
  { href: '/numbers/app/numbers', label: 'My Numbers', icon: Phone },
  { href: '/numbers/app/messages', label: 'Messages', icon: MessageSquareText, badge: true },
  { href: '/numbers/app/developers', label: 'Developers', icon: Code2 },
]

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { unreadCount } = useNumbers()

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
            )}
          >
            <item.icon className={cn('h-[18px] w-[18px]', active && 'text-primary')} />
            <span className="flex-1">{item.label}</span>
            {item.badge && unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/numbers" className="flex items-center gap-2 px-2 pt-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Hash className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">
          ChapCam <span className="text-muted-foreground">Numbers</span>
        </span>
      </Link>

      <NavList onNavigate={onNavigate} />

      <div className="flex flex-col gap-1 border-t border-hairline pt-3">
        <Link
          href="/numbers/app/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          <Settings className="h-[18px] w-[18px]" />
          Settings
        </Link>
        <Link
          href="/numbers"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          <ArrowUpRight className="h-[18px] w-[18px]" />
          Back to site
        </Link>

        <div className="mt-2 flex items-center gap-3 rounded-xl border border-hairline bg-card px-3 py-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
            AD
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">Ada Dev</p>
            <p className="truncate text-xs text-muted-foreground">Growth plan</p>
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
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-hairline bg-background/90 px-4 backdrop-blur md:hidden">
        <Link href="/numbers/app" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Hash className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="text-sm font-semibold">ChapCam Numbers</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-hairline bg-card/30 md:block">
        <SidebarInner />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[260px] border-r border-hairline bg-background">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg border border-hairline"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarInner onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
