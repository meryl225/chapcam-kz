import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { paydunyaHeaders } from '@/lib/fulfillment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAYDUNYA_BASE_URL = 'https://app.paydunya.com/api/v1'

const MIN_TOPUP_XOF = 500
const MAX_TOPUP_XOF = 1_000_000

// Cree une facture PayDunya pour recharger le portefeuille ChapCam Numbers.
// Le montant vient du client mais est borne et valide cote serveur.
// Le credit reel du solde se fait UNIQUEMENT au retour PayDunya (callback IPN
// verifie par hash), via custom_data.kind = 'numbers_wallet'.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !user.email) {
      return NextResponse.json(
        { success: false, error: 'Vous devez etre connecte pour recharger.' },
        { status: 401 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const amount = Math.round(Number(body.amountXof || 0))
    if (!Number.isFinite(amount) || amount < MIN_TOPUP_XOF || amount > MAX_TOPUP_XOF) {
      return NextResponse.json(
        { success: false, error: `Montant invalide (min ${MIN_TOPUP_XOF} FCFA).` },
        { status: 400 },
      )
    }

    const fullName =
      String(user.user_metadata?.full_name || user.user_metadata?.name || '').trim() || 'Client ChapCam'

    const headers = paydunyaHeaders()
    if (!headers) {
      console.error('[PayDunya] Cles API manquantes (topup)')
      return NextResponse.json(
        { success: false, error: 'Configuration PayDunya incomplete. Contactez le support.' },
        { status: 500 },
      )
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin || 'https://chapcam.com'

    const invoiceData = {
      invoice: {
        total_amount: amount,
        description: `ChapCam Numbers - Recharge portefeuille (${amount} FCFA)`,
      },
      store: {
        name: 'ChapCam',
        tagline: 'Numeros virtuels & verifications SMS',
        postal_address: "Abidjan, Cote d'Ivoire",
        phone: '+225 05 55 56 01 89',
        website_url: 'https://chapcam.com',
      },
      custom_data: {
        kind: 'numbers_wallet',
        product_id: 'numbers_wallet',
        user_id: user.id,
        email: user.email,
        full_name: fullName,
        amount_xof: amount,
      },
      actions: {
        callback_url: `${origin}/api/payment/callback`,
        return_url: `${origin}/numbers/app/wallet?topup=success`,
        cancel_url: `${origin}/numbers/app/wallet?topup=cancel`,
      },
    }

    let response: Response
    let rawBody = ''
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 20000)
      response = await fetch(`${PAYDUNYA_BASE_URL}/checkout-invoice/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(invoiceData),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      rawBody = await response.text()
    } catch (netErr) {
      console.error('[PayDunya] Topup injoignable:', netErr)
      return NextResponse.json(
        {
          success: false,
          error: 'Le service de paiement est momentanement injoignable. Reessaie dans quelques instants.',
        },
        { status: 502 },
      )
    }

    let data: any = null
    try {
      data = JSON.parse(rawBody)
    } catch {
      console.error(`[PayDunya] Topup reponse non-JSON (HTTP ${response.status}):`, rawBody.slice(0, 500))
      return NextResponse.json(
        {
          success: false,
          error: 'Reponse inattendue du service de paiement. Reessaie plus tard.',
        },
        { status: 502 },
      )
    }

    if (data.response_code !== '00' || !data.token) {
      console.error(
        `[PayDunya] Topup facture echouee (HTTP ${response.status}, code ${data.response_code}):`,
        data,
      )
      return NextResponse.json(
        { success: false, error: data.response_text || 'Erreur lors de la creation de la facture.' },
        { status: 400 },
      )
    }

    // Enregistrer une demande "pending" liee au token (reconciliation + audit).
    // Anti-doublon : on reutilise une eventuelle recharge pending du meme client.
    try {
      const admin = createAdminClient()
      const row = {
        full_name: fullName,
        email: user.email,
        phone_number: 'PayDunya',
        plan: 'numbers_wallet',
        amount,
        wave_transaction_reference: data.token,
        status: 'pending',
        user_id: user.id,
        payment_method: 'paydunya',
        paydunya_token: data.token,
      }
      const { data: existing } = await admin
        .from('payment_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan', 'numbers_wallet')
        .eq('payment_method', 'paydunya')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (existing) {
        await admin.from('payment_requests').update(row).eq('id', existing.id)
      } else {
        await admin.from('payment_requests').insert(row)
      }
    } catch (dbErr) {
      console.error('[PayDunya] Insert payment_requests (topup) echoue:', dbErr)
    }

    return NextResponse.json({
      success: true,
      token: data.token,
      invoice_url: data.response_text,
    })
  } catch (error) {
    console.error('[PayDunya] Erreur topup:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur.' }, { status: 500 })
  }
}
