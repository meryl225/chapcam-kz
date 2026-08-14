import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlan } from '@/lib/plans'
import { getLiveOffer } from '@/lib/live-offers'
import { getInstallOffer } from '@/lib/install-offer'
import { getPcOffer } from '@/lib/pc-offer'
import { getVoiceOffer } from '@/lib/voice-offers'
import { getPhotoVideoOffer } from '@/lib/photo-video-offers'
import { getMotionOffer } from '@/lib/motion-offers'
import { getTranslationOffer } from '@/lib/translation-offers'
import { createGeniusPayPayment, geniuspayConfigured } from '@/lib/geniuspay'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cree un paiement GeniusPay (checkout hebergee : carte bancaire internationale
// + mobile money) pour un produit ChapCam. Le montant (en FCFA) est calcule
// cote serveur (source de verite), jamais depuis le corps client.
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

    if (!geniuspayConfigured()) {
      console.error('[GeniusPay] Cles API manquantes')
      return NextResponse.json(
        { success: false, error: 'Paiement par carte indisponible pour le moment.' },
        { status: 500 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const productId = String(body.productId || body.plan || '')
    const fullName =
      String(body.fullName || user.user_metadata?.full_name || '').trim() || 'Client ChapCam'
    const phoneNumber = String(body.phoneNumber || '').trim()

    // Determiner le produit (meme resolution que PayDunya/Trybit).
    const plan = getPlan(productId)
    const liveOffer = getLiveOffer(productId)
    const installOffer = getInstallOffer(productId)
    const pcOffer = getPcOffer(productId)
    const voiceOffer = getVoiceOffer(productId)
    const photoOffer = getPhotoVideoOffer(productId)
    const motionOffer = getMotionOffer(productId)
    const translationOffer = getTranslationOffer(productId)
    if (
      !plan && !liveOffer && !installOffer && !pcOffer && !voiceOffer && !photoOffer &&
      !motionOffer && !translationOffer
    ) {
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
            : voiceOffer
              ? voiceOffer.price
              : photoOffer
                ? photoOffer.price
                : motionOffer
                  ? motionOffer.price
                  : translationOffer!.price
    const kind: 'plan' | 'live' | 'installation' | 'pc' | 'voice' | 'photo' | 'motion' | 'translation' = plan
      ? 'plan'
      : liveOffer
        ? 'live'
        : installOffer
          ? 'installation'
          : pcOffer
            ? 'pc'
            : voiceOffer
              ? 'voice'
              : photoOffer
                ? 'photo'
                : motionOffer
                  ? 'motion'
                  : 'translation'
    const label = plan
      ? `Formule ${plan.name} (${plan.points} points, ${plan.duration})`
      : liveOffer
        ? `${liveOffer.name} (${liveOffer.windowMinutes} min d'acces Live)`
        : installOffer
          ? installOffer.name
          : pcOffer
            ? `${pcOffer.name} (licence a vie)`
            : voiceOffer
              ? `${voiceOffer.name} (${voiceOffer.minutes} min de voix)`
              : photoOffer
                ? `${photoOffer.name} (${photoOffer.credits} videos de 30s)`
                : motionOffer
                  ? `${motionOffer.name} (${motionOffer.credits} clips Motion de 10s)`
                  : `${translationOffer!.name} (${translationOffer!.credits} traductions vidéo)`

    // Base URL publique (preview + prod).
    const origin =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin || 'https://chapcam.com'

    // Creation du paiement : sans payment_method => page de checkout GeniusPay
    // (le client choisit carte bancaire OU mobile money selon son pays).
    const payment = await createGeniusPayPayment({
      amountXof: amount,
      description: `ChapCam - ${label}`,
      email: user.email,
      fullName,
      phone: phoneNumber || undefined,
      metadata: {
        kind,
        product_id: productId,
        user_id: user.id,
        email: user.email,
        full_name: fullName,
      },
      successUrl: `${origin}/dashboard/payment-success?provider=geniuspay`,
      errorUrl: `${origin}/dashboard/plans`,
    })

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Le service de paiement par carte est momentanement injoignable. Reessaie dans quelques instants.",
        },
        { status: 502 },
      )
    }

    // Enregistrer une demande "pending" liee a la reference GeniusPay (MTX-...).
    // On stocke la reference dans paydunya_token (colonne reutilisee par tous les
    // providers) pour que le callback/status retrouve la demande.
    try {
      const admin = createAdminClient()
      const baseRow = {
        full_name: fullName,
        email: user.email,
        phone_number: phoneNumber || 'GeniusPay',
        plan: productId,
        amount,
        wave_transaction_reference: payment.reference, // colonne NOT NULL
        status: 'pending',
        user_id: user.id,
        paydunya_token: payment.reference, // reference MTX-... (cle de rapprochement)
      }

      // ANTI-DOUBLON : reutilise une demande GeniusPay pending existante pour le
      // meme produit (identifiee par une reference MTX-).
      const { data: existing } = await admin
        .from('payment_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan', productId)
        .like('paydunya_token', 'MTX-%')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Tente d'ecrire payment_method:'geniuspay'. Si la contrainte CHECK le
      // refuse, on retente sans, pour ne jamais perdre la demande.
      const write = async (withMethod: boolean) => {
        const row = withMethod ? { ...baseRow, payment_method: 'geniuspay' } : baseRow
        return existing
          ? admin.from('payment_requests').update(row).eq('id', existing.id)
          : admin.from('payment_requests').insert(row)
      }
      let { error } = await write(true)
      if (error) {
        const retry = await write(false)
        error = retry.error
      }
      if (error) console.error('[GeniusPay] Enregistrement payment_requests echoue:', error)
    } catch (dbErr) {
      // On n'echoue pas le paiement : le callback peut crediter via les metadata.
      console.error('[GeniusPay] Insert payment_requests echoue:', dbErr)
    }

    return NextResponse.json({
      success: true,
      reference: payment.reference,
      invoice_url: payment.checkoutUrl,
    })
  } catch (error) {
    console.error('[GeniusPay] Erreur create:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur.' }, { status: 500 })
  }
}
