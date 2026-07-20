import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest, ADMIN_EMAIL } from '@/lib/admin-auth'
import { getPlan } from '@/lib/plans'
import { getLiveOffer } from '@/lib/live-offers'
import { grantLiveWindow } from '@/lib/live-access'
import { sendSubscriptionApprovedEmail, sendLiveAccessApprovedEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function fmtDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

async function resolveUserIdByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<string | null> {
  try {
    const target = email.trim().toLowerCase()
    // On parcourt TOUTES les pages jusqu'a epuisement. L'ancien plafond de 10
    // pages (10 000 users) laissait les comptes au-dela introuvables des que la
    // base a depasse 10 000 utilisateurs. Plafond de securite large (500 pages
    // = 500 000 users) pour eviter toute boucle infinie.
    for (let page = 1; page <= 500; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      const users = data?.users || []
      const match = users.find((u) => u.email?.toLowerCase() === target)
      if (match) return match.id
      if (users.length < 1000) break
    }
  } catch (e) {
    console.warn('[admin/subscriptions] Resolution user_id impossible:', e)
  }
  return null
}

// POST admin : activer manuellement un abonnement pour un email donne.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const email = String(body.email || '').trim().toLowerCase()
    const planId = String(body.plan || '').trim()
    const durationDaysRaw = body.durationDays
    const expiresAtRaw = body.expiresAt ? String(body.expiresAt) : ''

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
    }

    // L'offre Live Pro n'est PAS un abonnement a points : elle accorde une
    // fenetre d'acces de 15 min (table live_access). On la traite a part.
    const liveOffer = getLiveOffer(planId)
    if (liveOffer) {
      const adminLive = createAdminClient()
      const liveUserId = await resolveUserIdByEmail(adminLive, email)
      if (!liveUserId) {
        return NextResponse.json(
          {
            error: `Aucun compte ChapCam ne correspond a "${email}". L'utilisateur doit d'abord creer un compte avec cet email.`,
          },
          { status: 404 },
        )
      }

      // Nombre de fenetres a crediter (champ "duree" reutilise comme quantite).
      const qtyRaw = Number.parseInt(String(durationDaysRaw ?? '1'), 10)
      const windows = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1

      await grantLiveWindow(adminLive, liveUserId, windows)

      await adminLive.from('admin_logs').insert({
        action: 'manual_live_access',
        admin_email: ADMIN_EMAIL,
        details: { email, offer: liveOffer.id, windows },
      })

      sendLiveAccessApprovedEmail(
        email,
        email.split('@')[0],
        liveOffer.name,
        liveOffer.price,
        liveOffer.windowMinutes,
      ).catch((e) => console.error('[admin/subscriptions] Email Live echoue:', e))

      return NextResponse.json({
        success: true,
        message: `Acces ${liveOffer.name} credite pour ${email} (${windows} fenetre${windows > 1 ? 's' : ''} de ${liveOffer.windowMinutes} min).`,
      })
    }

    const plan = getPlan(planId)
    if (!plan) {
      return NextResponse.json({ error: 'Formule invalide.' }, { status: 400 })
    }

    // Determination de la date d'expiration :
    // 1) date explicite si fournie, sinon 2) duree en jours, sinon 3) duree du plan.
    const now = new Date()
    let end: Date
    if (expiresAtRaw) {
      const d = new Date(expiresAtRaw)
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Date d\'expiration invalide.' }, { status: 400 })
      }
      end = d
    } else {
      const days = Number.parseInt(String(durationDaysRaw ?? plan.durationDays), 10)
      const safeDays = Number.isFinite(days) && days > 0 ? days : plan.durationDays
      end = new Date(now.getTime() + safeDays * 24 * 60 * 60 * 1000)
    }

    const admin = createAdminClient()

    const userId = await resolveUserIdByEmail(admin, email)
    if (!userId) {
      return NextResponse.json(
        {
          error: `Aucun compte ChapCam ne correspond a "${email}". L'utilisateur doit d'abord creer un compte avec cet email.`,
        },
        { status: 404 },
      )
    }

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

    const { data: existing } = await admin
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      const { error } = await admin.from('subscriptions').update(subPayload).eq('id', existing.id)
      if (error) {
        console.error('[admin/subscriptions] Erreur update:', error.message)
        return NextResponse.json({ error: 'Erreur lors de l\'activation.' }, { status: 500 })
      }
    } else {
      const { error } = await admin.from('subscriptions').insert(subPayload)
      if (error) {
        console.error('[admin/subscriptions] Erreur insert:', error.message)
        return NextResponse.json({ error: 'Erreur lors de l\'activation.' }, { status: 500 })
      }
    }

    // Journalisation admin
    await admin.from('admin_logs').insert({
      action: 'manual_subscription',
      admin_email: ADMIN_EMAIL,
      details: {
        email,
        plan: plan.id,
        points: plan.points,
        start_date: now.toISOString(),
        end_date: end.toISOString(),
      },
    })

    // Email de confirmation (best effort)
    sendSubscriptionApprovedEmail(
      email,
      email.split('@')[0],
      plan.name,
      plan.price,
      plan.points,
      fmtDate(now),
      fmtDate(end),
    ).catch((e) => console.error('[admin/subscriptions] Email echoue:', e))

    return NextResponse.json({
      success: true,
      message: `Abonnement ${plan.name} active pour ${email} jusqu'au ${fmtDate(end)}.`,
    })
  } catch (err: any) {
    console.error('[admin/subscriptions] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

// DELETE admin : retirer / desactiver l'abonnement d'un utilisateur via son email.
export async function DELETE(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const email = String(body.email || '').trim().toLowerCase()

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const userId = await resolveUserIdByEmail(admin, email)
    if (!userId) {
      return NextResponse.json(
        { error: `Aucun compte ChapCam ne correspond a "${email}".` },
        { status: 404 },
      )
    }

    // On cible l'abonnement par user_id ET par email (au cas ou le user_id
    // n'aurait pas ete renseigne a la creation).
    const { data: subs } = await admin
      .from('subscriptions')
      .select('id')
      .or(`user_id.eq.${userId},email.eq.${email}`)

    if (!subs || subs.length === 0) {
      return NextResponse.json(
        { error: `Aucun abonnement trouve pour "${email}".` },
        { status: 404 },
      )
    }

    // Desactivation : on remet les points a zero et on marque l'abonnement
    // comme annule/expire pour couper immediatement l'acces.
    const now = new Date()
    const { error } = await admin
      .from('subscriptions')
      .update({
        status: 'cancelled',
        is_active: false,
        points: 0,
        end_date: now.toISOString(),
        expires_at: now.toISOString(),
      })
      .or(`user_id.eq.${userId},email.eq.${email}`)

    if (error) {
      console.error('[admin/subscriptions] Erreur suppression:', error.message)
      return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 })
    }

    await admin.from('admin_logs').insert({
      action: 'remove_subscription',
      admin_email: ADMIN_EMAIL,
      details: { email, removed_count: subs.length },
    })

    return NextResponse.json({
      success: true,
      message: `Abonnement retire pour ${email} (${subs.length} ligne${subs.length > 1 ? 's' : ''} desactivee${subs.length > 1 ? 's' : ''}).`,
    })
  } catch (err: any) {
    console.error('[admin/subscriptions] Exception DELETE:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

// PATCH admin : activer/desactiver MANUELLEMENT le retrait de watermark.
// Reserve au forfait Premium (50 000 F) : le sans-watermark n'est PAS
// automatique pour ce plan, l'admin l'accorde au cas par cas. Le drapeau est
// stocke dans user_metadata.no_watermark (aucune migration DB requise) et est
// lu cote serveur par /api/decart-token pour choisir la cle Decart.
export async function PATCH(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const email = String(body.email || '').trim().toLowerCase()
    const noWatermark = body.noWatermark === true

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const userId = await resolveUserIdByEmail(admin, email)
    if (!userId) {
      return NextResponse.json(
        { error: `Aucun compte ChapCam ne correspond a "${email}".` },
        { status: 404 },
      )
    }

    // Verifie que l'utilisateur a bien un abonnement Premium actif : le
    // sans-watermark manuel ne concerne que ce forfait (l'Ultimate est deja
    // automatique, les autres n'y ont pas droit).
    const { data: sub } = await admin
      .from('subscriptions')
      .select('plan, is_active, status, expires_at, end_date')
      .eq('user_id', userId)
      .maybeSingle()

    const planId = String(sub?.plan || '').toLowerCase()
    if (noWatermark && planId !== 'premium') {
      const hint =
        planId === 'ultimate'
          ? 'Le forfait Ultimate (85 000 F) est deja sans watermark automatiquement.'
          : 'Le retrait manuel du watermark est reserve au forfait Premium (50 000 F).'
      return NextResponse.json({ error: hint }, { status: 400 })
    }

    // Ecrit le drapeau dans les metadonnees utilisateur (fusion, non destructif).
    const { error } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { no_watermark: noWatermark },
    })
    if (error) {
      console.error('[admin/subscriptions] Erreur update metadata:', error.message)
      return NextResponse.json({ error: 'Erreur lors de la mise a jour.' }, { status: 500 })
    }

    await admin.from('admin_logs').insert({
      action: 'toggle_watermark',
      admin_email: ADMIN_EMAIL,
      details: { email, plan: planId, no_watermark: noWatermark },
    })

    return NextResponse.json({
      success: true,
      noWatermark,
      message: noWatermark
        ? `Sans watermark ACTIVE pour ${email} (Premium).`
        : `Sans watermark DESACTIVE pour ${email}.`,
    })
  } catch (err: any) {
    console.error('[admin/subscriptions] Exception PATCH:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
