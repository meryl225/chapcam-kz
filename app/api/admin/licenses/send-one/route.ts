import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'
import { getDesktopDownloadUrl, getDesktopDownloadUrlMac, PC_OFFER } from '@/lib/pc-offer'
import { createPcLicense } from '@/lib/pc-license'
import { resolveUserIdByEmail } from '@/lib/fulfillment'
import { sendPcLicenseEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isValidEmail(email: string): boolean {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// POST - Envoi MANUEL de l'email de confirmation ChapCam PC (cle de licence +
// lien de telechargement) a une seule adresse. Reserve a l'admin.
//
// Comportement :
//  - si une licence active existe deja pour cet email, on la reutilise ;
//  - sinon on en genere une nouvelle (table pc_licenses) ;
//  - puis on envoie le meme email que pour un vrai paiement.
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const rawEmail = String(body?.email || '').trim().toLowerCase()
    const fullName = String(body?.fullName || '').trim() || rawEmail.split('@')[0]
    const forceNew = body?.forceNew === true

    if (!isValidEmail(rawEmail)) {
      return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Cherche une licence active existante pour cet email.
    let licenseKey: string | null = null
    if (!forceNew) {
      const { data: existing } = await admin
        .from('pc_licenses')
        .select('license_key')
        .eq('email', rawEmail)
        .eq('status', 'active')
        .not('license_key', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (existing?.license_key) {
        licenseKey = String(existing.license_key)
      }
    }

    // Resout le compte ChapCam si l'email correspond a un utilisateur.
    const userId = await resolveUserIdByEmail(admin, rawEmail)

    let reused = true
    if (!licenseKey) {
      const created = await createPcLicense(admin, { userId, email: rawEmail })
      if (!created) {
        return NextResponse.json(
          { error: 'Generation de la cle de licence impossible.' },
          { status: 500 },
        )
      }
      licenseKey = created.key
      reused = false
    }

    const result = await sendPcLicenseEmail(
      rawEmail,
      fullName,
      licenseKey,
      getDesktopDownloadUrl(),
      PC_OFFER.price,
      getDesktopDownloadUrlMac(),
    )

    if (!result?.success) {
      return NextResponse.json(
        { error: typeof result?.error === 'string' ? result.error : "Echec de l'envoi de l'email." },
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      message: reused
        ? `Email envoye a ${rawEmail} (licence existante reutilisee).`
        : `Email envoye a ${rawEmail} (nouvelle licence generee).`,
      licenseKey,
      reused,
    })
  } catch (err: any) {
    console.error('[admin/licenses/send-one] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
