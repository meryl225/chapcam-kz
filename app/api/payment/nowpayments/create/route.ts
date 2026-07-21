import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlan } from '@/lib/plans'
import { getLiveOffer } from '@/lib/live-offers'
import { getInstallOffer } from '@/lib/install-offer'
import { getPcOffer } from '@/lib/pc-offer'
import { getVoiceOffer } from '@/lib/voice-offers'
import { createNowInvoice, nowpaymentsConfigured, prefixedInvoiceId } from '@/lib/nowpayments'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cree une facture crypto NOWPayments pour un produit ChapCam. Le montant (en
// FCFA) est calcule cote serveur (source de verite), jamais depuis le corps
// client, puis converti en EUR par la lib NOWPayments.
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

    if (!nowpaymentsConfigured()) {
      console.error('[NOWPayments] Cle API manquante')
      return NextResponse.json(
        { success: false, error: 'Paiement crypto indisponible pour le moment.' },
        { status: 500 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const productId = String(body.productId || body.plan || '')
    const fullName =
      String(body.fullName || user.user_metadata?.full_name || '').trim() || 'Client ChapCam'
    const phoneNumber = String(body.phoneNumber || '').trim() || 'NOWPayments'

    const plan = getPlan(productId)
    const liveOffer = getLiveOffer(productId)
    const installOffer = getInstallOffer(productId)
    const pcOffer = getPcOffer(productId)
    const voiceOffer = getVoiceOffer(productId)
    if (!plan && !liveOffer && !installOffer && !pcOffer && !voiceOffer) {
      return NextResponse.json({ success: false, error: 'Produit inconnu.' }, { status: 400 })
    }

    const amount = plan
      ? plan.price
      : liveOffer
        ? liveOffer.price
        : installOffer
          ? installOffer.price
          : pcOffer
            ? pcOffer.price
            : voiceOffer!.price

    // Identifiant unique qui nous relie a la demande (renvoye tel quel par
    // NOWPayments dans order_id de l'IPN et du GET payment).
    const orderId = `chapcam_${crypto.randomUUID()}`

    const invoice = await createNowInvoice({
      amountXof: amount,
      orderId,
      email: user.email,
      origin: request.nextUrl.origin,
    })
    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Le service de paiement crypto est momentanement injoignable. Reessaie dans quelques instants.',
        },
        { status: 502 },
      )
    }

    // Enregistrer une demande "pending" liee a la facture NOWPayments.
    // Les demandes NOWPayments sont identifiees par leur token prefixe "NP-"
    // (independamment de payment_method : la contrainte CHECK de la table peut
    // ne pas encore autoriser la valeur 'nowpayments').
    try {
      const admin = createAdminClient()
      const cryptoToken = prefixedInvoiceId(invoice.id) // ex: NP-123456
      const baseRow = {
        full_name: fullName,
        email: user.email,
        phone_number: phoneNumber,
        plan: productId,
        amount,
        wave_transaction_reference: orderId, // colonne NOT NULL : on y met l'order_id
        status: 'pending',
        user_id: user.id,
        paydunya_token: cryptoToken, // reutilisee pour stocker l'id de facture crypto
      }

      // ANTI-DOUBLON : reutilise une demande NOWPayments pending existante pour
      // le meme produit (identifiee par le token NP-, pas par payment_method).
      const { data: existing } = await admin
        .from('payment_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan', productId)
        .like('paydunya_token', 'NP-%')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Tente d'ecrire payment_method:'nowpayments' (etiquetage propre). Si la
      // contrainte CHECK le refuse, on retente sans pour ne jamais perdre la
      // demande.
      const write = async (withMethod: boolean) => {
        const row = withMethod ? { ...baseRow, payment_method: 'nowpayments' } : baseRow
        return existing
          ? admin.from('payment_requests').update(row).eq('id', existing.id)
          : admin.from('payment_requests').insert(row)
      }
      let { error } = await write(true)
      if (error) {
        const retry = await write(false)
        error = retry.error
      }
      if (error) console.error('[NOWPayments] Enregistrement payment_requests echoue:', error)
    } catch (dbErr) {
      // On n'echoue pas le paiement : l'IPN peut retrouver la facture via
      // l'API NOWPayments. On log seulement.
      console.error('[NOWPayments] Insert payment_requests echoue:', dbErr)
    }

    return NextResponse.json({
      success: true,
      invoice_id: invoice.id,
      invoice_url: invoice.link,
    })
  } catch (error) {
    console.error('[NOWPayments] Erreur create:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur.' }, { status: 500 })
  }
}
