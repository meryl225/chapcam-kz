import { NextRequest, NextResponse } from 'next/server'
import {
  confirmAndFulfillPaydunya,
  fulfillFromVerifiedIpn,
  verifyPaydunyaHash,
} from '@/lib/fulfillment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Reconstruit un objet imbrique a partir des cles "data[invoice][token]" que
// PayDunya envoie en form-urlencoded / multipart.
function setNested(target: Record<string, any>, path: string[], value: any) {
  let node = target
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    if (typeof node[key] !== 'object' || node[key] === null) node[key] = {}
    node = node[key]
  }
  node[path[path.length - 1]] = value
}

function parseBracketKey(key: string): string[] {
  // "data[invoice][token]" -> ["data", "invoice", "token"]
  const parts: string[] = []
  const regex = /([^[\]]+)/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(key)) !== null) parts.push(m[1])
  return parts
}

// Parse le corps de l'IPN (JSON OU form-urlencoded) en un objet { data: {...} }.
async function parseIpnBody(request: NextRequest): Promise<Record<string, any>> {
  const contentType = request.headers.get('content-type') || ''
  try {
    if (contentType.includes('application/json')) {
      return await request.json()
    }
    const form = await request.formData()
    const obj: Record<string, any> = {}
    for (const [key, value] of form.entries()) {
      if (typeof value !== 'string') continue
      // Certains envois mettent tout le JSON dans un champ "data".
      if (key === 'data') {
        try {
          return { data: JSON.parse(value) }
        } catch {
          /* pas du JSON : on continue le parsing par cles */
        }
      }
      setNested(obj, parseBracketKey(key), value)
    }
    return obj
  } catch (e) {
    console.error('[PayDunya Callback] Parse echec:', e)
    return {}
  }
}

// IPN PayDunya. Strategie de credit, dans l'ordre :
//  1) Verifier le hash SHA-512(Master Key) joint a l'IPN. Si valide, on fait
//     confiance au statut du corps et on credite directement. Ce chemin ne
//     depend PAS de la paire Private Key + Token.
//  2) Repli : reconfirmer aupres de l'API PayDunya avec nos cles serveur.
export async function POST(request: NextRequest) {
  const body = await parseIpnBody(request)
  const data = body?.data || body || {}

  const token: string | null =
    data?.invoice?.token || data?.token || body?.invoice?.token || body?.token || null

  if (!token) {
    console.error("[PayDunya Callback] Token introuvable dans l'IPN")
    return NextResponse.json({ success: false, error: 'token manquant' })
  }

  const status = String(data?.status || '').toLowerCase()
  const hash: string | null = data?.hash || body?.hash || null
  const totalAmount = Number(data?.invoice?.total_amount || data?.total_amount || 0)
  const customData = data?.invoice?.custom_data || data?.custom_data || {}
  const transactionId: string | null =
    data?.invoice?.receipt_url ||
    data?.receipt_identifier ||
    data?.invoice?.transaction_id ||
    customData?.transaction_id ||
    null

  // 1) Chemin prioritaire : IPN authentifie par hash Master Key.
  if (verifyPaydunyaHash(hash)) {
    const outcome = await fulfillFromVerifiedIpn({ token, status, totalAmount, customData, transactionId })
    console.log(
      `[PayDunya Callback] (hash OK) token=${token} status=${outcome.status} ` +
        `alreadyDone=${outcome.alreadyDone}` +
        (outcome.result ? ` kind=${outcome.result.kind} linked=${outcome.result.userLinked}` : ''),
    )
    return NextResponse.json({ success: outcome.status === 'completed', status: outcome.status })
  }

  // 2) Repli : reconfirmation via API (necessite des cles Private/Token valides).
  console.warn('[PayDunya Callback] Hash absent/invalide, repli sur confirmation API')
  const outcome = await confirmAndFulfillPaydunya(token, 'callback')
  console.log(
    `[PayDunya Callback] (API) token=${token} status=${outcome.status} alreadyDone=${outcome.alreadyDone}` +
      (outcome.result ? ` kind=${outcome.result.kind} linked=${outcome.result.userLinked}` : ''),
  )
  return NextResponse.json({ success: outcome.status === 'completed', status: outcome.status })
}
