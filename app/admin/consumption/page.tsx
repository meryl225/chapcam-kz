'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Activity, ArrowLeft, RefreshCw, Clock, Zap, Users, Crown } from 'lucide-react'

type Period = 'today' | 'yesterday' | '7d' | '30d' | 'all'

interface ConsumptionUser {
  userId: string
  email: string | null
  plan: string | null
  sessions: number
  points: number
  seconds: number
  lastActivity: string
}

interface ConsumptionData {
  period: Period
  totals: { users: number; sessions: number; points: number; seconds: number }
  users: ConsumptionUser[]
}

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: "Aujourd'hui" },
  { id: 'yesterday', label: 'Hier' },
  { id: '7d', label: '7 jours' },
  { id: '30d', label: '30 jours' },
  { id: 'all', label: 'Tout' },
]

function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min ${sec}s`
  return `${sec}s`
}

function fmtRelative(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminConsumptionPage() {
  const [period, setPeriod] = useState<Period>('today')
  const [data, setData] = useState<ConsumptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async (p: Period) => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/admin/consumption?period=${p}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as ConsumptionData
      setData(json)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Erreur chargement consommation:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load(period)
  }, [period, load])

  // Protection stricte cote client (l'API verifie aussi cote serveur).
  useEffect(() => {
    const checkAccess = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || user.email !== 'fanny.guck@gmail.com') {
        window.location.href = '/dashboard'
      }
    }
    checkAccess()
  }, [])

  const totals = data?.totals
  const users = data?.users ?? []

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin/stats"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux statistiques
        </Link>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00ff88]/15">
              <Activity className="h-6 w-6 text-[#00ff88]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Suivi de consommation</h1>
              <p className="text-sm text-gray-400">
                Points et temps de swap consommes par compte
              </p>
            </div>
          </div>
          <button
            onClick={() => load(period)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-gray-700 bg-[#111] px-4 py-2.5 text-sm font-medium text-gray-200 transition-colors hover:border-gray-500 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Rafraichir
          </button>
        </div>

        {/* Filtres de periode */}
        <div className="mb-6 flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                period === p.id
                  ? 'bg-[#00ff88] text-black'
                  : 'border border-gray-700 bg-[#111] text-gray-300 hover:border-gray-500'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Cartes de totaux */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-800 bg-[#111] p-5">
            <div className="flex items-center gap-2 text-gray-400">
              <Zap className="h-4 w-4 text-[#00ff88]" />
              <span className="text-sm">Points consommes</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-white">
              {(totals?.points ?? 0).toLocaleString('fr-FR')}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-[#111] p-5">
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="h-4 w-4 text-orange-400" />
              <span className="text-sm">Temps total</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-orange-400">
              {fmtDuration(totals?.seconds ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-[#111] p-5">
            <div className="flex items-center gap-2 text-gray-400">
              <Users className="h-4 w-4 text-purple-400" />
              <span className="text-sm">Comptes actifs</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-purple-400">
              {(totals?.users ?? 0).toLocaleString('fr-FR')}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-[#111] p-5">
            <div className="flex items-center gap-2 text-gray-400">
              <Activity className="h-4 w-4 text-sky-400" />
              <span className="text-sm">Sessions</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-sky-400">
              {(totals?.sessions ?? 0).toLocaleString('fr-FR')}
            </p>
          </div>
        </div>

        {/* Tableau des consommateurs */}
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#111]">
          <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
            <h2 className="font-semibold text-white">
              Classement des comptes
              <span className="ml-2 text-sm font-normal text-gray-500">
                (top {users.length})
              </span>
            </h2>
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                MAJ {lastUpdated.toLocaleTimeString('fr-FR')}
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-400">Chargement...</div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              Aucune consommation sur cette periode.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="px-5 py-3 font-medium">#</th>
                    <th className="px-5 py-3 font-medium">Compte</th>
                    <th className="px-5 py-3 font-medium">Forfait</th>
                    <th className="px-5 py-3 text-right font-medium">Points</th>
                    <th className="px-5 py-3 text-right font-medium">Temps</th>
                    <th className="px-5 py-3 text-right font-medium">Sessions</th>
                    <th className="px-5 py-3 text-right font-medium">Derniere activite</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr
                      key={u.userId}
                      className="border-b border-gray-800/60 transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3">
                        {i < 3 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#00ff88]">
                            <Crown className="h-3.5 w-3.5" />
                            {i + 1}
                          </span>
                        ) : (
                          <span className="text-gray-500">{i + 1}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="block font-medium text-white">
                          {u.email || 'Email inconnu'}
                        </span>
                        <span className="block font-mono text-xs text-gray-600">
                          {u.userId.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs capitalize text-gray-300">
                          {u.plan || 'free'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-[#00ff88]">
                        {u.points.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-5 py-3 text-right text-orange-300">
                        {fmtDuration(u.seconds)}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-300">{u.sessions}</td>
                      <td className="px-5 py-3 text-right text-gray-500">
                        {fmtRelative(u.lastActivity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
