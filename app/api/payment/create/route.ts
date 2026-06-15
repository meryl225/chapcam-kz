import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlan } from '@/lib/plans'
import { getLiveOffer } from '@/lib/live-offers'
import { getInstallOffer } from '@/lib/install-offer'
import { getPcOffer } from '@/lib/pc-offer'
import { getVoiceOffer } from '@/lib/voice-offers'
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

    // Determiner le produit : formule a points, offre Live Pro, frais
    // d'installation ou achat unique ChapCam PC.
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
    const kind: 'plan' | 'live' | 'installation' | 'pc' | 'voice' = plan
      ? 'plan'
      : liveOffer
        ? 'live'
        : installOffer
          ? 'installation'
          : pcOffer
            ? 'pc'
            : 'voice'
    const label = plan
      ? `Formule ${plan.name} (${plan.points} points, ${plan.duration})`
      : liveOffer
        ? `${liveOffer.name} (${liveOffer.windowMinutes} min d'acces Live)`
        : installOffer
          ? installOffer.name
          : pcOffer
            ? `${pcOffer.name} (licence a vie)`
            : `${voiceOffer!.name} (${voiceOffer!.minutes} min de voix)`

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

    // Appel a PayDunya avec timeout : on ne laisse jamais la requete pendre
    // indefiniment (sinon la fonction serverless time-out brutalement et le
    // client voit "Erreur serveur." sans explication).
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
      console.error('[PayDunya] Appel API injoignable:', netErr)
      return NextResponse.json(
        {
          success: false,
          error:
            "Le service de paiement est momentanement injoignable. Reessaie dans quelques instants.",
        },
        { status: 502 },
      )
    }

    // PayDunya doit renvoyer du JSON. En cas d'erreur (cle invalide, maintenance,
    // page HTML 5xx...), la reponse peut ne pas etre du JSON : on l'intercepte
    // proprement au lieu de planter sur response.json().
    let data: any = null
    try {
      data = JSON.parse(rawBody)
    } catch {
      console.error(
        `[PayDunya] Reponse non-JSON (HTTP ${response.status}):`,
        rawBody.slice(0, 500),
      )
      return NextResponse.json(
        {
          success: false,
          error:
            "Reponse inattendue du service de paiement. Verifie la configuration PayDunya (cles API) ou reessaie plus tard.",
        },
        { status: 502 },
      )
    }

    if (data.response_code !== '00' || !data.token) {
      // response_code 1001/1002 = cles invalides ; on log tout pour diagnostic.
      console.error(
        `[PayDunya] Creation facture echouee (HTTP ${response.status}, code ${data.response_code}):`,
        data,
      )
      return NextResponse.json(
        { success: false, error: data.response_text || 'Erreur lors de la creation de la facture.' },
        { status: 400 },
      )
    }

    // Enregistrer / mettre a jour une demande "pending" liee au token PayDunya.
    // ANTI-DOUBLON : si ce client a deja une demande "pending" PayDunya pour le
    // meme produit (il a clique plusieurs fois / abandonne sans payer), on
    // REUTILISE cette ligne en y mettant le nouveau token, au lieu d'en creer
    // une nouvelle. Resultat : une seule ligne par client + produit.
    try {
      const admin = createAdminClient()
      const row = {
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
      }

      const { data: existing } = await admin
        .from('payment_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan', productId)
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
