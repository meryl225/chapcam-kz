'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Phone, Menu, X } from 'lucide-react'

const LINKS = [
  { href: '#countries', label: 'Countries' },
  { href: '#solutions', label: 'Solutions' },
  { href: '#how', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
]

export function SiteNav() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0e1a]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/numbers" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB]">
            <Phone className="h-4 w-4 text-white" />
          </span>
          <span className="text-base font-semibold text-white">
            ChapCam <span className="text-[#60a5fa]">Numbers</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-slate-300 transition-colors hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/numbers/app" className="text-sm font-medium text-slate-200 transition-colors hover:text-white">
            Sign in
          </Link>
          <Link
            href="/numbers/app"
            className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition-colors hover:bg-[#1d4ed8]"
          >
            Get Started
          </Link>
        </div>

        <button className="text-white md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#0a0e1a] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm text-slate-300">
                {l.label}
              </a>
            ))}
            <Link href="/numbers/app" className="mt-2 rounded-lg bg-[#2563EB] px-4 py-2 text-center text-sm font-semibold text-white">
              Get Started
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
