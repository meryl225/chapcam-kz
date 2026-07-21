import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlan } from '@/lib/plans'
import { getLiveOffer } from '@/lib/live-offers'
import { getInstallOffer } from '@/lib/install-offer'
import { getPcOffer } from '@/lib/pc-offer'
import { getVoiceOffer } from '@/lib/voice-offers'
import { createTrybitInvoice, trybitConfigured } from '@/lib/trybit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cree une facture crypto Trybit pour un produit ChapCam. Le montant (en FCFA)
// est calcule cote serveur (source de verite), jamais depuis le corps client,
// puis converti en EUR par la lib Trybit.
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

    if (!trybitConfigured()) {
      console.error('[Trybit] Cles API manquantes')
      return NextResponse.json(
        { success: false, error: 'Paiement crypto indisponible pour le moment.' },
        { status: 500 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const productId = String(body.productId || body.plan || '')
    const fullName =
      String(body.fullName || user.user_metadata?.full_name || '').trim() || 'Client ChapCam'
    const phoneNumber = String(body.phoneNumber || '').trim() || 'Trybit'

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

    // Identifiant unique qui nous relie a la demande (renvoye tel quel par le
    // postback Trybit dans order_id).
    const orderId = `chapcam_${crypto.randomUUID()}`

    const invoice = await createTrybitInvoice({
      amountXof: amount,
      orderId,
      email: user.email,
    })
    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le service de paiement crypto est momentanement injoignable. Reessaie dans quelques instants.",
        },
        { status: 502 },
      )
    }

    // Enregistrer une demande "pending" liee a la facture Trybit.
    // ANTI-DOUBLON : on reutilise une demande crypto pending existante pour le
    // meme produit au lieu d'en creer une nouvelle a chaque clic.
    try {
      const admin = createAdminClient()
      const row = {
        full_name: fullName,
        email: user.email,
        phone_number: phoneNumber,
        plan: productId,
        amount,
        wave_transaction_reference: orderId, // colonne NOT NULL : on y met l'order_id
        status: 'pending',
        user_id: user.id,
        payment_method: 'trybit',
        paydunya_token: invoice.uuid, // reutilisee pour stocker l'uuid de la facture crypto
      }

      const { data: existing } = await admin
        .from('payment_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan', productId)
        .eq('payment_method', 'trybit')
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
      // On n'echoue pas le paiement : le postback peut retrouver la facture via
      // l'API Trybit. On log seulement.
      console.error('[Trybit] Insert payment_requests echoue:', dbErr)
    }

    return NextResponse.json({
      success: true,
      uuid: invoice.uuid,
      invoice_url: invoice.link,
    })
  } catch (error) {
    console.error('[Trybit] Erreur create:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur.' }, { status: 500 })
  }
}
