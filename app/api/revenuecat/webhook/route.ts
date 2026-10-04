import { timingSafeEqual } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { isChapcamUserId, syncRevenueCatCustomer } from '@/lib/revenuecat'

export const dynamic = 'force-dynamic'

function authorized(request: NextRequest) {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH
  const received = request.headers.get('authorization') || ''
  if (!expected) return false
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  const bearer = Buffer.from(`Bearer ${expected}`)
  return (a.length === b.length && timingSafeEqual(a, b)) || (a.length === bearer.length && timingSafeEqual(a, bearer))
}

// Webhook RevenueCat : renouvellements, expirations, remboursements, achats.
// Le contenu de l'evenement sert seulement a savoir QUI resynchroniser ; les
// droits sont relus depuis l'API RevenueCat avant tout credit.
export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const event = body?.event
  const candidates: unknown[] = [event?.app_user_id, event?.original_app_user_id, ...(Array.isArray(event?.aliases) ? event.aliases : [])]
  const userId = candidates.find(isChapcamUserId)
  if (!userId) return NextResponse.json({ ok: true, skipped: 'no_chapcam_user' })

  try {
    const result = await syncRevenueCatCustomer(userId, { source: `revenuecat_webhook:${event?.type ?? 'unknown'}` })
    return NextResponse.json({ ok: true, items: result.items.length })
  } catch (error) {
    console.error('[revenuecat/webhook] Synchronisation impossible:', (error as Error).message)
    // 500 : RevenueCat relivrera l'evenement plus tard.
    return NextResponse.json({ error: 'Synchronisation impossible' }, { status: 500 })
  }
}
