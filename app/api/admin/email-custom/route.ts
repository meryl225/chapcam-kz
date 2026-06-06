import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Laisse le temps d'envoyer tous les batches (Vercel: max 300s en Pro)
export const maxDuration = 300

// Validation stricte du format d'adresse email.
// Resend rejette TOUT un batch si une seule adresse est mal formee.
function isValidEmail(email: string): boolean {
  if (!email) return false
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

// Echappe le HTML pour empecher l'injection dans le template.
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured')
  }
  return new Resend(apiKey)
}

// Construit l'email avec le texte personnalise de l'admin, dans le template ChapCam.
function buildEmail(opts: {
  userName: string
  subject: string
  message: string
  ctaLabel?: string
  ctaUrl?: string
}) {
  // Convertit le texte brut en HTML : echappe + transforme les sauts de ligne en <br>.
  const safeMessage = escapeHtml(opts.message)
    .replace(/\{nom\}/gi, escapeHtml(opts.userName || 'cher client'))
    .replace(/\r\n|\r|\n/g, '<br>')

  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `
      <a href="${escapeHtml(opts.ctaUrl)}" style="display: inline-block; background: linear-gradient(90deg, #00ff88, #00d4ff); color: #000000; font-weight: bold; font-size: 16px; padding: 15px 40px; border-radius: 12px; text-decoration: none; margin-top: 10px;">
        ${escapeHtml(opts.ctaLabel)}
      </a>`
      : ''

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0e1a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #00ff88; font-size: 32px; margin: 0;">ChapCam</h1>
      <p style="color: #888; font-size: 14px; margin-top: 5px;">Face Swap en Temps Reel</p>
    </div>
    <div style="background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%); border: 1px solid rgba(0, 255, 136, 0.3); border-radius: 20px; padding: 30px;">
      <div style="color: #e6e6e6; font-size: 16px; line-height: 1.7;">
        ${safeMessage}
      </div>
      <div style="text-align: center;">
        ${cta}
      </div>
    </div>
    <div style="text-align: center; margin-top: 30px;">
      <p style="color: #666666; font-size: 12px;">
        Tu recois cet email car tu es inscrit sur ChapCam.<br>
        <a href="https://chapcam.com" style="color: #00ff88;">chapcam.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`
  return { subject: opts.subject, html }
}

// POST - Envoyer un email personnalise a tous les inscrits (admin only).
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const subject = String(body?.subject || '').trim()
    const message = String(body?.message || '').trim()
    const ctaLabel = String(body?.ctaLabel || '').trim()
    const ctaUrl = String(body?.ctaUrl || '').trim()
    // Cible des destinataires : 'all' (tous les inscrits) ou 'installers'
    // (uniquement ceux qui ont fait une demande d'installation).
    const audience = body?.audience === 'installers' ? 'installers' : 'all'

    if (!subject) {
      return NextResponse.json({ error: 'Le sujet est obligatoire.' }, { status: 400 })
    }
    if (!message) {
      return NextResponse.json({ error: 'Le message est obligatoire.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const allUsers: { email: string; name: string }[] = []
    let skippedInvalid = 0

    if (audience === 'installers') {
      // Destinataires = clients ayant une demande d'installation (emails uniques).
      const seen = new Set<string>()
      let from = 0
      const pageSize = 1000
      while (true) {
        const { data, error: insErr } = await admin
          .from('installation_requests')
          .select('email, full_name')
          .not('email', 'is', null)
          .range(from, from + pageSize - 1)
        if (insErr) {
          console.error('[Email Custom] Erreur lecture installation_requests:', insErr.message)
          return NextResponse.json(
            { error: "Impossible de recuperer les demandes d'installation" },
            { status: 500 },
          )
        }
        const rows = data ?? []
        for (const r of rows) {
          const email = String(r.email || '').trim().toLowerCase()
          if (!email || seen.has(email)) continue
          if (!isValidEmail(email)) {
            skippedInvalid++
            continue
          }
          seen.add(email)
          const name = (r.full_name as string) || email.split('@')[0]
          allUsers.push({ email, name })
        }
        if (rows.length < pageSize) break
        from += pageSize
      }
    } else {
      // Destinataires = TOUS les utilisateurs inscrits (service_role).
      let page = 1
      const perPage = 1000
      while (true) {
        const { data, error: listError } = await admin.auth.admin.listUsers({ page, perPage })
        if (listError) {
          console.error('[Email Custom] Erreur listUsers:', listError)
          return NextResponse.json({ error: 'Impossible de recuperer les utilisateurs' }, { status: 500 })
        }
        const batch = data?.users ?? []
        for (const u of batch) {
          if (!u.email) continue
          const email = u.email.trim().toLowerCase()
          if (!isValidEmail(email)) {
            skippedInvalid++
            continue
          }
          const name = (u.user_metadata?.name as string) || email.split('@')[0]
          allUsers.push({ email, name })
        }
        if (batch.length < perPage) break
        page++
      }
    }

    console.log(`[Email Custom] audience=${audience} - ${allUsers.length} adresses valides (${skippedInvalid} invalides ignorees)`)

    if (!allUsers.length) {
      return NextResponse.json({ error: 'Aucun destinataire valide trouve' }, { status: 404 })
    }

    let successCount = 0
    let errorCount = 0
    const errorSamples: { email: string; error: string }[] = []

    const resend = getResend()
    const batchSize = 100
    const totalBatches = Math.ceil(allUsers.length / batchSize)

    for (let i = 0; i < allUsers.length; i += batchSize) {
      const batchIndex = Math.floor(i / batchSize) + 1
      const batch = allUsers.slice(i, i + batchSize)

      const payload = batch
        .filter((u) => u.email)
        .map((user) => {
          const { subject: s, html } = buildEmail({
            userName: user.name || '',
            subject,
            message,
            ctaLabel: ctaLabel || undefined,
            ctaUrl: ctaUrl || undefined,
          })
          return {
            from: 'ChapCam <noreply@chapcam.com>',
            to: user.email,
            subject: s,
            html,
          }
        })

      try {
        const { data, error } = await resend.batch.send(payload)
        if (error) {
          errorCount += payload.length
          const msg = typeof error === 'string' ? error : error.message || JSON.stringify(error)
          console.error(`[Email Custom] Batch ${batchIndex}/${totalBatches} rejete:`, msg)
          if (errorSamples.length < 20) {
            errorSamples.push({ email: `batch ${batchIndex} (${payload.length} emails)`, error: msg })
          }
        } else {
          const accepted = data?.data?.length ?? 0
          successCount += accepted
          if (accepted < payload.length) errorCount += payload.length - accepted
        }
      } catch (err: any) {
        errorCount += payload.length
        const msg = err?.message || String(err)
        console.error(`[Email Custom] Exception batch ${batchIndex}/${totalBatches}:`, msg)
        if (errorSamples.length < 20) {
          errorSamples.push({ email: `batch ${batchIndex} (${payload.length} emails)`, error: msg })
        }
      }

      if (i + batchSize < allUsers.length) {
        await new Promise((resolve) => setTimeout(resolve, 350))
      }
    }

    console.log(`[Email Custom] TERMINE - total: ${allUsers.length}, succes: ${successCount}, erreurs: ${errorCount}`)

    return NextResponse.json({
      success: true,
      message: `${successCount} email(s) envoye(s) sur ${allUsers.length} adresse(s) valide(s)${
        skippedInvalid > 0 ? ` (${skippedInvalid} invalide(s) ignoree(s))` : ''
      }`,
      stats: {
        total: allUsers.length,
        success: successCount,
        errors: errorCount,
        skippedInvalid,
      },
      errorSamples,
    })
  } catch (error: any) {
    console.error('[Email Custom] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
