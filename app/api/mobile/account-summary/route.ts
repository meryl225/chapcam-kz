import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getJetonsBalance, grantWelcomeJetonsOnce } from '@/lib/jetons'
import { getSocialBonusState } from '@/lib/social-claims'
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

  // Granted before reading the balance so the first summary already shows it.
  // A failure here must never block the account from loading; it is retried on
  // the next summary call and stays idempotent.
  const welcomeBonus = await grantWelcomeJetonsOnce(user.id, user.created_at).catch((error) => {
    console.error('[mobile/account-summary] Bonus de bienvenue non crédité:', error)
    return { credited: false as const }
  })

  try {
    // Authenticate with the mobile bearer token, then read the same production
    // tables as the website with service-role scope (RLS otherwise hides them).
    const accountDb = createAdminClient()
    const [{ data: subscription, error: subscriptionError }, jetons, socialBonusState] = await Promise.all([
      accountDb
        .from('subscriptions')
        .select('plan,status,is_active,points,expires_at,end_date')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      getJetonsBalance(user.id),
      getSocialBonusState(user.id).catch((error) => {
        console.error('[mobile/account-summary] Statut bonus réseaux indisponible:', error)
        return null
      }),
    ])

    if (subscriptionError) throw subscriptionError

    const plan = subscription?.plan || null
    const expiration = subscription?.expires_at || subscription?.end_date || null
    const expirationTime = expiration ? new Date(expiration).getTime() : null
    const active = Boolean(
      subscription &&
      plan &&
      plan !== 'free' &&
      (subscription.is_active === true || subscription.status === 'active') &&
      (expirationTime === null || Number.isNaN(expirationTime) || expirationTime >= Date.now()),
    )
    // `points` is the Live Swap balance credited by purchases/admin and debited
    // by /api/points. `points_remaining` is a legacy column (default 0, only
    // written by the old faceswap routes) and must never be shown as balance.
    // Expired => 0, same rule as GET /api/points.
    const expired = expirationTime !== null && !Number.isNaN(expirationTime) && expirationTime < Date.now()
    const remainingPoints = subscription
      ? expired ? 0 : Math.max(0, Number(subscription.points) || 0)
      : null

    if (!jetons || typeof jetons.balance !== 'number') {
      throw new Error('Solde Jetons indisponible')
    }

    const returnedSubscription = subscription
      ? {
          plan,
          status: subscription.status || (subscription.is_active === true ? 'active' : 'inactive'),
          is_active: subscription.is_active === true,
          points: remainingPoints,
          // Installed app builds read points_remaining first: mirror the real balance.
          points_remaining: remainingPoints,
          expires_at: subscription.expires_at || null,
          end_date: subscription.end_date || null,
        }
      : null

    return NextResponse.json({
      jetons: jetons.balance,
      live_swap: {
        points: typeof remainingPoints === 'number' ? remainingPoints : null,
        points_per_second: typeof remainingPoints === 'number' ? 2 : null,
      },
      subscription: returnedSubscription,
      welcome_bonus_credited: welcomeBonus.credited,
      // null hides the bonus UI when the status cannot be read.
      social_bonus_claimed: socialBonusState === null ? null : socialBonusState === 'approved',
      social_bonus_status: socialBonusState,
      avatar_url: typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null,
    }, { headers: NO_STORE })
  } catch (error) {
    console.error('[mobile/account-summary] Erreur:', error)
    return NextResponse.json({ error: 'Chargement impossible' }, { status: 500, headers: NO_STORE })
  }
}
