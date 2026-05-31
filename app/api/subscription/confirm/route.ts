import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlan } from '@/lib/plans'
import { getLiveOffer } from '@/lib/live-offers'
import { getPaymentMethod } from '@/lib/payment-methods'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST : recoit la confirmation de paiement (multipart si capture).
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()

    const fullName = String(form.get('fullName') || '').trim()
    const email = String(form.get('email') || '').trim().toLowerCase()
    const phoneNumber = String(form.get('phoneNumber') || '').trim()
    const planId = String(form.get('plan') || '').trim()
    const methodId = String(form.get('paymentMethod') || 'wave').trim()
    const reference = String(form.get('reference') || '').trim()
    const paidAmountRaw = String(form.get('paidAmount') || '').trim()
    const paidAtRaw = String(form.get('paidAt') || '').trim()
    const comment = String(form.get('comment') || '').trim()
    const screenshot = form.get('screenshot') as File | null

    // --- Validation ---
    if (!fullName || fullName.length < 2) {
      return NextResponse.json({ error: 'Nom complet requis.' }, { status: 400 })
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 })
    }
    if (!phoneNumber || phoneNumber.length < 6) {
      return NextResponse.json({ error: 'Numero de telephone invalide.' }, { status: 400 })
    }
    // Le produit achete peut etre une formule classique OU l'offre Live Pro.
    const plan = getPlan(planId)
    const liveOffer = getLiveOffer(planId)
    const product = plan ?? liveOffer
    if (!product) {
      return NextResponse.json({ error: 'Formule invalide.' }, { status: 400 })
    }
    const method = getPaymentMethod(methodId)
    if (!method) {
      return NextResponse.json({ error: 'Mode de paiement invalide.' }, { status: 400 })
    }
    if (!reference || reference.length < 4) {
      return NextResponse.json(
        { error: 'Reference de transaction requise.' },
        { status: 400 },
      )
    }

    const paidAmount = Number.parseInt(paidAmountRaw, 10)
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      return NextResponse.json({ error: 'Montant paye invalide.' }, { status: 400 })
    }

    let paidAtIso: string | null = null
    if (paidAtRaw) {
      const d = new Date(paidAtRaw)
      if (!Number.isNaN(d.getTime())) paidAtIso = d.toISOString()
    }
    if (!paidAtIso) {
      return NextResponse.json({ error: 'Date et heure du paiement requises.' }, { status: 400 })
    }

    // Capture obligatoire pour les paiements manuels (Orange / MTN / Moov)
    const isManual = method.type === 'phone'
    if (isManual && (!screenshot || screenshot.size === 0)) {
      return NextResponse.json(
        { error: 'La capture d\'ecran est obligatoire pour ce mode de paiement.' },
        { status: 400 },
      )
    }

    const admin = createAdminClient()

    // --- Anti-reutilisation : la reference Wave doit etre unique ---
    const { data: existing } = await admin
      .from('payment_requests')
      .select('id, status')
      .eq('wave_transaction_reference', reference)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Cette reference de transaction a deja ete utilisee.' },
        { status: 409 },
      )
    }

    // --- Upload de la capture (optionnel) ---
    let screenshotUrl: string | null = null
    if (screenshot && screenshot.size > 0) {
      if (screenshot.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'La capture ne doit pas depasser 5 Mo.' },
          { status: 400 },
        )
      }
      const ext = (screenshot.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${Date.now()}-${reference.replace(/[^a-zA-Z0-9]/g, '')}.${ext}`
      const bytes = new Uint8Array(await screenshot.arrayBuffer())

      const { error: upErr } = await admin.storage
        .from('payment-receipts')
        .upload(path, bytes, { contentType: screenshot.type || 'image/jpeg', upsert: false })

      if (upErr) {
        console.error('[confirm] Erreur upload capture:', upErr.message)
        // On continue sans la capture plutot que de bloquer la demande
      } else {
        const { data: pub } = admin.storage.from('payment-receipts').getPublicUrl(path)
        screenshotUrl = pub.publicUrl
      }
    }

    // --- Resolution de l'utilisateur par email (best effort) ---
    let userId: string | null = null
    try {
      // listUsers ne filtre pas par email cote API, on parcourt la 1re page
      const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const match = usersData?.users?.find((u) => u.email?.toLowerCase() === email)
      if (match) userId = match.id
    } catch (e) {
      console.warn('[confirm] Resolution user_id impossible:', e)
    }

    // --- Insertion de la demande ---
    const { error: insErr } = await admin.from('payment_requests').insert({
      full_name: fullName,
      email,
      phone_number: phoneNumber,
      plan: product.id,
      amount: product.price,
      payment_method: method.id,
      paid_amount: paidAmount,
      paid_at: paidAtIso,
      comment: comment || null,
      wave_transaction_reference: reference,
      screenshot_url: screenshotUrl,
      status: 'pending',
      user_id: userId,
    })

    if (insErr) {
      // Conflit possible si la contrainte unique se declenche en concurrence
      if (insErr.code === '23505') {
        return NextResponse.json(
          { error: 'Cette reference de transaction a deja ete utilisee.' },
          { status: 409 },
        )
      }
      console.error('[confirm] Erreur insertion:', insErr.message)
      return NextResponse.json({ error: 'Erreur lors de l\'enregistrement.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message:
        'Demande envoyee ! Votre paiement est en attente de validation. Vous recevrez un email une fois votre abonnement active.',
    })
  } catch (err: any) {
    console.error('[confirm] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
