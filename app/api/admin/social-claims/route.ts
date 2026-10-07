import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_EMAIL, isAdminRequest } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { approveClaim, listClaims, rejectClaim, signProofUrls, type SocialClaimStatus } from '@/lib/social-claims'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }
const STATUSES = new Set(['pending', 'approved', 'rejected', 'all'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })

  const requested = request.nextUrl.searchParams.get('status') || 'pending'
  const status = (STATUSES.has(requested) ? requested : 'pending') as SocialClaimStatus | 'all'

  try {
    const claims = await listClaims(status)
    const auth = createAdminClient().auth.admin
    const userIds = [...new Set(claims.map((claim) => claim.user_id))]
    const emails = new Map<string, string | null>()
    await Promise.all(
      userIds.map(async (id) => {
        const { data } = await auth.getUserById(id)
        emails.set(id, data.user?.email ?? null)
      }),
    )
    const items = await Promise.all(
      claims.map(async (claim) => ({
        ...claim,
        email: emails.get(claim.user_id) ?? null,
        proof_signed_urls: await signProofUrls(claim.proof_urls),
      })),
    )
    return NextResponse.json({ claims: items }, { headers: NO_STORE })
  } catch (error) {
    console.error('[admin/social-claims] Erreur:', error)
    return NextResponse.json({ error: 'Chargement impossible' }, { status: 500, headers: NO_STORE })
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : ''
  const action = body?.action
  if (!UUID.test(id) || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400, headers: NO_STORE })
  }

  try {
    if (action === 'approve') {
      const result = await approveClaim(id, ADMIN_EMAIL)
      if (!result.ok) return NextResponse.json({ error: 'Demande déjà traitée ou introuvable.' }, { status: 409, headers: NO_STORE })
      return NextResponse.json(
        { ok: true, message: result.credited ? '+5 jetons crédités.' : 'Approuvée (bonus déjà crédité auparavant).' },
        { headers: NO_STORE },
      )
    }
    const result = await rejectClaim(id, ADMIN_EMAIL)
    if (!result.ok) return NextResponse.json({ error: 'Demande déjà traitée ou introuvable.' }, { status: 409, headers: NO_STORE })
    return NextResponse.json({ ok: true, message: 'Demande refusée.' }, { headers: NO_STORE })
  } catch (error) {
    console.error('[admin/social-claims] Erreur:', error)
    return NextResponse.json({ error: 'Action impossible' }, { status: 500, headers: NO_STORE })
  }
}
