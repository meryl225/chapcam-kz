'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Activity, ArrowDownToLine, ArrowUpRight, Clock3, Globe2, RefreshCw, Shield, Users, Zap } from 'lucide-react'

type Period = 'today' | '7d' | '30d' | 'all'
interface Country { country: string; count: number }
interface Stats { totalUsers: number; todayRegistrations: number; onlineUsers: number; activeSwaps: number; activeSubscriptions: number }
interface Consumption { totals?: { users: number; sessions: number; points: number; seconds: number }; users?: { email: string | null; plan: string | null; sessions: number; points: number; seconds: number; lastActivity: string }[] }
interface FinancialRow { month: string; revenue: number; transactionsPaid: number; uniquePayingUsers: number; newPayingUsers: number; activeSubscribers: number; arppu: number; growthMoM: number | null }
interface FinancialSummary { cumulativeRevenue: number; septemberRevenue: number; historicalUniquePayingUsers: number; activeSubscribers: number }

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: "Aujourd'hui" },
  { id: '7d', label: '7 jours' },
  { id: '30d', label: '30 jours' },
  { id: 'all', label: 'Tout' },
]

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return minutes > 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes} min`
}
function formatCountry(code: string) {
  if (code === 'Inconnu') return code
  try { return new Intl.DisplayNames(['fr'], { type: 'region' }).of(code) ?? code } catch { return code }
}
function Kpi({ label, value, detail, icon: Icon, tone }: { label: string; value: string | number; detail: string; icon: typeof Users; tone: string }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-xl shadow-black/10">
    <div className="flex items-start justify-between"><span className="text-sm text-slate-400">{label}</span><span className={`rounded-lg bg-white/5 p-2 ${tone}`}><Icon className="h-4 w-4" /></span></div>
    <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{value}</p><p className="mt-2 text-xs text-slate-500">{detail}</p>
  </div>
}

export default function AdminStatsPage() {
  const [period, setPeriod] = useState<Period>('7d')
  const [stats, setStats] = useState<Stats | null>(null)
  const [consumption, setConsumption] = useState<Consumption | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [financials, setFinancials] = useState<FinancialRow[]>([])
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null)
  const [totalLocated, setTotalLocated] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setRefreshing(true); setError(null)
    try {
      const [s, g, c, f] = await Promise.all([
        fetch('/api/admin/stats', { cache: 'no-store' }),
        fetch('/api/admin/geo', { cache: 'no-store' }),
        fetch(`/api/admin/consumption?period=${period}`, { cache: 'no-store' }),
        fetch('/api/admin/financials', { cache: 'no-store' }),
      ])
      if (!s.ok) throw new Error(`Erreur statistiques (${s.status})`)
      const sj = await s.json(); setStats(sj)
      if (g.ok) { const gj = await g.json(); setCountries(gj.countries ?? []); setTotalLocated(gj.totalLocated ?? 0) }
      if (c.ok) setConsumption(await c.json())
      if (f.ok) {
        const financialData = await f.json()
        setFinancials(financialData.months ?? [])
        setFinancialSummary(financialData.summary ?? null)
      }
      setLastUpdated(new Date())
    } catch (e) { setError(e instanceof Error ? e.message : 'Impossible de charger les données.') }
    finally { setLoading(false); setRefreshing(false) }
  }, [period])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    createClient().auth.getUser().then((result: { data: { user: { email?: string | null } | null } }) => {
      if (!result.data.user || result.data.user.email !== 'fanny.guck@gmail.com') window.location.href = '/dashboard'
    })
  }, [])

  const exportData = () => {
    const payload = { exportedAt: new Date().toISOString(), period, stats, consumption, countries }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `chapcam-analytics-${period}.json`; a.click(); URL.revokeObjectURL(url)
  }
  const topCountries = useMemo(() => countries.slice(0, 8), [countries])
  const totals = consumption?.totals

  if (loading) return <main className="min-h-screen bg-[#07101d] p-8 text-slate-300"><div className="mx-auto max-w-7xl animate-pulse">Chargement des données analytics réelles…</div></main>

  return <main className="min-h-screen bg-[#07101d] px-4 py-8 text-slate-200 md:px-8">
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div><div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan-400"><Shield className="h-4 w-4" /> ChapCam intelligence</div><h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">Investor analytics</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Vue opérationnelle fondée uniquement sur les données disponibles de ChapCam. Aucun chiffre simulé.</p></div>
        <div className="flex items-center gap-2"><button onClick={exportData} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"><ArrowDownToLine className="h-4 w-4" /> Exporter</button><button onClick={load} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Actualiser</button></div>
      </header>
      {error && <div role="alert" className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-1">{PERIODS.map(p => <button key={p.id} onClick={() => setPeriod(p.id)} className={`rounded-lg px-3 py-2 text-sm ${period === p.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{p.label}</button>)}</div><span className="text-xs text-slate-500">{lastUpdated ? `Dernière mise à jour ${lastUpdated.toLocaleTimeString('fr-FR')}` : ''}</span></div>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Comptes créés" value={(stats?.totalUsers ?? 0).toLocaleString('fr-FR')} detail="Total Auth Supabase" icon={Users} tone="text-cyan-300" />
        <Kpi label="Abonnements actifs" value={(stats?.activeSubscriptions ?? 0).toLocaleString('fr-FR')} detail="Comptes avec abonnement actif" icon={ArrowUpRight} tone="text-emerald-300" />
        <Kpi label="Utilisateurs en ligne" value={(stats?.onlineUsers ?? 0).toLocaleString('fr-FR')} detail="Activité observée sur 5 minutes" icon={Activity} tone="text-amber-300" />
        <Kpi label="Swaps en cours" value={(stats?.activeSwaps ?? 0).toLocaleString('fr-FR')} detail="Sessions live actuellement actives" icon={Zap} tone="text-violet-300" />
      </section>
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Kpi label="Sessions sur la période" value={(totals?.sessions ?? 0).toLocaleString('fr-FR')} detail="Source : swap_sessions" icon={Activity} tone="text-cyan-300" />
        <Kpi label="Points consommés" value={(totals?.points ?? 0).toLocaleString('fr-FR')} detail="Source : swap_sessions" icon={Zap} tone="text-orange-300" />
        <Kpi label="Temps consommé" value={formatDuration(totals?.seconds ?? 0)} detail="Source : swap_sessions" icon={Clock3} tone="text-pink-300" />
      </section>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold text-white">Utilisation par compte</h2><p className="text-xs text-slate-500">Top 200, triés par points consommés</p></div><Link href="/admin/consumption" className="text-sm text-cyan-400 hover:text-cyan-300">Voir le détail</Link></div>{consumption?.users?.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-3">Compte</th><th className="pb-3">Forfait</th><th className="pb-3 text-right">Sessions</th><th className="pb-3 text-right">Points</th></tr></thead><tbody className="divide-y divide-slate-800">{consumption.users.slice(0, 8).map((u, i) => <tr key={`${u.email}-${i}`}><td className="py-3 text-slate-300">{u.email ?? 'Compte non identifié'}</td><td className="py-3 text-slate-500">{u.plan ?? '—'}</td><td className="py-3 text-right text-slate-300">{u.sessions}</td><td className="py-3 text-right font-medium text-white">{u.points.toLocaleString('fr-FR')}</td></tr>)}</tbody></table></div> : <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">Aucune session pour cette période.</div>}</section>
        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5"><div className="mb-5 flex items-center gap-2"><Globe2 className="h-4 w-4 text-cyan-300" /><div><h2 className="font-semibold text-white">Répartition géographique</h2><p className="text-xs text-slate-500">{totalLocated.toLocaleString('fr-FR')} comptes localisés par IP</p></div></div>{topCountries.length ? <div className="space-y-4">{topCountries.map(c => { const pct = totalLocated ? Math.round(c.count / totalLocated * 100) : 0; return <div key={c.country}><div className="mb-1 flex justify-between text-sm"><span>{formatCountry(c.country)}</span><span className="text-slate-500">{c.count} · {pct}%</span></div><div className="h-1.5 rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${pct}%` }} /></div></div> })}</div> : <p className="text-sm text-slate-500">Aucune donnée géographique disponible.</p>}</section>
      </div>
      <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Revenus cumulés depuis lancement" value={`${(financialSummary?.cumulativeRevenue ?? 0).toLocaleString('fr-FR')} F`} detail="Paiements validés Supabase" icon={ArrowUpRight} tone="text-emerald-300" />
        <Kpi label="Revenus septembre" value={`${(financialSummary?.septemberRevenue ?? 0).toLocaleString('fr-FR')} F`} detail="Mois de septembre 2026" icon={ArrowUpRight} tone="text-cyan-300" />
        <Kpi label="Payants historiques uniques" value={(financialSummary?.historicalUniquePayingUsers ?? 0).toLocaleString('fr-FR')} detail="Utilisateurs payants dédupliqués" icon={Users} tone="text-amber-300" />
        <Kpi label="Abonnements actifs" value={(financialSummary?.activeSubscribers ?? 0).toLocaleString('fr-FR')} detail="Actifs à fin septembre 2026" icon={ArrowUpRight} tone="text-violet-300" />
      </section>
      <section className="mt-5 rounded-2xl border border-emerald-500/20 bg-slate-950/60 p-5"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-semibold text-white">Tableau financier</h2><p className="mt-1 text-xs text-slate-500">Mai 2026 → septembre 2026 · Supabase uniquement · paiements validés et dédupliqués</p></div><span className="text-xs text-emerald-300">Source : payment_requests + subscriptions</span></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-3">Mois</th><th className="pb-3 text-right">Revenus encaissés</th><th className="pb-3 text-right">Transactions</th><th className="pb-3 text-right">Payants uniques</th><th className="pb-3 text-right">Nouveaux payants</th><th className="pb-3 text-right">Abonnés actifs</th><th className="pb-3 text-right">ARPPU</th><th className="pb-3 text-right">Croissance MoM</th></tr></thead><tbody className="divide-y divide-slate-800">{financials.map((row) => <tr key={row.month}><td className="py-3 font-medium text-white">{new Date(`${row.month}-02T00:00:00Z`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</td><td className="py-3 text-right font-semibold text-emerald-300">{row.revenue.toLocaleString('fr-FR')} F</td><td className="py-3 text-right text-slate-300">{row.transactionsPaid.toLocaleString('fr-FR')}</td><td className="py-3 text-right text-slate-300">{row.uniquePayingUsers.toLocaleString('fr-FR')}</td><td className="py-3 text-right text-slate-300">{row.newPayingUsers.toLocaleString('fr-FR')}</td><td className="py-3 text-right text-cyan-300">{row.activeSubscribers.toLocaleString('fr-FR')}</td><td className="py-3 text-right text-slate-300">{row.arppu.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} F</td><td className={`py-3 text-right ${row.growthMoM === null ? 'text-slate-500' : row.growthMoM >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{row.growthMoM === null ? '—' : `${row.growthMoM >= 0 ? '+' : ''}${row.growthMoM.toFixed(1)}%`}</td></tr>)}</tbody></table></div></section>
      <section className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5"><h2 className="font-semibold text-amber-200">Couverture des métriques</h2><div className="mt-4 grid gap-3 text-sm md:grid-cols-3"><div><p className="text-emerald-300">Connectées</p><p className="mt-1 text-slate-400">Comptes, abonnements actifs, présence, swaps, sessions, points, durée, pays.</p></div><div><p className="text-amber-300">Indisponibles actuellement</p><p className="mt-1 text-slate-400">MRR/ARR, churn, rétention cohortée, CAC, LTV, marge nette et revenu par période.</p></div><div><p className="text-slate-300">Données requises</p><p className="mt-1 text-slate-400">Événements de paiement validés, dates de renouvellement/annulation, source d’acquisition et coûts complets par outil.</p></div></div></section>
    </div>
  </main>
}
