import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { grantSocialBonusOnce, SOCIAL_BONUS_JETONS, SOCIAL_NETWORKS } from '@/lib/jetons'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

export async function POST(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })

  const body = await request.json().catch(() => null)
  const visited = Array.isArray(body?.visited) ? body.visited.filter((v: unknown) => typeof v === 'string') : []
  if (!SOCIAL_NETWORKS.every((network) => visited.includes(network))) {
    return NextResponse.json({ error: 'Suis ChapCam sur les 4 réseaux pour obtenir le bonus.' }, { status: 400, headers: NO_STORE })
  }

  try {
    const result = await grantSocialBonusOnce(user.id)
    return NextResponse.json(
      { credited: result.credited, already_claimed: !result.credited, jetons: SOCIAL_BONUS_JETONS, balance: result.balance },
      { headers: NO_STORE },
    )
  } catch (error) {
    console.error('[mobile/social-bonus] Erreur:', error)
    return NextResponse.json({ error: 'Bonus indisponible pour le moment.' }, { status: 500, headers: NO_STORE })
  }
}
