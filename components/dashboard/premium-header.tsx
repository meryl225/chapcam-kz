'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { ArrowRight, Clock, Plus, Sparkles, FolderPlus } from 'lucide-react'
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
    <div className="mb-7 space-y-4">
      <header className="flex flex-col gap-4 border-b border-white/[0.08] px-1 pb-5 md:flex-row md:items-center md:justify-between">
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
          <Link href="/dashboard" className="hidden min-h-11 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-white/20 hover:bg-white/[0.08] hover:text-foreground sm:inline-flex"><FolderPlus className="h-4 w-4" /><T>Nouveau projet</T></Link>
          <Link href="/dashboard/live-swap" className="group inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_10px_28px_-10px_hsl(var(--primary))] transition hover:-translate-y-0.5 hover:brightness-110"><Sparkles className="h-4 w-4" /><T>Recharger</T><ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
        </div>
      </header>

      <section aria-label="Solde ChapCam" className="grid gap-3 lg:grid-cols-[1fr_1.15fr_0.82fr]">
        <div className="relative overflow-hidden rounded-xl border border-emerald-300/25 bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,0.18),transparent_45%),linear-gradient(135deg,rgba(8,35,45,0.95),rgba(10,20,35,0.96))] p-4 shadow-[0_18px_45px_-24px_rgba(16,185,129,0.65),inset_0_1px_0_rgba(255,255,255,0.12)] before:pointer-events-none before:absolute before:inset-0 before:rounded-xl before:ring-1 before:ring-inset before:ring-emerald-200/10">
          <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full ring-1 ring-emerald-200/50"><img src="/images/jetons-logo.jpg" alt="Logo des Jetons" className="h-full w-full object-cover" /></span><div><p className="text-sm font-semibold text-foreground"><T>Mes jetons</T></p><p className="mt-1 text-4xl font-black tabular-nums text-emerald-100 drop-shadow-[0_0_16px_rgba(110,231,183,0.45)]">{jetons?.balance ?? 0}</p></div></div><Link href="/dashboard/jetons" aria-label="Ajouter des jetons" className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-300 text-emerald-950 transition hover:scale-105"><Plus className="h-5 w-5" /></Link></div>
          <p className="mt-4 text-xs leading-5 text-emerald-100/65"><T>Utilisables sur les outils ChapCam hors Live Swap</T></p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-cyan-300/25 bg-[radial-gradient(circle_at_82%_0%,rgba(59,130,246,0.2),transparent_48%),linear-gradient(135deg,rgba(9,25,52,0.98),rgba(19,19,52,0.95))] p-4 shadow-[0_18px_45px_-24px_rgba(59,130,246,0.7),inset_0_1px_0_rgba(255,255,255,0.12)] before:pointer-events-none before:absolute before:inset-0 before:rounded-xl before:ring-1 before:ring-inset before:ring-cyan-200/10">
          <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-300/15 text-cyan-300"><Clock className="h-6 w-6" /></span><div><p className="text-sm font-semibold text-foreground"><T>Live Swap</T></p><p className="mt-1 text-4xl font-black tabular-nums text-cyan-100 drop-shadow-[0_0_16px_rgba(103,232,249,0.45)]">{minutesLabel} <span className="text-xs font-medium text-cyan-100/60">min restantes</span></p></div></div><span className="text-right text-xs font-semibold text-muted-foreground">{points} / {maxPoints}<br /><span className="font-normal">points</span></span></div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.45)]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-400 shadow-[0_0_14px_rgba(34,211,238,0.8)] transition-all" style={{ width: `${progress}%` }} /></div>
        </div>

        <Link href="/dashboard/live-swap" className="group relative flex min-h-[132px] flex-col justify-between overflow-hidden rounded-xl border border-blue-200/25 bg-[radial-gradient(circle_at_15%_0%,rgba(125,211,252,0.35),transparent_38%),linear-gradient(135deg,#1687f5_0%,#4234c9_55%,#7928ca_100%)] p-4 text-white shadow-[0_20px_48px_-20px_rgba(59,130,246,0.85),inset_0_1px_0_rgba(255,255,255,0.3)] transition hover:-translate-y-0.5 hover:brightness-110"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65"><T>Abonnement Live Swap</T></span><ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" /></div><span className="text-lg font-bold"><T>Gérer mon abonnement</T></span></Link>
      </section>
    </div>
  )
}
