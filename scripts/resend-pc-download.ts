// Script ponctuel : renvoie a chaque detenteur d'une licence PC active
// sa cle + le NOUVEAU lien de telechargement. Reutilise les vraies fonctions.
import { createClient } from '@supabase/supabase-js'
import { getDesktopDownloadUrl } from '../lib/pc-offer'
import { sendPcLicenseEmail } from '../lib/email'

const SUPABASE_URL = 'https://ojmzqokffbptmcktnwdy.supabase.co'

function isValidEmail(email: string): boolean {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function main() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante')

  const admin = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await admin
    .from('pc_licenses')
    .select('email, license_key, status')
    .eq('status', 'active')
    .not('email', 'is', null)

  if (error) throw new Error('Lecture pc_licenses echouee: ' + error.message)

  const downloadUrl = getDesktopDownloadUrl()
  console.log('[resend] Nouveau lien:', downloadUrl)

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

  console.log(`[resend] ${recipients.length} client(s) actif(s) a contacter (${skippedInvalid} ignore(s)).`)

  let successCount = 0
  let errorCount = 0

  for (const r of recipients) {
    const userName = r.email.split('@')[0]
    const result = await sendPcLicenseEmail(r.email, userName, r.licenseKey, downloadUrl, 0)
    if (result?.success) {
      successCount++
      console.log(`[resend] OK -> ${r.email}`)
    } else {
      errorCount++
      console.log(`[resend] ECHEC -> ${r.email}: ${result?.error}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  console.log(`\n[resend] TERMINE - total: ${recipients.length}, succes: ${successCount}, erreurs: ${errorCount}`)
}

main().catch((err) => {
  console.error('[resend] Exception:', err?.message || err)
  process.exit(1)
})
