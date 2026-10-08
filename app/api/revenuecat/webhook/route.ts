import { timingSafeEqual } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { isChapcamUserId, syncRevenueCatCustomer } from '@/lib/revenuecat'

export const dynamic = 'force-dynamic'

// Tolere « Bearer » present d'un seul cote et les espaces/retours ligne
// parasites saisis dans RevenueCat ou dans les variables Vercel.
const normalizeSecret = (value: string) => value.trim().replace(/^bearer\s+/i, '').trim()

function authorized(request: NextRequest) {
  const expected = normalizeSecret(process.env.REVENUECAT_WEBHOOK_AUTH || '')
  const rawReceived = request.headers.get('authorization') || ''
  const received = normalizeSecret(rawReceived)
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  const ok = expected.length > 0 && a.length === b.length && timingSafeEqual(a, b)
  if (!ok) {
    console.warn('[iap-diag] webhook refuse', {
      secretConfigured: expected.length > 0,
      headerPresent: rawReceived.length > 0,
      headerHadBearer: /^\s*bearer\s/i.test(rawReceived),
      lengthsMatch: a.length === b.length,
    })
  }
  return ok
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
  console.info('[iap-diag] webhook recu', {
    type: event?.type,
    productId: event?.product_id,
    appUserId: event?.app_user_id,
    chapcamUser: userId ?? null,
  })
  if (!userId) return NextResponse.json({ ok: true, skipped: 'no_chapcam_user' })

  try {
    const result = await syncRevenueCatCustomer(userId, { source: `revenuecat_webhook:${event?.type ?? 'unknown'}` })
    console.info('[iap-diag] webhook applique', { userId, items: result.items, subscriptionActive: result.subscriptionActive })
    return NextResponse.json({ ok: true, items: result.items.length })
  } catch (error) {
    console.error('[revenuecat/webhook] Synchronisation impossible:', (error as Error).message)
    // 500 : RevenueCat relivrera l'evenement plus tard.
    return NextResponse.json({ error: 'Synchronisation impossible' }, { status: 500 })
  }
}
