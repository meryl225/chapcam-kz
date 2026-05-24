'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, RefreshCw } from 'lucide-react'

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

  const loadStats = useCallback(async () => {
    const supabase = createClient()
    setRefreshing(true)
    
    try {
      // Total utilisateurs (table profiles)
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      
      if (usersError) console.error('Erreur profiles:', usersError)

      // Inscriptions aujourd'hui
      const today = new Date().toISOString().split('T')[0]
      const { count: todayRegistrations, error: todayError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today)
      
      if (todayError) console.error('Erreur today:', todayError)

      // Utilisateurs en ligne (via user_activity created_at)
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { count: onlineUsers, error: onlineError } = await supabase
        .from('user_activity')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', fiveMinAgo)
      
      if (onlineError) console.error('Erreur online:', onlineError)

      // Swaps en cours (sessions recentes)
      const { count: activeSwaps, error: swapsError } = await supabase
        .from('swap_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', fiveMinAgo)
      
      if (swapsError) console.error('Erreur swaps:', swapsError)

      // Subscriptions actives
      const { count: activeSubscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gt('points', 0)
      
      if (subsError) console.error('Erreur subscriptions:', subsError)

      setStats({
        totalUsers: totalUsers || 0,
        todayRegistrations: todayRegistrations || 0,
        onlineUsers: onlineUsers || 0,
        activeSwaps: activeSwaps || 0,
        activeSubscriptions: activeSubscriptions || 0,
      })
    } catch (error) {
      console.error('Erreur chargement stats:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 8000)
    return () => clearInterval(interval)
  }, [])

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
            <p className="text-gray-400">Accès restreint • Visible uniquement par toi</p>
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

        <button
          onClick={loadStats}
          disabled={refreshing}
          className="mt-10 px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition flex items-center gap-3 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Chargement...' : 'Rafraichir les statistiques'}
        </button>
      </div>
    </div>
  )
}
