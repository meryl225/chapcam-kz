import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest, ADMIN_EMAIL } from '@/lib/admin-auth'
import { getPlan } from '@/lib/plans'
import { sendSubscriptionApprovedEmail } from '@/lib/email'

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
    for (let page = 1; page <= 10; page++) {
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
