import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest, ADMIN_EMAIL } from '@/lib/admin-auth'
import { getPlan } from '@/lib/plans'
import { getLiveOffer } from '@/lib/live-offers'
import { grantLiveWindow } from '@/lib/live-access'
import {
  sendSubscriptionApprovedEmail,
  sendSubscriptionRejectedEmail,
  sendLiveAccessApprovedEmail,
} from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function fmtDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// Cherche un compte par email (insensible a la casse). Retourne l'id ou null.
async function resolveUserIdByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<string | null> {
  try {
    const target = email.trim().toLowerCase()
    // Pagination pour couvrir tous les comptes
    for (let page = 1; page <= 10; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      const users = data?.users || []
      const match = users.find((u) => u.email?.toLowerCase() === target)
      if (match) return match.id
      if (users.length < 1000) break // derniere page atteinte
    }
  } catch (e) {
    console.warn('[action] Resolution user_id impossible:', e)
  }
  return null
}

// Credite les points / active l'abonnement pour un user donne.
async function activateSubscription(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string,
  plan: { id: string; price: number; points: number; durationDays: number },
) {
  const now = new Date()
  const end = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000)

  const { data: existing } = await admin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  const subPayload = {
    user_id: userId,
    email,
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
    const { error } = await admin.from('subscriptions').update(subPayload).eq('id', existing.id)
    if (error) console.error('[action] Erreur update subscription:', error.message)
  } else {
    const { error } = await admin.from('subscriptions').insert(subPayload)
    if (error) console.error('[action] Erreur insert subscription:', error.message)
  }

  return { now, end }
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
    const newEmail = body.newEmail ? String(body.newEmail).trim() : undefined

    if (!id || !['approve', 'reject', 'relink'].includes(action)) {
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

    // Anti double-traitement pour approve/reject : on ne traite qu'une demande "pending".
    // 'relink' est autorise meme sur une demande deja approuvee (correction d'email).
    if (action !== 'relink' && request.status !== 'pending') {
      return NextResponse.json(
        { error: `Cette demande a deja ete traitee (${request.status}).` },
        { status: 409 },
      )
    }

    const plan = getPlan(request.plan)
    const liveOffer = getLiveOffer(request.plan)
    if (!plan && !liveOffer) {
      return NextResponse.json({ error: 'Formule inconnue.' }, { status: 400 })
    }

    // ---------------------------------------------------------------
    // RELINK : corriger l'email et crediter les points sur le bon compte
    // ---------------------------------------------------------------
    if (action === 'relink') {
      if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
      }

      const userId = await resolveUserIdByEmail(admin, newEmail)
      if (!userId) {
        return NextResponse.json(
          {
            error: `Aucun compte ne correspond a "${newEmail}". Verifiez l'orthographe ou demandez a l'utilisateur de creer un compte avec cet email.`,
          },
          { status: 404 },
        )
      }

      const now = new Date()

      if (liveOffer) {
        // Offre Live Pro : on accorde une fenetre de 15 min (pas de points).
        await grantLiveWindow(admin, userId, 1)
      } else {
        await activateSubscription(admin, userId, newEmail, plan!)
      }

      // Mettre a jour la demande : nouvel email, statut approuve, lien compte
      await admin
        .from('payment_requests')
        .update({
          email: newEmail,
          status: 'approved',
          validated_at: now.toISOString(),
          user_id: userId,
        })
        .eq('id', id)

      await admin.from('admin_logs').insert({
        action: 'relink',
        payment_request_id: id,
        admin_email: ADMIN_EMAIL,
        details: {
          old_email: request.email,
          new_email: newEmail,
          plan: request.plan,
          points: liveOffer ? 0 : plan!.points,
          live_offer: !!liveOffer,
        },
      })

      if (liveOffer) {
        sendLiveAccessApprovedEmail(
          newEmail,
          request.full_name,
          liveOffer.name,
          liveOffer.price,
          liveOffer.windowMinutes,
        ).catch((e) => console.error('[action] Email relink Live echoue:', e))
      } else {
        const end = new Date(now.getTime() + plan!.durationDays * 24 * 60 * 60 * 1000)
        sendSubscriptionApprovedEmail(
          newEmail,
          request.full_name,
          plan!.name,
          plan!.price,
          plan!.points,
          fmtDate(now),
          fmtDate(end),
        ).catch((e) => console.error('[action] Email relink echoue:', e))
      }

      return NextResponse.json({
        success: true,
        message: liveOffer
          ? `Acces Live credite sur ${newEmail} et email de confirmation envoye.`
          : `Points credites sur ${newEmail} et email de confirmation envoye.`,
      })
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
      const rejectedName = liveOffer ? liveOffer.name : plan!.name
      sendSubscriptionRejectedEmail(request.email, request.full_name, rejectedName, reason).catch(
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
      userId = await resolveUserIdByEmail(admin, String(request.email))
    }

    const now = new Date()

    // Activer : soit l'abonnement (points), soit l'acces Live (fenetre 15 min)
    if (userId) {
      if (liveOffer) {
        await grantLiveWindow(admin, userId, 1)
      } else {
        await activateSubscription(admin, userId, String(request.email), plan!)
      }
    } else {
      console.warn(
        `[action] Aucun compte trouve pour ${request.email}. Demande approuvee mais acces non lie.`,
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
        plan: request.plan,
        amount: liveOffer ? liveOffer.price : plan!.price,
        points: liveOffer ? 0 : plan!.points,
        live_offer: !!liveOffer,
        user_linked: !!userId,
        reference: request.wave_transaction_reference,
      },
    })

    // Email d'activation (best effort)
    if (liveOffer) {
      sendLiveAccessApprovedEmail(
        request.email,
        request.full_name,
        liveOffer.name,
        liveOffer.price,
        liveOffer.windowMinutes,
      ).catch((e) => console.error('[action] Email approbation Live echoue:', e))
    } else {
      const end = new Date(now.getTime() + plan!.durationDays * 24 * 60 * 60 * 1000)
      sendSubscriptionApprovedEmail(
        request.email,
        request.full_name,
        plan!.name,
        plan!.price,
        plan!.points,
        fmtDate(now),
        fmtDate(end),
      ).catch((e) => console.error('[action] Email approbation echoue:', e))
    }

    return NextResponse.json({
      success: true,
      message: userId
        ? liveOffer
          ? 'Acces Live active et email envoye.'
          : 'Abonnement active et email envoye.'
        : 'Demande approuvee, mais aucun compte ne correspond a cet email. L\'utilisateur doit creer un compte avec cet email.',
      userLinked: !!userId,
    })
  } catch (err: any) {
    console.error('[action] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
