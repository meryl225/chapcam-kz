import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Periodes supportees pour le filtre de consommation.
type Period = 'today' | 'yesterday' | '7d' | '30d' | 'all'

// Calcule la borne de debut (ISO) pour une periode donnee. Tout est en UTC,
// ce qui correspond au fuseau d'Abidjan (UTC+0). Renvoie aussi une borne de
// fin optionnelle (utilisee uniquement pour "hier").
function periodBounds(period: Period): { start: string | null; end: string | null } {
  const now = new Date()
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  switch (period) {
    case 'today':
      return { start: startOfToday.toISOString(), end: null }
    case 'yesterday': {
      const startYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000)
      return { start: startYesterday.toISOString(), end: startOfToday.toISOString() }
    }
    case '7d':
      return { start: new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(), end: null }
    case '30d':
      return { start: new Date(startOfToday.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString(), end: null }
    case 'all':
    default:
      return { start: null, end: null }
  }
}

interface Row {
  user_id: string
  points_used: number | null
  duration_seconds: number | null
  started_at: string
}

interface Agg {
  userId: string
  sessions: number
  points: number
  seconds: number
  lastActivity: string
}

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  const periodParam = (req.nextUrl.searchParams.get('period') || 'today') as Period
  const period: Period = ['today', 'yesterday', '7d', '30d', 'all'].includes(periodParam)
    ? periodParam
    : 'today'
  const { start, end } = periodBounds(period)

  const admin = createAdminClient()

  // 1) Lecture paginee de toutes les sessions de la periode (service_role).
  const byUser = new Map<string, Agg>()
  let totalSessions = 0
  let totalPoints = 0
  let totalSeconds = 0

  const PAGE = 1000
  for (let from = 0; from < 500_000; from += PAGE) {
    let q = admin
      .from('swap_sessions')
      .select('user_id, points_used, duration_seconds, started_at')
      .order('started_at', { ascending: false })
      .range(from, from + PAGE - 1)

    if (start) q = q.gte('started_at', start)
    if (end) q = q.lt('started_at', end)

    const { data, error } = await q
    if (error) {
      console.error('[admin/consumption] Erreur lecture sessions:', error.message)
      return NextResponse.json({ error: 'Erreur lecture consommation.' }, { status: 500 })
    }
    const rows = (data || []) as Row[]
    if (rows.length === 0) break

    for (const r of rows) {
      if (!r.user_id) continue
      const pts = Number(r.points_used) || 0
      const secs = Number(r.duration_seconds) || 0
      totalSessions += 1
      totalPoints += pts
      totalSeconds += secs

      const cur = byUser.get(r.user_id)
      if (cur) {
        cur.sessions += 1
        cur.points += pts
        cur.seconds += secs
        if (r.started_at > cur.lastActivity) cur.lastActivity = r.started_at
      } else {
        byUser.set(r.user_id, {
          userId: r.user_id,
          sessions: 1,
          points: pts,
          seconds: secs,
          lastActivity: r.started_at,
        })
      }
    }

    if (rows.length < PAGE) break
  }

  // 2) Classement decroissant par points consommes, on garde le top 200.
  const ranked = [...byUser.values()].sort((a, b) => b.points - a.points).slice(0, 200)

  // 3) Resolution des emails/plans via la table subscriptions (batch par IN).
  const emailByUser = new Map<string, { email: string | null; plan: string | null }>()
  const ids = ranked.map((r) => r.userId)
  const CHUNK = 200
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK)
    const { data } = await admin
      .from('subscriptions')
      .select('user_id, email, plan')
      .in('user_id', slice)
    for (const s of data || []) {
      emailByUser.set(s.user_id, { email: s.email ?? null, plan: s.plan ?? null })
    }
  }

  const users = ranked.map((r) => ({
    userId: r.userId,
    email: emailByUser.get(r.userId)?.email ?? null,
    plan: emailByUser.get(r.userId)?.plan ?? null,
    sessions: r.sessions,
    points: r.points,
    seconds: r.seconds,
    lastActivity: r.lastActivity,
  }))

  return NextResponse.json(
    {
      period,
      totals: {
        users: byUser.size,
        sessions: totalSessions,
        points: totalPoints,
        seconds: totalSeconds,
      },
      users,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
