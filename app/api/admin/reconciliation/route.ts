import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Period = 'today' | 'yesterday' | '7d' | '30d' | 'all'

// Meme logique de bornes que /api/admin/consumption (UTC = fuseau Abidjan).
function periodBounds(period: Period): { start: string | null; end: string | null } {
  const now = new Date()
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  switch (period) {
    case 'today':
      return { start: startOfToday.toISOString(), end: null }
    case 'yesterday': {
      const y = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000)
      return { start: y.toISOString(), end: startOfToday.toISOString() }
    }
    case '7d':
      return { start: new Date(startOfToday.getTime() - 6 * 864e5).toISOString(), end: null }
    case '30d':
      return { start: new Date(startOfToday.getTime() - 29 * 864e5).toISOString(), end: null }
    default:
      return { start: null, end: null }
  }
}

interface TokenRow {
  id: string
  user_id: string | null
  email: string | null
  plan: string | null
  expires_at: string | null
  created_at: string
}

interface SessionRow {
  user_id: string | null
  started_at: string
}

// Marge apres expiration pour rattacher une session a un token (le swap peut
// demarrer juste apres l'obtention du token). En millisecondes.
const MATCH_MARGIN_MS = 2 * 60 * 1000

async function fetchAll<T>(
  run: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const PAGE = 1000
  const out: T[] = []
  for (let from = 0; from < 500_000; from += PAGE) {
    const { data, error } = await run(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const rows = data || []
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  const p = (req.nextUrl.searchParams.get('period') || 'today') as Period
  const period: Period = ['today', 'yesterday', '7d', '30d', 'all'].includes(p) ? p : 'today'
  const { start, end } = periodBounds(period)

  const admin = createAdminClient()

  // 1) Tokens emis sur la periode. Si la table n'existe pas encore, on renvoie
  //    un etat "non configure" plutot qu'une erreur (script SQL a executer).
  let tokens: TokenRow[]
  try {
    tokens = await fetchAll<TokenRow>((from, to) => {
      let q = admin
        .from('decart_token_logs')
        .select('id, user_id, email, plan, expires_at, created_at')
        .order('created_at', { ascending: false })
        .range(from, to)
      if (start) q = q.gte('created_at', start)
      if (end) q = q.lt('created_at', end)
      return q as unknown as PromiseLike<{ data: TokenRow[] | null; error: { message: string } | null }>
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Table absente -> guider l'admin vers le script SQL.
    if (/relation|does not exist|schema cache|could not find/i.test(msg)) {
      return NextResponse.json({ configured: false, period }, { headers: { 'Cache-Control': 'no-store' } })
    }
    console.error('[admin/reconciliation] tokens:', msg)
    return NextResponse.json({ error: 'Erreur lecture des tokens.' }, { status: 500 })
  }

  // 2) Sessions facturees sur une fenetre elargie (marge) pour le rapprochement.
  const sessStart = start ? new Date(new Date(start).getTime() - MATCH_MARGIN_MS).toISOString() : null
  const sessEnd = end ? new Date(new Date(end).getTime() + MATCH_MARGIN_MS).toISOString() : null
  const sessions = await fetchAll<SessionRow>((from, to) => {
    let q = admin
      .from('swap_sessions')
      .select('user_id, started_at')
      .order('started_at', { ascending: false })
      .range(from, to)
    if (sessStart) q = q.gte('started_at', sessStart)
    if (sessEnd) q = q.lt('started_at', sessEnd)
    return q as unknown as PromiseLike<{ data: SessionRow[] | null; error: { message: string } | null }>
  })

  // Index des sessions par utilisateur (timestamps tries).
  const sessByUser = new Map<string, number[]>()
  for (const s of sessions) {
    if (!s.user_id) continue
    const t = new Date(s.started_at).getTime()
    const arr = sessByUser.get(s.user_id)
    if (arr) arr.push(t)
    else sessByUser.set(s.user_id, [t])
  }

  // 3) Un token est "utilise" si une session du meme user demarre dans
  //    [emission ; expiration + marge].
  let used = 0
  const wasted: { email: string | null; plan: string | null; createdAt: string }[] = []
  const perUser = new Map<string, { email: string | null; plan: string | null; issued: number; used: number }>()

  for (const tk of tokens) {
    const uid = tk.user_id || ''
    const issued = new Date(tk.created_at).getTime()
    const exp = tk.expires_at ? new Date(tk.expires_at).getTime() : issued + 10 * 60 * 1000
    const windowEnd = exp + MATCH_MARGIN_MS

    const times = uid ? sessByUser.get(uid) : undefined
    const matched = !!times && times.some((t) => t >= issued && t <= windowEnd)

    if (matched) used += 1
    else wasted.push({ email: tk.email, plan: tk.plan, createdAt: tk.created_at })

    const key = uid || tk.email || 'inconnu'
    const cur = perUser.get(key)
    if (cur) {
      cur.issued += 1
      if (matched) cur.used += 1
    } else {
      perUser.set(key, { email: tk.email, plan: tk.plan, issued: 1, used: matched ? 1 : 0 })
    }
  }

  const issuedTotal = tokens.length
  const wastedTotal = issuedTotal - used
  const wastePct = issuedTotal > 0 ? (wastedTotal / issuedTotal) * 100 : 0

  const topUsers = [...perUser.values()]
    .map((u) => ({ ...u, wasted: u.issued - u.used, wastePct: u.issued > 0 ? ((u.issued - u.used) / u.issued) * 100 : 0 }))
    .sort((a, b) => b.wasted - a.wasted)
    .slice(0, 50)

  return NextResponse.json(
    {
      configured: true,
      period,
      totals: { issued: issuedTotal, used, wasted: wastedTotal, wastePct },
      wasted: wasted.slice(0, 100),
      users: topUsers,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
