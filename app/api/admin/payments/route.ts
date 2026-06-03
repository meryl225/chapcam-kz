import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'
import { getPlan } from '@/lib/plans'
import { getLiveOffer } from '@/lib/live-offers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Etat reel du compte ChapCam rattache a une demande de paiement.
interface AccountState {
  status: 'credited' | 'not_credited' | 'no_account'
  kind: 'plan' | 'live' | null
  label: string // texte lisible affiche a l'admin
}

// Construit une map email(lower) -> userId en parcourant les comptes Auth.
async function buildEmailMap(
  admin: ReturnType<typeof createAdminClient>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  try {
    for (let page = 1; page <= 10; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      const users = data?.users || []
      for (const u of users) {
        if (u.email) map.set(u.email.toLowerCase(), u.id)
      }
      if (users.length < 1000) break
    }
  } catch (e) {
    console.warn('[admin/payments] buildEmailMap echec:', e)
  }
  return map
}

// GET admin : liste des demandes avec filtres + etat reel du compte rattache.
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const search = (searchParams.get('search') || '').trim().toLowerCase()
    const status = (searchParams.get('status') || '').trim()
    const method = (searchParams.get('method') || '').trim()

    const admin = createAdminClient()
    let query = admin
      .from('payment_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status)
    } else {
      // Par defaut : masquer les demandes annulees (doublons / paiements abandonnes).
      query = query.neq('status', 'cancelled')
    }
    // Filtre source de paiement : PayDunya = presence d'un token PayDunya.
    if (method === 'paydunya') {
      query = query.not('paydunya_token', 'is', null)
    }
    if (search) {
      query = query.or(`email.ilike.%${search}%,phone_number.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) {
      console.error('[admin/payments] Erreur:', error.message)
      return NextResponse.json({ error: 'Erreur lecture.' }, { status: 500 })
    }

    const requests = data ?? []

    // --- Enrichissement : etat reel du compte pour chaque demande ---
    // 1) Resoudre l'userId de chaque demande (colonne user_id, sinon par email).
    const needEmailMap = requests.some((r: any) => !r.user_id && r.email)
    const emailMap = needEmailMap ? await buildEmailMap(admin) : new Map<string, string>()

    const userIds = new Set<string>()
    const resolvedUserId: Record<string, string | null> = {}
    for (const r of requests as any[]) {
      const uid = r.user_id || (r.email ? emailMap.get(String(r.email).toLowerCase()) || null : null)
      resolvedUserId[r.id] = uid
      if (uid) userIds.add(uid)
    }

    const ids = [...userIds]

    // 2) Charger en lot les abonnements et les acces live de ces comptes.
    const [{ data: subs }, { data: lives }] = await Promise.all([
      ids.length
        ? admin
            .from('subscriptions')
            .select('user_id, plan, points, max_points, is_active, end_date')
            .in('user_id', ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? admin
            .from('live_access')
            .select('user_id, pending_windows, active_window_expires_at')
            .in('user_id', ids)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const subByUser = new Map<string, any>()
    for (const s of subs || []) subByUser.set(s.user_id, s)
    const liveByUser = new Map<string, any>()
    for (const l of lives || []) liveByUser.set(l.user_id, l)

    // 3) Calculer l'etat lisible pour chaque demande.
    const enriched = (requests as any[]).map((r) => {
      const uid = resolvedUserId[r.id]
      const isLive = !!getLiveOffer(r.plan)
      const isPlan = !!getPlan(r.plan)
      let account: AccountState

      if (!uid) {
        account = {
          status: 'no_account',
          kind: isLive ? 'live' : isPlan ? 'plan' : null,
          label: `Aucun compte ChapCam pour ${r.email}`,
        }
      } else if (isLive) {
        const la = liveByUser.get(uid)
        const now = Date.now()
        const windowActive = la?.active_window_expires_at
          ? new Date(la.active_window_expires_at).getTime() > now
          : false
        const pending = la?.pending_windows ?? 0
        if (windowActive || pending > 0) {
          const parts: string[] = []
          if (windowActive) {
            const mins = Math.max(
              0,
              Math.round((new Date(la.active_window_expires_at).getTime() - now) / 60000),
            )
            parts.push(`session active (${mins} min restantes)`)
          }
          if (pending > 0) parts.push(`${pending} acces Live en attente`)
          account = { status: 'credited', kind: 'live', label: `Live Pro : ${parts.join(' + ')}` }
        } else {
          account = { status: 'not_credited', kind: 'live', label: 'Aucun acces Live sur ce compte' }
        }
      } else {
        const s = subByUser.get(uid)
        if (s && s.is_active) {
          const end = s.end_date
            ? new Date(s.end_date).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : '—'
          const planName = getPlan(s.plan)?.name ?? s.plan
          account = {
            status: 'credited',
            kind: 'plan',
            label: `${planName} • ${s.points ?? 0}/${s.max_points ?? 0} pts • expire le ${end}`,
          }
        } else {
          account = {
            status: 'not_credited',
            kind: 'plan',
            label: 'Aucun abonnement actif sur ce compte',
          }
        }
      }

      return { ...r, account }
    })

    return NextResponse.json({ requests: enriched })
  } catch (err: any) {
    console.error('[admin/payments] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
