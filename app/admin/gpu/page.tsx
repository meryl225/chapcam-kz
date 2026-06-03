'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Cpu, RefreshCw, ArrowLeft, AlertTriangle, CheckCircle2, Loader2, Server } from 'lucide-react'
import Link from 'next/link'

interface WorkerStatus {
  id: string
  kind: 'pod' | 'url'
  online: boolean
  ready: boolean
  active: number
  waiting: number
  max: number
  free: number
  uptime?: number
}

interface ClusterStatus {
  configured: boolean
  workers: WorkerStatus[]
  totals: { active: number; waiting: number; max: number; free: number; online: number; total: number }
}

function fmtUptime(s?: number): string {
  if (!s || s <= 0) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function AdminGpuPage() {
  const [data, setData] = useState<ClusterStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/admin/gpu-workers', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Erreur chargement workers GPU:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [load])

  // Protection stricte : admin uniquement.
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

  if (loading) {
    return <div className="p-10 text-center text-white">Chargement de l&apos;état des GPU…</div>
  }

  const totals = data?.totals
  const usagePct = totals && totals.max > 0 ? Math.round((totals.active / totals.max) * 100) : 0

  return (
    <div className="min-h-screen bg-[#050505] p-6 text-white md:p-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/stats"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux statistiques
        </Link>

        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00ff88]/15">
              <Cpu className="h-7 w-7 text-[#00ff88]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Workers GPU</h1>
              <div className="mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1.5 rounded-full bg-[#00ff88]/10 px-2.5 py-0.5 text-xs font-medium text-[#00ff88]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ff88] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00ff88]" />
                  </span>
                  En direct
                </span>
                {lastUpdated && (
                  <span className="text-xs text-gray-500">MAJ {lastUpdated.toLocaleTimeString('fr-FR')}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={load}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-gray-700 bg-[#111] px-4 py-2.5 text-sm font-medium transition hover:bg-[#1a1a1a] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Rafraîchir
          </button>
        </div>

        {!data?.configured && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-yellow-300">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm">
              Aucun worker GPU configuré. Définis <code className="font-mono">RUNPOD_POD_IDS</code> (ou{' '}
              <code className="font-mono">LIVE_GPU_WS_URLS</code>) et <code className="font-mono">LIVE_GPU_SHARED_SECRET</code>.
            </p>
          </div>
        )}

        {/* Totaux agreges */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-800 bg-[#111] p-5">
            <p className="text-sm text-gray-400">Workers en ligne</p>
            <p className="mt-2 text-4xl font-bold text-[#00ff88]">
              {totals?.online ?? 0}
              <span className="text-xl text-gray-500">/{totals?.total ?? 0}</span>
            </p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-[#111] p-5">
            <p className="text-sm text-gray-400">Sessions actives</p>
            <p className="mt-2 text-4xl font-bold text-white">
              {totals?.active ?? 0}
              <span className="text-xl text-gray-500">/{totals?.max ?? 0}</span>
            </p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-[#111] p-5">
            <p className="text-sm text-gray-400">En file d&apos;attente</p>
            <p className="mt-2 text-4xl font-bold text-orange-400">{totals?.waiting ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-[#111] p-5">
            <p className="text-sm text-gray-400">Charge globale</p>
            <p className="mt-2 text-4xl font-bold text-white">{usagePct}%</p>
          </div>
        </div>

        {/* Liste des workers */}
        <div className="flex flex-col gap-4">
          {(data?.workers ?? []).map((w) => {
            const pct = w.max > 0 ? Math.round((w.active / w.max) * 100) : 0
            const statusLabel = !w.online ? 'Hors ligne' : !w.ready ? 'Démarrage…' : 'Opérationnel'
            const statusColor = !w.online
              ? 'text-red-400'
              : !w.ready
                ? 'text-yellow-400'
                : 'text-[#00ff88]'
            const barColor = pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-orange-400' : 'bg-[#00ff88]'

            return (
              <div key={w.id} className="rounded-2xl border border-gray-800 bg-[#111] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-mono text-sm font-semibold text-white">{w.id}</p>
                      <p className="text-xs text-gray-500">{w.kind === 'pod' ? 'Pod RunPod' : 'URL fixe'}</p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1.5 text-sm font-medium ${statusColor}`}>
                    {!w.online ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : !w.ready ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {statusLabel}
                  </span>
                </div>

                {/* Barre de charge */}
                <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-[#0a0a0a]">
                  <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  <div>
                    <p className="text-gray-500">Actives</p>
                    <p className="font-semibold text-white">
                      {w.active}/{w.max || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">File</p>
                    <p className="font-semibold text-orange-400">{w.waiting}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Libres</p>
                    <p className="font-semibold text-[#00ff88]">{w.free}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Uptime</p>
                    <p className="font-semibold text-white">{fmtUptime(w.uptime)}</p>
                  </div>
                </div>
              </div>
            )
          })}

          {data?.configured && (data?.workers?.length ?? 0) === 0 && (
            <p className="py-10 text-center text-gray-500">Aucun worker détecté.</p>
          )}
        </div>
      </div>
    </div>
  )
}
