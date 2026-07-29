'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Shield, RefreshCw, Activity, MapPin } from 'lucide-react'

// Convertit un code pays ISO ("FR") en nom francais ("France").
const regionNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
  ? new Intl.DisplayNames(['fr'], { type: 'region' })
  : null
function countryName(code: string): string {
  if (!code || code === 'Inconnu') return 'Inconnu'
  try {
    return regionNames?.of(code) ?? code
  } catch {
    return code
  }
}

interface CountryCount {
  country: string
  count: number
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    todayRegistrations: 0,
    onlineUsers: 0,
    activeSwaps: 0,
    activeSubscriptions: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [countries, setCountries] = useState<CountryCount[]>([])
  const [totalLocated, setTotalLocated] = useState(0)

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadStats = useCallback(async () => {
    setRefreshing(true)
    try {
      // Tout passe par l'API serveur (service_role) : les inscriptions sont
      // dans auth.users, illisible cote navigateur avec la cle anon.
      const [statsRes, geoRes] = await Promise.all([
        fetch('/api/admin/stats', { cache: 'no-store' }),
        fetch('/api/admin/geo', { cache: 'no-store' }),
      ])
      if (!statsRes.ok) throw new Error(`HTTP ${statsRes.status}`)
      const data = await statsRes.json()
      setStats({
        totalUsers: data.totalUsers || 0,
        todayRegistrations: data.todayRegistrations || 0,
        onlineUsers: data.onlineUsers || 0,
        activeSwaps: data.activeSwaps || 0,
        activeSubscriptions: data.activeSubscriptions || 0,
      })
      if (geoRes.ok) {
        const geo = await geoRes.json()
        setCountries(geo.countries || [])
        setTotalLocated(geo.totalLocated || 0)
      }
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Erreur chargement stats:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
    // Rafraichissement temps reel toutes les 5 secondes
    const interval = setInterval(loadStats, 5000)
    return () => clearInterval(interval)
  }, [loadStats])

  // Protection stricte - Seul toi peux acceder
  useEffect(() => {
    const checkAccess = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== 'fanny.guck@gmail.com') {
        window.location.href = '/dashboard'
      }
    }
    checkAccess()
  }, [])

  if (loading) {
    return <div className="p-10 text-white text-center">Chargement des statistiques secrètes...</div>
  }

  return (
    <div className="min-h-screen bg-[#050505] p-8 text-white">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-12">
          <Shield className="w-12 h-12 text-[#00ff88]" />
          <div>
            <h1 className="text-4xl font-bold">Statistiques Privées ChapCam</h1>
            <div className="mt-1 flex items-center gap-3">
              <p className="text-gray-400">Accès restreint • Visible uniquement par toi</p>
              <span className="flex items-center gap-1.5 rounded-full bg-[#00ff88]/10 px-2.5 py-0.5 text-xs font-medium text-[#00ff88]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ff88] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00ff88]" />
                </span>
                En direct
              </span>
              {lastUpdated && (
                <span className="text-xs text-gray-500">
                  MAJ {lastUpdated.toLocaleTimeString('fr-FR')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#111] border border-gray-800 rounded-3xl p-10">
            <p className="text-gray-400 text-lg">Total Inscriptions</p>
            <p className="text-7xl font-bold text-white mt-4">{stats.totalUsers.toLocaleString()}</p>
          </div>

          <div className="bg-[#111] border border-gray-800 rounded-3xl p-10">
            <p className="text-gray-400 text-lg">Inscriptions Aujourd’hui</p>
            <p className="text-7xl font-bold text-emerald-400 mt-4">{stats.todayRegistrations}</p>
          </div>

          <div className="bg-[#111] border border-gray-800 rounded-3xl p-10">
            <p className="text-gray-400 text-lg">Utilisateurs en ligne</p>
            <p className="text-7xl font-bold text-[#00ff88] mt-4">{stats.onlineUsers}</p>
            <p className="text-sm text-gray-500 mt-3">dernières 5 minutes</p>
          </div>

          <div className="bg-[#111] border border-gray-800 rounded-3xl p-10">
            <p className="text-gray-400 text-lg">Swaps en cours</p>
            <p className="text-7xl font-bold text-orange-400 mt-4">{stats.activeSwaps}</p>
          </div>

          <div className="bg-[#111] border border-gray-800 rounded-3xl p-10">
            <p className="text-gray-400 text-lg">Abonnements actifs</p>
            <p className="text-7xl font-bold text-purple-400 mt-4">{stats.activeSubscriptions}</p>
            <p className="text-sm text-gray-500 mt-3">avec points restants</p>
          </div>
        </div>

        {/* Repartition par pays (localisation approximative par IP) */}
        <div className="mt-6 bg-[#111] border border-gray-800 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-6 h-6 text-[#00ff88]" />
            <div>
              <p className="text-xl font-bold text-white">Répartition par pays</p>
              <p className="text-sm text-gray-500">
                {totalLocated.toLocaleString()} utilisateur(s) localisé(s) • approximatif par IP
              </p>
            </div>
          </div>

          {countries.length === 0 ? (
            <p className="text-gray-500">
              Aucune donnée de localisation pour l&apos;instant. Les positions apparaîtront ici
              dès que des utilisateurs visiteront le tableau de bord sur l&apos;app déployée.
            </p>
          ) : (
            <div className="space-y-3">
              {countries.map(({ country, count }) => {
                const pct = totalLocated > 0 ? Math.round((count / totalLocated) * 100) : 0
                return (
                  <div key={country} className="flex items-center gap-4">
                    <span className="w-40 shrink-0 truncate text-sm text-gray-300">
                      {countryName(country)}
                      <span className="ml-1.5 text-xs text-gray-600">{country}</span>
                    </span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-800">
                      <div
                        className="h-full rounded-full bg-[#00ff88]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right text-sm font-medium text-white">
                      {count.toLocaleString()}
                      <span className="ml-1 text-xs text-gray-500">{pct}%</span>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <button
            onClick={loadStats}
            disabled={refreshing}
            className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition flex items-center gap-3 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Chargement...' : 'Rafraichir les statistiques'}
          </button>
          <Link
            href="/admin/consumption"
            className="px-8 py-4 bg-[#00ff88] text-black font-bold rounded-2xl hover:bg-[#00dd77] transition flex items-center gap-3"
          >
            <Activity className="w-5 h-5" />
            Suivi de consommation
          </Link>
        </div>
      </div>
    </div>
  )
}
