import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { isAdminRequest } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { grantLiveWindow } from '@/lib/live-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// ============================================================
// Campagne bonus "Live Pro" pour les premiers utilisateurs.
// Offre N fenetres de 15 min (pending_windows) a chaque personne
// ayant un paiement APPROUVE, une seule fois (table live_bonus_grants).
// GET  = apercu a blanc (ne credite rien)
// POST = execute (credite + envoie l'email)
// ============================================================

const CAMPAIGN = 'launch_live_pro'
const BONUS_WINDOWS = 4 // 4 x 15 min = 1h offerte

function isValidEmail(email: string): boolean {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY not configured')
  return new Resend(apiKey)
}

// Template email du cadeau Live Pro.
function getBonusEmail(userName: string) {
  const subject = 'Cadeau : 1h de Live Pro offerte sur ChapCam !'
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0e1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #00ff88; font-size: 32px; margin: 0;">ChapCam</h1>
      <p style="color: #888; font-size: 14px; margin-top: 5px;">Face Swap en Temps Reel</p>
    </div>
    <div style="background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%); border: 1px solid rgba(0, 255, 136, 0.3); border-radius: 20px; padding: 32px; text-align: center;">
      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 12px 0;">Merci d'avoir cru en nous des le debut</h2>
      <p style="color: #00ff88; font-size: 20px; font-weight: bold; margin: 0 0 20px 0;">1 heure de Live Pro offerte</p>
      <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Bonjour ${userName || 'a toi'},<br><br>
        Tu fais partie des tout premiers a avoir soutenu ChapCam. Pour te remercier,
        on t'offre <strong style="color:#ffffff;">4 sessions de Live Pro (15 min chacune, soit 1h au total)</strong> :
        le face swap en temps reel, sans payer.
      </p>
      <div style="background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.3); border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <p style="color: #ffffff; margin: 5px 0;">Deja credite sur ton compte</p>
        <p style="color: #ffffff; margin: 5px 0;">Chaque session dure 15 min des que tu la lances</p>
        <p style="color: #ffffff; margin: 5px 0;">Aucune action requise, c'est cadeau</p>
      </div>
      <a href="https://chapcam.com/live" style="display: inline-block; background: linear-gradient(90deg, #00ff88, #00d4ff); color: #000000; font-weight: bold; font-size: 16px; padding: 15px 40px; border-radius: 12px; text-decoration: none;">
        Lancer mon Live Pro
      </a>
    </div>
    <div style="text-align: center; margin-top: 30px;">
      <p style="color: #666666; font-size: 12px;">
        Tu recois cet email car tu fais partie des premiers utilisateurs de ChapCam.<br>
        <a href="https://chapcam.com" style="color: #00ff88;">chapcam.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`
  return { subject, html }
}

interface Beneficiary {
  userId: string
  email: string
  name: string
}

// Recupere les beneficiaires eligibles : paiements approuves avec user_id,
// dedupliques, qui n'ont PAS encore recu le bonus de cette campagne.
async function computeEligible(admin: ReturnType<typeof createAdminClient>) {
  // 1) Paiements approuves
  const { data: payments, error: payErr } = await admin
    .from('payment_requests')
    .select('user_id, email, created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: true })

  if (payErr) throw new Error(`Lecture payment_requests: ${payErr.message}`)

  let approvedRows = 0
  let missingUser = 0
  const byUser = new Map<string, { email: string }>()

  for (const p of payments ?? []) {
    approvedRows++
    if (!p.user_id) {
      missingUser++
      continue
    }
    // On garde la 1re occurrence (plus ancienne) par user.
    if (!byUser.has(p.user_id)) {
      byUser.set(p.user_id, { email: (p.email || '').trim().toLowerCase() })
    }
  }

  // 2) Bonus deja attribues pour cette campagne
  const { data: grants, error: grantErr } = await admin
    .from('live_bonus_grants')
    .select('user_id')
    .eq('campaign', CAMPAIGN)

  if (grantErr) throw new Error(`Lecture live_bonus_grants: ${grantErr.message}`)
  const alreadyGranted = new Set((grants ?? []).map((g) => g.user_id))

  // 3) Resolution des emails fiables via auth.users (fallback : email du paiement)
  const eligible: Beneficiary[] = []
  let already = 0
  for (const [userId, info] of byUser) {
    if (alreadyGranted.has(userId)) {
      already++
      continue
    }
    let email = info.email
    let name = ''
    try {
      const { data: u } = await admin.auth.admin.getUserById(userId)
      if (u?.user?.email) email = u.user.email.trim().toLowerCase()
      name = (u?.user?.user_metadata?.name as string) || ''
    } catch {
      // garde l'email du paiement
    }
    if (!name) name = email ? email.split('@')[0] : ''
    eligible.push({ userId, email, name })
  }

  return {
    stats: {
      approvedRows,
      uniqueUsers: byUser.size,
      missingUser,
      alreadyGranted: already,
      eligible: eligible.length,
    },
    eligible,
  }
}

// GET - apercu a blanc (ne modifie rien)
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 403 })
  }
  try {
    const admin = createAdminClient()
    const { stats } = await computeEligible(admin)
    return NextResponse.json({ success: true, preview: true, windows: BONUS_WINDOWS, stats })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST - execute : credite +BONUS_WINDOWS et envoie l'email
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const sendEmails = body?.sendEmails !== false // par defaut on envoie

    const admin = createAdminClient()
    const { stats, eligible } = await computeEligible(admin)

    if (eligible.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Aucun nouveau beneficiaire (tout le monde a deja recu le bonus).',
        stats: { ...stats, credited: 0, emailsSent: 0, emailsFailed: 0 },
      })
    }

    // 1) Crediter chaque beneficiaire (anti-double-credit via live_bonus_grants)
    let credited = 0
    const creditedBeneficiaries: Beneficiary[] = []
    const creditErrors: { userId: string; error: string }[] = []

    for (const b of eligible) {
      try {
        // Verrou logique : on insere d'abord la trace. Si elle existe deja
        // (course / re-run), l'insert echoue et on NE credite PAS une 2e fois.
        const { error: insErr } = await admin
          .from('live_bonus_grants')
          .insert({ user_id: b.userId, campaign: CAMPAIGN, windows: BONUS_WINDOWS, email: b.email })
        if (insErr) {
          // 23505 = doublon de cle primaire -> deja credite, on saute en silence.
          if ((insErr as any).code !== '23505') {
            creditErrors.push({ userId: b.userId, error: insErr.message })
          }
          continue
        }
        await grantLiveWindow(admin, b.userId, BONUS_WINDOWS)
        credited++
        creditedBeneficiaries.push(b)
      } catch (e: any) {
        creditErrors.push({ userId: b.userId, error: e?.message || String(e) })
      }
    }

    // 2) Envoyer les emails (batch Resend) uniquement aux credites
    let emailsSent = 0
    let emailsFailed = 0
    const emailErrors: { email: string; error: string }[] = []

    if (sendEmails && creditedBeneficiaries.length > 0) {
      const recipients = creditedBeneficiaries.filter((b) => isValidEmail(b.email))
      const resend = getResend()
      const batchSize = 100

      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize)
        const payload = batch.map((b) => {
          const { subject, html } = getBonusEmail(b.name)
          return { from: 'ChapCam <noreply@chapcam.com>', to: b.email, subject, html }
        })
        try {
          const { data, error } = await resend.batch.send(payload)
          if (error) {
            emailsFailed += payload.length
            const msg = typeof error === 'string' ? error : error.message || JSON.stringify(error)
            if (emailErrors.length < 20) emailErrors.push({ email: `batch (${payload.length})`, error: msg })
          } else {
            const accepted = data?.data?.length ?? 0
            emailsSent += accepted
            if (accepted < payload.length) emailsFailed += payload.length - accepted
          }
        } catch (err: any) {
          emailsFailed += payload.length
          if (emailErrors.length < 20) emailErrors.push({ email: `batch (${payload.length})`, error: err?.message || String(err) })
        }
        if (i + batchSize < recipients.length) await new Promise((r) => setTimeout(r, 350))
      }
    }

    return NextResponse.json({
      success: true,
      message: `${credited} utilisateur(s) credite(s) de ${BONUS_WINDOWS} fenetres Live Pro (1h).${
        sendEmails ? ` ${emailsSent} email(s) envoye(s).` : ' Emails non envoyes.'
      }`,
      stats: { ...stats, credited, emailsSent, emailsFailed },
      creditErrors: creditErrors.slice(0, 20),
      emailErrors,
    })
  } catch (e: any) {
    console.error('[live-bonus] Error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
