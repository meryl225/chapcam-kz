'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { ArrowRight, Clock, Plus, Sparkles } from 'lucide-react'
import { T } from '@/components/i18n/t'

const fetcher = (url: string) => fetch(url).then((response) => response.json())

type PremiumHeaderProps = {
  displayName: string
  planLabel: string
  points: number
  maxPoints: number
  minutesLabel: string
  isPro: boolean
}

export function PremiumHeader({ displayName, planLabel, points, maxPoints, minutesLabel, isPro }: PremiumHeaderProps) {
  const { data: jetons } = useSWR<{ balance: number }>('/api/jetons', fetcher, { refreshInterval: 15000 })
  const progress = maxPoints > 0 ? Math.min(100, Math.max(0, (points / maxPoints) * 100)) : 0
  return (
    <div className="mb-8 space-y-5">
      <header className="flex flex-col gap-5 rounded-[22px] border border-white/[0.08] bg-card/90 px-5 py-5 shadow-[0_18px_60px_-35px_rgba(0,0,0,0.8)] md:flex-row md:items-center md:justify-between md:px-7">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_currentColor]" />
            <T>Studio ChapCam</T>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"><T>Bonjour</T> {displayName}</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted-foreground"><T>Transforme ton apparence et ta voix en temps réel avec l’IA.</T></p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-white/10 bg-background/40 px-3 py-2 text-xs font-semibold text-muted-foreground sm:inline-flex">{isPro ? planLabel : 'Compte gratuit'}</span>
          <Link href="/dashboard/jetons" className="group inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_10px_28px_-10px_hsl(var(--primary))] transition hover:-translate-y-0.5 hover:brightness-110"><Sparkles className="h-4 w-4" /><T>Recharger</T><ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
        </div>
      </header>

      <section aria-label="Solde ChapCam" className="grid gap-3 lg:grid-cols-[1.05fr_1.25fr_0.8fr]">
        <div className="rounded-2xl border border-emerald-300/25 bg-emerald-400/[0.06] p-5 shadow-[0_18px_45px_-30px_rgba(16,185,129,0.5)]">
          <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full ring-1 ring-emerald-200/50"><img src="/images/jetons-logo.jpg" alt="Logo des Jetons" className="h-full w-full object-cover" /></span><div><p className="text-sm font-semibold text-foreground"><T>Mes jetons</T></p><p className="mt-1 text-3xl font-black tabular-nums text-emerald-200">{jetons?.balance ?? 0}</p></div></div><Link href="/dashboard/jetons" aria-label="Ajouter des jetons" className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-300 text-emerald-950 transition hover:scale-105"><Plus className="h-5 w-5" /></Link></div>
          <p className="mt-4 text-xs leading-5 text-emerald-100/65"><T>Utilisables sur les outils ChapCam hors Live Swap</T></p>
        </div>

        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.05] p-5">
          <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-300/15 text-cyan-300"><Clock className="h-6 w-6" /></span><div><p className="text-sm font-semibold text-foreground"><T>Live Swap</T></p><p className="mt-1 text-3xl font-black tabular-nums text-cyan-200">{minutesLabel} <span className="text-xs font-medium text-cyan-100/60">min restantes</span></p></div></div><span className="text-right text-xs font-semibold text-muted-foreground">{points} / {maxPoints}<br /><span className="font-normal">points</span></span></div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-background/70"><div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${progress}%` }} /></div>
        </div>

        <Link href="/dashboard/jetons" className="group flex min-h-[132px] flex-col justify-between rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white shadow-[0_18px_45px_-25px_rgba(59,130,246,0.75)] transition hover:-translate-y-0.5 hover:brightness-110"><div className="flex items-center justify-between"><Sparkles className="h-6 w-6" /><ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" /></div><span className="text-lg font-bold"><T>Recharger</T><span className="mt-1 block text-xs font-medium text-white/70"><T>Ajouter des Jetons à ton solde</T></span></span></Link>
      </section>
    </div>
  )
}
