import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'
import { getDesktopDownloadUrl, getDesktopDownloadUrlMac } from '@/lib/pc-offer'
import { sendPcLicenseEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Laisse le temps d'envoyer a tous les clients (Vercel Pro: max 300s).
export const maxDuration = 300

function isValidEmail(email: string): boolean {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// POST - Renvoie a chaque detenteur d'une licence PC active sa cle + le
// nouveau lien de telechargement. Reserve a l'admin.
export async function POST() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('pc_licenses')
      .select('email, license_key, status')
      .eq('status', 'active')
      .not('email', 'is', null)

    if (error) {
      console.error('[admin/resend-download] Lecture echouee:', error.message)
      return NextResponse.json(
        { error: 'Erreur serveur (table pc_licenses absente ?).' },
        { status: 500 },
      )
    }

    const downloadUrl = getDesktopDownloadUrl()
    const macDownloadUrl = getDesktopDownloadUrlMac()

    // Deduplique par email (on garde une cle par client).
    const seen = new Set<string>()
    const recipients: { email: string; licenseKey: string }[] = []
    let skippedInvalid = 0

    for (const row of data || []) {
      const email = String(row.email || '').trim().toLowerCase()
      if (!email || seen.has(email)) continue
      if (!isValidEmail(email)) {
        skippedInvalid++
        continue
      }
      seen.add(email)
      recipients.push({ email, licenseKey: String(row.license_key || '') })
    }

    if (!recipients.length) {
      return NextResponse.json(
        { error: 'Aucun client avec licence active trouve.' },
        { status: 404 },
      )
    }

    let successCount = 0
    let errorCount = 0
    const errorSamples: { email: string; error: string }[] = []

    // Envoi sequentiel doux pour respecter les limites de Resend.
    for (const r of recipients) {
      const userName = r.email.split('@')[0]
      const result = await sendPcLicenseEmail(r.email, userName, r.licenseKey, downloadUrl, 0, macDownloadUrl)
      if (result?.success) {
        successCount++
      } else {
        errorCount++
        if (errorSamples.length < 20) {
          errorSamples.push({
            email: r.email,
            error: typeof result?.error === 'string' ? result.error : 'Envoi echoue',
          })
        }
      }
      // Petite pause pour ne pas saturer l'API d'envoi.
      await new Promise((resolve) => setTimeout(resolve, 120))
    }

    console.log(
      `[admin/resend-download] TERMINE - total: ${recipients.length}, succes: ${successCount}, erreurs: ${errorCount}`,
    )

    return NextResponse.json({
      success: true,
      message: `${successCount} email(s) envoye(s) sur ${recipients.length} client(s)${
        skippedInvalid > 0 ? ` (${skippedInvalid} email(s) invalide(s) ignore(s))` : ''
      }`,
      stats: {
        total: recipients.length,
        success: successCount,
        errors: errorCount,
        skippedInvalid,
      },
      errorSamples,
    })
  } catch (err: any) {
    console.error('[admin/resend-download] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
