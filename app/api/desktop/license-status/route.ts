import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeLicenseKey } from '@/lib/pc-license'
import { createDownloadToken } from '@/lib/download-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Verification "lecture seule" d'une cle de licence depuis le web.
// Contrairement a /api/desktop/verify, cette route NE lie PAS le hardware_id :
// elle sert uniquement a debloquer le lien de telechargement pour un client qui
// possede deja une cle active. Corps attendu : { license_key: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const licenseKey = normalizeLicenseKey(body.license_key || body.licenseKey || '')

    if (!licenseKey) {
      return NextResponse.json(
        { valid: false, message: 'Entre ta cle de licence.' },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    const { data: license, error } = await admin
      .from('pc_licenses')
      .select('status')
      .eq('license_key', licenseKey)
      .maybeSingle()

    if (error) {
      console.error('[desktop/license-status] Lecture echouee:', error.message)
      return NextResponse.json({ valid: false, message: 'Erreur serveur.' }, { status: 500 })
    }
    if (!license) {
      return NextResponse.json(
        { valid: false, message: 'Cle de licence introuvable.' },
        { status: 404 },
      )
    }
    if (license.status !== 'active') {
      return NextResponse.json(
        { valid: false, message: 'Cette licence a ete revoquee. Contacte le support.' },
        { status: 403 },
      )
    }

    // On ne renvoie PAS le lien reel : on remet des liens signes vers
    // /api/desktop/download qui expirent en 5 min et sont lies a cette cle.
    // Le lien Drive/Blob reel n'est jamais expose au navigateur.
    return NextResponse.json({
      valid: true,
      message: 'Licence valide.',
      downloadUrl: `/api/desktop/download?token=${encodeURIComponent(createDownloadToken('win', licenseKey))}`,
      macDownloadUrl: `/api/desktop/download?token=${encodeURIComponent(createDownloadToken('mac', licenseKey))}`,
    })
  } catch (err) {
    console.error('[desktop/license-status] Erreur:', err)
    return NextResponse.json({ valid: false, message: 'Erreur serveur.' }, { status: 500 })
  }
}
