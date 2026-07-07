import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyDownloadToken } from '@/lib/download-token'
import { getDesktopDownloadUrl, getDesktopDownloadUrlMac } from '@/lib/pc-offer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Telechargement protege du logiciel ChapCam PC.
// Le lien reel (Google Drive / Blob) n'est JAMAIS envoye au navigateur : il est
// resolu ici, cote serveur, uniquement si le jeton signe est valide (non expire,
// non falsifie) ET si la licence associee est toujours active.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || ''
  const payload = verifyDownloadToken(token)

  if (!payload) {
    return NextResponse.json(
      { error: 'Lien de telechargement expire ou invalide. Revalide ta cle de licence pour obtenir un nouveau lien.' },
      { status: 403 },
    )
  }

  // Defense en profondeur : la licence doit encore etre active au moment precis
  // du telechargement (une revocation prend donc effet immediatement).
  try {
    const admin = createAdminClient()
    const { data: license, error } = await admin
      .from('pc_licenses')
      .select('status')
      .eq('license_key', payload.k)
      .maybeSingle()

    if (error) {
      console.error('[desktop/download] Lecture licence echouee:', error.message)
      return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
    }
    if (!license || license.status !== 'active') {
      return NextResponse.json(
        { error: 'Licence invalide ou revoquee.' },
        { status: 403 },
      )
    }
  } catch (err) {
    console.error('[desktop/download] Erreur:', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }

  const url = payload.p === 'mac' ? getDesktopDownloadUrlMac() : getDesktopDownloadUrl()
  if (!url) {
    return NextResponse.json(
      { error: 'Telechargement momentanement indisponible. Contacte le support sur chapcam.com.' },
      { status: 503 },
    )
  }

  // Redirection cote serveur vers le fichier reel. Le lien n'apparait jamais
  // dans le HTML/props/bundle : il n'est visible qu'a l'instant du clic, sur un
  // lien signe qui expire en 5 min.
  return NextResponse.redirect(url, 302)
}
