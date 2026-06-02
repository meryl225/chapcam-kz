import { NextResponse } from 'next/server'
import { paydunyaHeaders } from '@/lib/fulfillment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ROUTE DE DEBUG TEMPORAIRE - a supprimer apres verification.
// Teste les vraies cles PayDunya cote serveur (valeurs non masquees).
export async function GET() {
  const headers = paydunyaHeaders()
  if (!headers) {
    return NextResponse.json({ ok: false, reason: 'headers_null' })
  }

  // Diagnostic non sensible sur le format des cles
  const mk = process.env.PAYDUNYA_MASTER_KEY || ''
  const pk = process.env.PAYDUNYA_PRIVATE_KEY || ''
  const tk = process.env.PAYDUNYA_TOKEN || ''
  const diag = {
    masterLen: mk.length,
    masterDashes: (mk.match(/-/g) || []).length,
    privatePrefix: pk.slice(0, 13),
    tokenLen: tk.length,
  }

  try {
    const res = await fetch('https://app.paydunya.com/api/v1/checkout-invoice/create', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        invoice: { total_amount: 200, description: 'Test ChapCam debug' },
        store: { name: 'ChapCam' },
      }),
    })
    const data = await res.json()
    return NextResponse.json({ ok: true, httpStatus: res.status, diag, paydunya: data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: 'fetch_error', error: String(e), diag })
  }
}
