import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createGeniusPayPayment, geniuspayConfigured } from '@/lib/geniuspay'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MIN_TOPUP_XOF = 500
const MAX_TOPUP_XOF = 1_000_000

// Cree un paiement GeniusPay pour recharger le portefeuille ChapCam Numbers.
// (TEMPORAIRE : PayDunya indisponible -> tout passe par GeniusPay, qui gere
// carte bancaire + mobile money.) Le montant vient du client mais est borne et
// valide cote serveur. Le credit reel du solde se fait UNIQUEMENT au retour
// GeniusPay (callback/webhook reconfirme server-to-server), via
// metadata.kind = 'numbers_wallet' (gere par fulfillGeniusPayPayment).
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

    if (!geniuspayConfigured()) {
      console.error('[GeniusPay] Cles API manquantes (topup)')
      return NextResponse.json(
        { success: false, error: 'Service de paiement indisponible. Contactez le support.' },
        { status: 500 },
      )
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin || 'https://chapcam.com'

    const payment = await createGeniusPayPayment({
      amountXof: amount,
      description: `ChapCam Numbers - Recharge portefeuille (${amount} FCFA)`,
      email: user.email,
      fullName,
      metadata: {
        kind: 'numbers_wallet',
        product_id: 'numbers_wallet',
        user_id: user.id,
        email: user.email,
        full_name: fullName,
      },
      successUrl: `${origin}/numbers/app/wallet?topup=success`,
      errorUrl: `${origin}/numbers/app/wallet?topup=cancel`,
    })

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Le service de paiement est momentanement injoignable. Reessaie dans quelques instants.',
        },
        { status: 502 },
      )
    }

    // Enregistrer une demande "pending" liee a la reference GeniusPay (MTX-...).
    // Anti-doublon : on reutilise une eventuelle recharge pending du meme client.
    // La reference est stockee dans paydunya_token (cle de rapprochement commune
    // a tous les providers, utilisee par fulfillGeniusPayPayment).
    try {
      const admin = createAdminClient()
      const baseRow = {
        full_name: fullName,
        email: user.email,
        phone_number: 'GeniusPay',
        plan: 'numbers_wallet',
        amount,
        wave_transaction_reference: payment.reference,
        status: 'pending',
        user_id: user.id,
        paydunya_token: payment.reference,
      }
      const { data: existing } = await admin
        .from('payment_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan', 'numbers_wallet')
        .like('paydunya_token', 'MTX-%')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

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
      if (error) console.error('[GeniusPay] Enregistrement payment_requests (topup) echoue:', error)
    } catch (dbErr) {
      // On n'echoue pas le paiement : le callback peut crediter via les metadata.
      console.error('[GeniusPay] Insert payment_requests (topup) echoue:', dbErr)
    }

    return NextResponse.json({
      success: true,
      reference: payment.reference,
      invoice_url: payment.checkoutUrl,
    })
  } catch (error) {
    console.error('[GeniusPay] Erreur topup:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur.' }, { status: 500 })
  }
}
