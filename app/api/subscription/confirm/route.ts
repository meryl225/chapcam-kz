import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlan } from '@/lib/plans'

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
    const reference = String(form.get('reference') || '').trim()
    const screenshot = form.get('screenshot') as File | null

    // --- Validation ---
    if (!fullName || fullName.length < 2) {
      return NextResponse.json({ error: 'Nom complet requis.' }, { status: 400 })
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 })
    }
    if (!phoneNumber || phoneNumber.length < 6) {
      return NextResponse.json({ error: 'Numero Wave invalide.' }, { status: 400 })
    }
    const plan = getPlan(planId)
    if (!plan) {
      return NextResponse.json({ error: 'Formule invalide.' }, { status: 400 })
    }
    if (!reference || reference.length < 4) {
      return NextResponse.json(
        { error: 'Reference de transaction Wave requise.' },
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
      plan: plan.id,
      amount: plan.price,
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
