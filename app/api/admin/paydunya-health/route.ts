import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAYDUNYA_BASE_URL = 'https://app.paydunya.com/api/v1'

// Diagnostic admin : teste si la combinaison Master Key + Private Key + Token
// est valide cote PayDunya, sans dependre d'un paiement reel.
// On tente la creation d'une facture minimale : si PayDunya repond response_code
// "00", les trois cles forment une paire valide. La facture creee n'est jamais
// payee (sans impact). Tout autre message = cles invalides/mal appariees.
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ ok: false, error: 'Acces refuse.' }, { status: 403 })
  }

  const masterKey = process.env.PAYDUNYA_MASTER_KEY
  const privateKey = process.env.PAYDUNYA_PRIVATE_KEY
  const token = process.env.PAYDUNYA_TOKEN

  // Quelles cles sont presentes ? (sans jamais reveler leur valeur)
  const presence = {
    PAYDUNYA_MASTER_KEY: !!masterKey,
    PAYDUNYA_PRIVATE_KEY: !!privateKey,
    PAYDUNYA_TOKEN: !!token,
  }

  if (!masterKey || !privateKey || !token) {
    const missing = Object.entries(presence)
      .filter(([, v]) => !v)
      .map(([k]) => k)
    return NextResponse.json({
      ok: false,
      configured: false,
      presence,
      message: `Cles manquantes : ${missing.join(', ')}. Ajoutez-les dans les variables d'environnement du projet.`,
    })
  }

  // Indices de format (sans exposer les valeurs) pour reperer un mauvais mode.
  const privateMode = privateKey.startsWith('live_private_')
    ? 'live'
    : privateKey.startsWith('test_private_')
      ? 'test'
      : 'inconnu'
  const tokenLooksLive = token.length >= 20

  try {
    const res = await fetch(`${PAYDUNYA_BASE_URL}/checkout-invoice/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': masterKey,
        'PAYDUNYA-PRIVATE-KEY': privateKey,
        'PAYDUNYA-TOKEN': token,
      },
      body: JSON.stringify({
        invoice: { total_amount: 200, description: 'ChapCam - test de configuration (non paye)' },
        store: { name: 'ChapCam' },
      }),
      cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))

    const valid = data?.response_code === '00'
    return NextResponse.json({
      ok: valid,
      configured: true,
      presence,
      privateMode,
      tokenLooksLive,
      paydunyaResponseCode: data?.response_code ?? null,
      message: valid
        ? 'Cles PayDunya VALIDES. Le credit automatique va fonctionner.'
        : `Cles PayDunya INVALIDES : ${data?.response_text || 'reponse inattendue de PayDunya'}. ` +
          `Verifiez que Master Key, Private Key et Token proviennent de LA MEME application PayDunya en mode Production.`,
    })
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      configured: true,
      presence,
      message: `Impossible de contacter PayDunya : ${e?.message || 'erreur reseau'}.`,
    })
  }
}
