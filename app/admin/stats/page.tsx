'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, Users, Clock, Zap } from 'lucide-react'

export default function AdminStatsPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    todayRegistrations: 0,
    onlineUsers: 0,
    activeSwaps: 0,
  })
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const loadStats = async () => {
    try {
      // Total utilisateurs (table profiles)
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Inscriptions aujourd'hui
      const today = new Date().toISOString().split('T')[0]
      const { count: todayRegistrations } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today)

      // Utilisateurs en ligne (via user_activity created_at)
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { count: onlineUsers } = await supabase
        .from('user_activity')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', fiveMinAgo)

      // Swaps en cours (sessions recentes)
      const { count: activeSwaps } = await supabase
        .from('swap_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', fiveMinAgo)

      // Subscriptions actives
      const { count: activeSubscriptions } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gt('points', 0)

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
    }
  }

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 8000)
    return () => clearInterval(interval)
  }, [])

  // Protection stricte - Seul toi peux accéder
  useEffect(() => {
    const checkAccess = async () => {
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
        </div>

        <button
          onClick={loadStats}
          className="mt-10 px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition"
        >
          Rafraîchir les statistiques
        </button>
      </div>
    </div>
  )
}
