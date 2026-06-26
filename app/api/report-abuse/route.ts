import { NextResponse } from 'next/server'
import { sendAbuseReportEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    }

    const name = String(body.name ?? '').trim()
    const email = String(body.email ?? '').trim()
    const reason = String(body.reason ?? '').trim()
    const description = String(body.description ?? '').trim()
    const contentUrl = String(body.contentUrl ?? '').trim()

    if (!name || !email || !reason || !description) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!emailOk) {
      return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 })
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      undefined

    const result = await sendAbuseReportEmail({
      name,
      email,
      reason,
      description,
      contentUrl: contentUrl || undefined,
      ip,
    })

    if (!result.success) {
      // On accepte tout de meme le signalement cote utilisateur si l'email
      // n'est pas configure, mais on journalise pour suivi.
      console.error('[report-abuse] Email non envoye:', result.error)
      return NextResponse.json(
        { error: 'Le service de signalement est momentanément indisponible. Réessayez plus tard.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[report-abuse] Exception:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
