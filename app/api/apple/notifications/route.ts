import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { applyAppleTransaction, verifyAppleNotification, verifyAppleTransaction } from '@/lib/apple-iap'

export const dynamic = 'force-dynamic'

// App Store Server Notifications V2 : renouvellements, expirations, remboursements.
// A configurer dans App Store Connect > App > Informations sur l'app.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const signedPayload = typeof body?.signedPayload === 'string' ? body.signedPayload : null
  if (!signedPayload) return NextResponse.json({ error: 'Payload manquant' }, { status: 400 })

  try {
    const notification = await verifyAppleNotification(signedPayload)
    const signedTransaction = notification.data?.signedTransactionInfo
    if (!signedTransaction) return NextResponse.json({ ok: true })

    const tx = await verifyAppleTransaction(signedTransaction)
    // Sans compte ChapCam lie (appAccountToken), on ne peut rien crediter.
    if (!tx.appAccountToken) return NextResponse.json({ ok: true })

    const result = await applyAppleTransaction(createAdminClient(), tx, {
      userId: tx.appAccountToken,
      source: `apple_notification:${notification.notificationType ?? 'unknown'}`,
    })
    return NextResponse.json({ ok: true, status: result.status })
  } catch (error) {
    console.error('[apple/notifications] Notification refusee:', (error as Error).message)
    // 401 : Apple re-tentera la livraison, sans jamais crediter un payload non signe.
    return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
  }
}
