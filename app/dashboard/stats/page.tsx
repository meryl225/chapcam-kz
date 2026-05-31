'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Zap, Clock, Monitor, User, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Session {
  id: string
  user_id: string
  avatar_id: string
  avatar_name: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  frames_processed: number | null
}

interface ChartData {
  date: string
  sessions: number
  minutes: number
}

function formatDuration(totalSeconds: number): string {
  const s = Math.floor(totalSeconds)
  const m = Math.floor(s / 60)
  return m > 0 ? m + 'm ' + (s % 60) + 's' : s + 's'
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return 'il y a ' + mins + ' min'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return 'il y a ' + hrs + 'h'
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Hier'
  return 'il y a ' + days + ' jours'
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDate()
  const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec']
  return day + ' ' + months[date.getMonth()]
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (!url || !key) return null
  return createBrowserClient(url, key)
}

// Custom tooltip component
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-[#111] px-3 py-2 shadow-lg">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-bold text-white">{payload[0].value}</p>
      </div>
    )
  }
  return null
}

export default function StatsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [totalSessions, setTotalSessions] = useState(0)
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [totalFrames, setTotalFrames] = useState(0)
  const [favoriteAvatar, setFavoriteAvatar] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const router = useRouter()

  useEffect(() => {
    async function loadStats() {
      const supabase = getSupabase()
      if (!supabase) {
        setIsLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Fetch sessions
      const { data: sessionsData } = await supabase
        .from('swap_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })

      const sessionsList = sessionsData || []
      setSessions(sessionsList)

      // Compute stats
      setTotalSessions(sessionsList.length)

      const minutes = sessionsList.reduce((acc, s) => acc + (s.duration_seconds || 0) / 60, 0)
      setTotalMinutes(minutes)

      const frames = sessionsList.reduce((acc, s) => acc + (s.frames_processed || 0), 0)
      setTotalFrames(frames)

      // Find favorite avatar
      const avatarCounts: Record<string, number> = {}
      sessionsList.forEach(s => {
        if (s.avatar_name) {
          avatarCounts[s.avatar_name] = (avatarCounts[s.avatar_name] || 0) + 1
        }
      })
      const sortedAvatars = Object.entries(avatarCounts).sort((a, b) => b[1] - a[1])
      setFavoriteAvatar(sortedAvatars[0]?.[0] || null)

      // Build chart data for last 14 days
      const last14Days: ChartData[] = []
      for (let i = 13; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)
        const dateStr = date.toISOString().split('T')[0]
        
        const daySessions = sessionsList.filter(s => {
          const sessionDate = new Date(s.started_at).toISOString().split('T')[0]
          return sessionDate === dateStr
        })

        const dayMinutes = daySessions.reduce((acc, s) => acc + (s.duration_seconds || 0) / 60, 0)

        last14Days.push({
          date: formatDateShort(date.toISOString()),
          sessions: daySessions.length,
          minutes: Math.round(dayMinutes),
        })
      }
      setChartData(last14Days)

      setIsLoading(false)
    }

    loadStats()
  }, [router])

  // Skeleton loading
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-white/5" />
          <div className="mt-2 h-5 w-96 animate-pulse rounded-lg bg-white/5" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (sessions.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <BarChart2 className="h-16 w-16 text-gray-700" />
        <h2 className="mt-4 text-xl font-bold text-white">Aucune session pour l&apos;instant</h2>
        <p className="mt-2 text-gray-500">Demarre ton premier body swap pour voir tes stats ici</p>
        <Button
          onClick={() => router.push('/dashboard')}
          className="mt-4 rounded-xl bg-[#00ff88] px-6 py-3 font-bold text-black hover:bg-[#00cc6a]"
        >
          DEMARRER LE SWAP
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-widest text-white">STATISTIQUES</h1>
        <p className="mt-2 text-gray-400">Ton historique de body swap ChapCam</p>
      </div>

      {/* Stats Cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Sessions */}
        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
          <Zap className="h-6 w-6 text-[#00ff88]" />
          <p className="mt-3 text-4xl font-black text-white">{totalSessions}</p>
          <p className="mt-1 text-xs uppercase tracking-widest text-gray-500">SESSIONS TOTALES</p>
        </div>

        {/* Minutes */}
        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
          <Clock className="h-6 w-6 text-[#7c3aed]" />
          <p className="mt-3 text-4xl font-black text-white">{totalMinutes.toFixed(0)}</p>
          <p className="mt-1 text-xs uppercase tracking-widest text-gray-500">MINUTES SWAPPEES</p>
        </div>

        {/* Frames */}
        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
          <Monitor className="h-6 w-6 text-[#3b82f6]" />
          <p className="mt-3 text-4xl font-black text-white">{totalFrames.toLocaleString()}</p>
          <p className="mt-1 text-xs uppercase tracking-widest text-gray-500">FRAMES TRAITEES</p>
        </div>

        {/* Favorite Avatar */}
        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
          <User className="h-6 w-6 text-[#f59e0b]" />
          <p className="mt-3 truncate text-4xl font-black text-white">{favoriteAvatar || '—'}</p>
          <p className="mt-1 text-xs uppercase tracking-widest text-gray-500">AVATAR FAVORI</p>
        </div>
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Sessions per day */}
        <div className="rounded-2xl border border-white/10 bg-[#111111] p-4">
          <p className="mb-4 text-xs uppercase tracking-widest text-gray-400">SESSIONS PAR JOUR</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6b7280', fontSize: 10 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6b7280', fontSize: 10 }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="sessions" fill="#00ff88" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Minutes per day */}
        <div className="rounded-2xl border border-white/10 bg-[#111111] p-4">
          <p className="mb-4 text-xs uppercase tracking-widest text-gray-400">MINUTES PAR JOUR</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6b7280', fontSize: 10 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6b7280', fontSize: 10 }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="minutes" 
                fill="#7c3aed" 
                fillOpacity={0.15} 
                stroke="#7c3aed"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Session History Table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">
        <div className="border-b border-white/10 p-4">
          <p className="text-xs uppercase tracking-widest text-gray-400">HISTORIQUE DES SESSIONS</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-4 text-left text-xs uppercase tracking-widest text-gray-500">AVATAR</th>
                <th className="p-4 text-left text-xs uppercase tracking-widest text-gray-500">DUREE</th>
                <th className="p-4 text-left text-xs uppercase tracking-widest text-gray-500">FRAMES</th>
                <th className="p-4 text-left text-xs uppercase tracking-widest text-gray-500">DATE</th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 10).map((session) => {
                const duration = session.duration_seconds || 0
                return (
                  <tr key={session.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                    <td className="p-4 font-medium text-white">{session.avatar_name || 'Sans nom'}</td>
                    <td className="p-4 text-gray-400">{formatDuration(duration)}</td>
                    <td className="p-4 text-gray-400">{(session.frames_processed || 0).toLocaleString()}</td>
                    <td className="p-4 text-gray-500">{formatRelative(session.started_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
