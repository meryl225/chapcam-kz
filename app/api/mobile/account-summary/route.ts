import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getJetonsBalance } from '@/lib/jetons'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveWatermarkForUser } from '@/lib/watermark'

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
    const [{ data: subscription, error: subscriptionError }, jetons, entitlement] = await Promise.all([
      accountDb
        .from('subscriptions')
        .select('plan,expires_at,is_active,points,max_points')
        .eq('user_id', user.id)
        .maybeSingle(),
      getJetonsBalance(user.id),
      resolveWatermarkForUser(user.id),
    ])

    if (subscriptionError) throw subscriptionError

    // Match the website dashboard: subscription is maybeSingle(), the plan
    // falls back to the same entitlement resolver, and entitlement access keeps
    // the account active exactly as the web UI does.
    const plan = subscription?.plan || entitlement.plan || 'free'
    const active = subscription?.is_active === true || entitlement.plan !== ''
    const remainingPoints = subscription?.points

    if (!jetons || typeof jetons.balance !== 'number') {
      throw new Error('Solde Jetons indisponible')
    }

    const returnedSubscription = active
      ? {
          plan,
          status: subscription?.is_active === true ? 'active' : null,
          is_active: true,
          end_date: subscription?.expires_at || null,
        }
      : null

    return NextResponse.json({
      jetons: jetons.balance,
      live_swap: {
        points: active && typeof remainingPoints === 'number' ? remainingPoints : null,
        points_per_second: active ? 2 : null,
      },
      subscription: returnedSubscription,
    }, { headers: NO_STORE })
  } catch (error) {
    console.error('[mobile/account-summary] Erreur:', error)
    return NextResponse.json({ error: 'Chargement impossible' }, { status: 500, headers: NO_STORE })
  }
}
