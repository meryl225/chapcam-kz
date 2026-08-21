import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'
import { getToolUsage, type ToolName } from '@/lib/tool-usage'
import { getPhotoVideoTotalsForUsers } from '@/lib/photo-video-quota'

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

// Repli de resolution d'email via Supabase Auth (source de verite des comptes).
// La table subscriptions ne contient QUE les utilisateurs ayant souscrit : un
// compte gratuit (jamais abonne) n'y figure pas et s'affiche donc "Email inconnu".
// Pour ces ids restants, on interroge auth.users directement (getUserById).
async function fillEmailsFromAuth(
  admin: ReturnType<typeof createAdminClient>,
  emailByUser: Map<string, { email: string | null; plan: string | null }>,
  ids: string[],
) {
  const missing = ids.filter((id) => !emailByUser.get(id)?.email)
  await Promise.all(
    missing.map(async (id) => {
      try {
        const { data } = await admin.auth.admin.getUserById(id)
        const email = data?.user?.email ?? null
        if (email) {
          const prev = emailByUser.get(id)
          emailByUser.set(id, { email, plan: prev?.plan ?? null })
        }
      } catch {
        // Compte introuvable dans Auth (supprime ?) : on laisse "Email inconnu".
      }
    }),
  )
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

  // Repli Auth pour les comptes sans ligne subscriptions (gratuits).
  await fillEmailsFromAuth(admin, emailByUser, ids)

  const users = ranked.map((r) => ({
    userId: r.userId,
    email: emailByUser.get(r.userId)?.email ?? null,
    plan: emailByUser.get(r.userId)?.plan ?? null,
    sessions: r.sessions,
    points: r.points,
    seconds: r.seconds,
    lastActivity: r.lastActivity,
  }))

  // 4) Consommation des OUTILS IA (Photo en Video / Motion / Traduction) sur la
  //    meme periode, depuis le journal Neon tool_usage_events. Bornes : si pas de
  //    debut (periode "all") on part de l'epoch ; si pas de fin, jusqu'a maintenant.
  const toolSince = start ?? '1970-01-01T00:00:00.000Z'
  const toolUntil = end ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  let toolsPayload: {
    totals: { tool: ToolName; generations: number; credits: number; cost_usd: number }[]
    grandTotalCostUsd: number
    users: {
      userId: string
      email: string | null
      plan: string | null
      generations: number
      credits: number
      cost_usd: number
      lastUsed: string
      // Total de credits photo->video credites a ce compte (achats de packs a la
      // carte, inclusions de forfait ou dons admin). Permet a l'UI de distinguer
      // un vrai compte gratuit d'un acheteur de pack sans forfait Live Swap.
      photoCreditsTotal: number
      byTool: Record<string, { generations: number; credits: number; cost_usd: number }>
    }[]
  } = { totals: [], grandTotalCostUsd: 0, users: [] }

  try {
    const { rows: toolRows, totals: toolTotals } = await getToolUsage(toolSince, toolUntil)

    // Resoudre les emails des utilisateurs d'outils pas deja connus (via subscriptions).
    const toolUserIds = [...new Set(toolRows.map((r) => r.user_id))]
    const missing = toolUserIds.filter((id) => !emailByUser.has(id))
    for (let i = 0; i < missing.length; i += CHUNK) {
      const slice = missing.slice(i, i + CHUNK)
      if (slice.length === 0) continue
      const { data } = await admin
        .from('subscriptions')
        .select('user_id, email, plan')
        .in('user_id', slice)
      for (const s of data || []) {
        emailByUser.set(s.user_id, { email: s.email ?? null, plan: s.plan ?? null })
      }
    }

    // Repli Auth pour les utilisateurs d'outils sans email resolu (comptes gratuits).
    await fillEmailsFromAuth(admin, emailByUser, toolUserIds)

    // Agregation par utilisateur (toutes outils confondus) + detail par outil.
    const toolByUser = new Map<string, (typeof toolsPayload.users)[number]>()
    for (const r of toolRows) {
      const cur =
        toolByUser.get(r.user_id) ??
        {
          userId: r.user_id,
          email: emailByUser.get(r.user_id)?.email ?? null,
          plan: emailByUser.get(r.user_id)?.plan ?? null,
          generations: 0,
          credits: 0,
          cost_usd: 0,
          lastUsed: r.last_used,
          photoCreditsTotal: 0,
          byTool: {},
        }
      cur.generations += Number(r.generations) || 0
      cur.credits += Number(r.credits) || 0
      cur.cost_usd += Number(r.cost_usd) || 0
      if (r.last_used > cur.lastUsed) cur.lastUsed = r.last_used
      cur.byTool[r.tool] = {
        generations: Number(r.generations) || 0,
        credits: Number(r.credits) || 0,
        cost_usd: Math.round((Number(r.cost_usd) || 0) * 100) / 100,
      }
      toolByUser.set(r.user_id, cur)
    }

    const toolUsers = [...toolByUser.values()]
      .map((u) => ({ ...u, cost_usd: Math.round(u.cost_usd * 100) / 100 }))
      .sort((a, b) => b.cost_usd - a.cost_usd)
      .slice(0, 200)

    // Enrichir avec le total de credits photo->video credites (Neon), pour
    // distinguer dans l'UI un acheteur de pack d'un vrai compte gratuit.
    try {
      const totalsByUser = await getPhotoVideoTotalsForUsers(toolUsers.map((u) => u.userId))
      for (const u of toolUsers) u.photoCreditsTotal = totalsByUser.get(u.userId) ?? 0
    } catch (err) {
      console.error('[admin/consumption] Erreur lecture credits photo Neon:', err)
    }

    const grandTotalCostUsd =
      Math.round(toolTotals.reduce((acc, t) => acc + (Number(t.cost_usd) || 0), 0) * 100) / 100

    toolsPayload = {
      totals: toolTotals.map((t) => ({
        tool: t.tool,
        generations: Number(t.generations) || 0,
        credits: Number(t.credits) || 0,
        cost_usd: Math.round((Number(t.cost_usd) || 0) * 100) / 100,
      })),
      grandTotalCostUsd,
      users: toolUsers,
    }
  } catch (err) {
    console.error('[admin/consumption] Erreur lecture outils IA:', err)
    // On renvoie quand meme les donnees Live Swap ; la section outils sera vide.
  }

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
      tools: toolsPayload,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
