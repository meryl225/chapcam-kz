import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getJetonsBalance } from '@/lib/jetons'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

export async function GET(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })
  }

  try {
    // Authenticate with the mobile bearer token, then read the same production
    // tables as the website with service-role scope (RLS otherwise hides them).
    const accountDb = createAdminClient()
    const [{ data: subscriptionRows, error: subscriptionError }, jetons] = await Promise.all([
      accountDb
        .from('subscriptions')
        .select('plan,status,points,points_remaining,end_date,expires_at,is_active')
        .eq('user_id', user.id),
      getJetonsBalance(user.id),
    ])

    if (subscriptionError) throw subscriptionError

    console.log('[mobile/account-summary] subscriptions lookup', {
      userId: user.id,
      rowCount: subscriptionRows?.length ?? 0,
      rows: (subscriptionRows ?? []).map((row) => ({
        plan: row.plan,
        status: row.status,
        is_active: row.is_active,
        points: row.points,
        points_remaining: row.points_remaining,
        end_date: row.end_date,
      })),
    })

    // The website uses `.single()` for this user-scoped subscription. Preserve
    // that exact contract: select the row only when the account has one row;
    // never guess by updated_at, status, or is_active when duplicates exist.
    const subscription = subscriptionRows?.length === 1 ? subscriptionRows[0] : null
    const expiration = subscription?.expires_at || subscription?.end_date || null
    const endTime = expiration ? new Date(expiration).getTime() : null
    const active = Boolean(
      subscription &&
      subscription.is_active === true &&
      (endTime === null || Number.isNaN(endTime) || endTime >= Date.now()),
    )
    const remainingPoints = subscription?.points

    if (!jetons || typeof jetons.balance !== 'number') {
      throw new Error('Solde Jetons indisponible')
    }

    return NextResponse.json({
      jetons: jetons.balance,
      live_swap: {
        points: active && typeof remainingPoints === 'number' ? remainingPoints : null,
        points_per_second: active ? 2 : null,
      },
      subscription: active
        ? {
            plan: subscription.plan,
            status: subscription.status || null,
            is_active: true,
            end_date: subscription.end_date || null,
          }
        : null,
    }, { headers: NO_STORE })
  } catch (error) {
    console.error('[mobile/account-summary] Erreur:', error)
    return NextResponse.json({ error: 'Chargement impossible' }, { status: 500, headers: NO_STORE })
  }
}
