import { NextRequest, NextResponse } from 'next/server'
import { confirmAndFulfillPaydunya } from '@/lib/fulfillment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Extrait le token de facture du corps de l'IPN PayDunya.
// PayDunya envoie soit du JSON, soit du form-urlencoded (data[invoice][token]).
async function extractToken(request: NextRequest): Promise<string | null> {
  const contentType = request.headers.get('content-type') || ''

  try {
    if (contentType.includes('application/json')) {
      const body = await request.json()
      return (
        body?.data?.invoice?.token ||
        body?.data?.token ||
        body?.invoice?.token ||
        body?.token ||
        null
      )
    }

    // form-urlencoded / multipart : PayDunya envoie des cles "data[...][token]".
    const form = await request.formData()
    for (const [key, value] of form.entries()) {
      if (/\btoken\b/i.test(key) && typeof value === 'string' && value) {
        return value
      }
    }
    // Repli : certains envois mettent tout le JSON dans un champ "data".
    const rawData = form.get('data')
    if (typeof rawData === 'string') {
      try {
        const parsed = JSON.parse(rawData)
        return parsed?.invoice?.token || parsed?.token || null
      } catch {
        /* ignore */
      }
    }
  } catch (e) {
    console.error('[PayDunya Callback] Parse echec:', e)
  }
  return null
}

// IPN PayDunya : on ne fait JAMAIS confiance au corps recu.
// On reconfirme le statut aupres de PayDunya avec nos cles serveur,
// puis on credite de maniere idempotente.
export async function POST(request: NextRequest) {
  const token = await extractToken(request)

  if (!token) {
    console.error('[PayDunya Callback] Token introuvable dans l\'IPN')
    // 200 pour ne pas declencher de retries infinis cote PayDunya.
    return NextResponse.json({ success: false, error: 'token manquant' })
  }

  const outcome = await confirmAndFulfillPaydunya(token)

  console.log(
    `[PayDunya Callback] token=${token} status=${outcome.status} alreadyDone=${outcome.alreadyDone}` +
      (outcome.result ? ` kind=${outcome.result.kind} linked=${outcome.result.userLinked}` : ''),
  )

  return NextResponse.json({ success: outcome.status === 'completed', status: outcome.status })
}
