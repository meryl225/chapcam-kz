import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest, ADMIN_EMAIL } from '@/lib/admin-auth'
import { getPlan } from '@/lib/plans'
import { sendSubscriptionApprovedEmail, sendSubscriptionRejectedEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function fmtDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// POST admin : approuver ou refuser une demande de paiement.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const id = String(body.id || '')
    const action = String(body.action || '')
    const reason = body.reason ? String(body.reason) : undefined

    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Requete invalide.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Recuperer la demande
    const { data: request, error: reqErr } = await admin
      .from('payment_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (reqErr || !request) {
      return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })
    }

    // Anti double-traitement : on ne traite qu'une demande "pending"
    if (request.status !== 'pending') {
      return NextResponse.json(
        { error: `Cette demande a deja ete traitee (${request.status}).` },
        { status: 409 },
      )
    }

    const plan = getPlan(request.plan)
    if (!plan) {
      return NextResponse.json({ error: 'Formule inconnue.' }, { status: 400 })
    }

    // ---------------------------------------------------------------
    // REFUS
    // ---------------------------------------------------------------
    if (action === 'reject') {
      const { error: updErr } = await admin
        .from('payment_requests')
        .update({ status: 'rejected', validated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'pending') // garde-fou concurrence

      if (updErr) {
        console.error('[action] Erreur refus:', updErr.message)
        return NextResponse.json({ error: 'Erreur lors du refus.' }, { status: 500 })
      }

      await admin.from('admin_logs').insert({
        action: 'reject',
        payment_request_id: id,
        admin_email: ADMIN_EMAIL,
        details: { plan: request.plan, reference: request.wave_transaction_reference, reason },
      })

      // Email de refus (best effort)
      sendSubscriptionRejectedEmail(request.email, request.full_name, plan.name, reason).catch(
        (e) => console.error('[action] Email refus echoue:', e),
      )

      return NextResponse.json({ success: true, message: 'Demande refusee.' })
    }

    // ---------------------------------------------------------------
    // APPROBATION
    // ---------------------------------------------------------------
    // Resoudre user_id si pas deja lie (par email)
    let userId: string | null = request.user_id
    if (!userId) {
      try {
        const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const match = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === String(request.email).toLowerCase(),
        )
        if (match) userId = match.id
      } catch (e) {
        console.warn('[action] Resolution user_id impossible:', e)
      }
    }

    const now = new Date()
    const end = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000)

    // Activer / mettre a jour l'abonnement (credit des points + dates)
    if (userId) {
      const { data: existing } = await admin
        .from('subscriptions')
        .select('id, points')
        .eq('user_id', userId)
        .maybeSingle()

      const subPayload = {
        user_id: userId,
        email: request.email,
        plan: plan.id,
        amount: plan.price,
        status: 'active',
        points: plan.points,
        max_points: plan.points,
        is_active: true,
        start_date: now.toISOString(),
        end_date: end.toISOString(),
        expires_at: end.toISOString(),
      }

      if (existing) {
        const { error: subErr } = await admin
          .from('subscriptions')
          .update(subPayload)
          .eq('id', existing.id)
        if (subErr) console.error('[action] Erreur update subscription:', subErr.message)
      } else {
        const { error: subErr } = await admin.from('subscriptions').insert(subPayload)
        if (subErr) console.error('[action] Erreur insert subscription:', subErr.message)
      }
    } else {
      console.warn(
        `[action] Aucun compte trouve pour ${request.email}. Demande approuvee mais abonnement non lie.`,
      )
    }

    // Marquer la demande approuvee
    const { error: updErr } = await admin
      .from('payment_requests')
      .update({ status: 'approved', validated_at: now.toISOString(), user_id: userId })
      .eq('id', id)
      .eq('status', 'pending')

    if (updErr) {
      console.error('[action] Erreur approbation:', updErr.message)
      return NextResponse.json({ error: 'Erreur lors de l\'approbation.' }, { status: 500 })
    }

    await admin.from('admin_logs').insert({
      action: 'approve',
      payment_request_id: id,
      admin_email: ADMIN_EMAIL,
      details: {
        plan: plan.id,
        amount: plan.price,
        points: plan.points,
        user_linked: !!userId,
        reference: request.wave_transaction_reference,
      },
    })

    // Email d'activation (best effort)
    sendSubscriptionApprovedEmail(
      request.email,
      request.full_name,
      plan.name,
      plan.price,
      plan.points,
      fmtDate(now),
      fmtDate(end),
    ).catch((e) => console.error('[action] Email approbation echoue:', e))

    return NextResponse.json({
      success: true,
      message: userId
        ? 'Abonnement active et email envoye.'
        : 'Demande approuvee, mais aucun compte ne correspond a cet email. L\'utilisateur doit creer un compte avec cet email.',
      userLinked: !!userId,
    })
  } catch (err: any) {
    console.error('[action] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
