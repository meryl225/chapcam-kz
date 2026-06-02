import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlan } from '@/lib/plans'
import { getLiveOffer } from '@/lib/live-offers'
import { paydunyaHeaders } from '@/lib/fulfillment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAYDUNYA_BASE_URL = 'https://app.paydunya.com/api/v1'

// Cree une facture PayDunya pour une formule a points OU l'offre Live Pro.
// Le montant et le libelle sont calcules cote serveur (source de verite),
// jamais a partir du corps de la requete.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !user.email) {
      return NextResponse.json(
        { success: false, error: 'Vous devez etre connecte pour payer.' },
        { status: 401 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const productId = String(body.productId || body.plan || '')
    const fullName =
      String(body.fullName || user.user_metadata?.full_name || '').trim() || 'Client ChapCam'
    const phoneNumber = String(body.phoneNumber || '').trim() || 'PayDunya'

    // Determiner le produit : formule a points ou offre Live Pro.
    const plan = getPlan(productId)
    const liveOffer = getLiveOffer(productId)
    if (!plan && !liveOffer) {
      return NextResponse.json({ success: false, error: 'Produit inconnu.' }, { status: 400 })
    }

    const amount = plan ? plan.price : liveOffer!.price
    const kind: 'plan' | 'live' = plan ? 'plan' : 'live'
    const label = plan
      ? `Formule ${plan.name} (${plan.points} points, ${plan.duration})`
      : `${liveOffer!.name} (${liveOffer!.windowMinutes} min d'acces Live)`

    const headers = paydunyaHeaders()
    if (!headers) {
      console.error('[PayDunya] Cles API manquantes')
      return NextResponse.json(
        { success: false, error: 'Configuration PayDunya incomplete. Contactez le support.' },
        { status: 500 },
      )
    }

    // Base URL publique : l'origine de la requete (fonctionne en preview + prod),
    // avec repli sur l'env / le domaine de prod.
    const origin =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin || 'https://chapcam.com'

    const invoiceData = {
      invoice: {
        total_amount: amount,
        description: `ChapCam - ${label}`,
      },
      store: {
        name: 'ChapCam',
        tagline: 'Face Swap en Temps Reel',
        postal_address: "Abidjan, Cote d'Ivoire",
        phone: '+225 05 55 56 01 89',
        website_url: 'https://chapcam.com',
      },
      custom_data: {
        kind,
        product_id: productId,
        user_id: user.id,
        email: user.email,
        full_name: fullName,
      },
      actions: {
        callback_url: `${origin}/api/payment/callback`,
        return_url: `${origin}/dashboard/payment-success`,
        cancel_url: `${origin}/dashboard/plans`,
      },
    }

    const response = await fetch(`${PAYDUNYA_BASE_URL}/checkout-invoice/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(invoiceData),
    })
    const data = await response.json()

    if (data.response_code !== '00' || !data.token) {
      console.error('[PayDunya] Creation facture echouee:', data)
      return NextResponse.json(
        { success: false, error: data.response_text || 'Erreur lors de la creation de la facture.' },
        { status: 400 },
      )
    }

    // Enregistrer une demande "pending" liee au token PayDunya.
    // Le callback / la verification de statut la passera a "approved".
    try {
      const admin = createAdminClient()
      await admin.from('payment_requests').insert({
        full_name: fullName,
        email: user.email,
        phone_number: phoneNumber,
        plan: productId,
        amount,
        wave_transaction_reference: data.token, // colonne NOT NULL : on y stocke le token
        status: 'pending',
        user_id: user.id,
        payment_method: 'paydunya',
        paydunya_token: data.token,
      })
    } catch (dbErr) {
      // On n'echoue pas le paiement si l'insert echoue : le callback peut encore
      // crediter via custom_data. On log seulement.
      console.error('[PayDunya] Insert payment_requests echoue:', dbErr)
    }

    return NextResponse.json({
      success: true,
      token: data.token,
      invoice_url: data.response_text,
    })
  } catch (error) {
    console.error('[PayDunya] Erreur create:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur.' }, { status: 500 })
  }
}
