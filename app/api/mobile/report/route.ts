import { type NextRequest, NextResponse } from 'next/server'
import { createClient, type User } from '@supabase/supabase-js'
import { sendAbuseReportEmail } from '@/lib/email'
import { getVideoHistoryItem } from '@/lib/video-history'
import { ABUSE_REASONS, markReportEmailSent, saveUserReport } from '@/lib/user-reports'

export const dynamic = 'force-dynamic'

const MAX_DETAILS = 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const REASONS = new Set<string>(ABUSE_REASONS)

async function authenticate(request: NextRequest): Promise<User | null> {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await anon.auth.getUser(token)
  return error ? null : data.user
}

export async function POST(request: NextRequest) {
  const user = await authenticate(request)
  if (!user?.email) {
    return NextResponse.json({ error: 'Session expirée. Reconnecte-toi.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const reason = String(body?.reason ?? '').trim()
  const details = String(body?.details ?? '').trim()
  const rawCreationId = String(body?.creationId ?? '').trim()
  const contentUrl = String(body?.contentUrl ?? '').trim().slice(0, 2000)
  const context = String(body?.context ?? '').trim().slice(0, 200)
  const platform = body?.platform === 'android' ? 'Android' : 'iOS'

  if (!REASONS.has(reason)) {
    return NextResponse.json({ error: 'Choisis un motif de signalement.' }, { status: 400 })
  }
  if (!details) {
    return NextResponse.json({ error: 'Décris le problème avant d’envoyer.' }, { status: 400 })
  }
  if (details.length > MAX_DETAILS) {
    return NextResponse.json({ error: 'Ton message est trop long.' }, { status: 400 })
  }

  // Only a creation owned by the reporter can be attached, so the id stored is trustworthy.
  let creation: Awaited<ReturnType<typeof getVideoHistoryItem>> = null
  if (rawCreationId) {
    if (!UUID.test(rawCreationId) && !/^\d+$/.test(rawCreationId)) {
      return NextResponse.json({ error: 'Création introuvable.' }, { status: 400 })
    }
    creation = await getVideoHistoryItem(user.id, rawCreationId).catch(() => null)
    if (!creation) {
      return NextResponse.json({ error: 'Création introuvable.' }, { status: 404 })
    }
  }

  const name = String(user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0])

  let reportId: string
  try {
    reportId = await saveUserReport({
      kind: 'abuse',
      userId: user.id,
      email: user.email,
      name,
      reason,
      message: details,
      creationId: creation?.id ?? null,
      creationTitle: creation?.title ?? null,
      contentUrl: contentUrl || null,
      context: context || null,
      platform,
    })
  } catch (error) {
    console.error('[report] Enregistrement impossible:', error)
    return NextResponse.json({ error: 'Envoi impossible. Réessaie dans un instant.' }, { status: 503 })
  }

  const description = [
    details,
    '',
    `Signalé depuis l’app ${platform}${context ? ` · ${context}` : ''}`,
    `Utilisateur : ${user.id}`,
    creation ? `Création : ${creation.id}${creation.title ? ` (${creation.title})` : ''} · outil ${creation.tool}` : 'Création : —',
    `Signalement : ${reportId}`,
  ].join('\n')

  const mail = await sendAbuseReportEmail({ name, email: user.email, reason, description, contentUrl: contentUrl || undefined })
  if (mail.success) await markReportEmailSent(reportId).catch(() => {})
  else console.error('[report] Email non envoyé (signalement enregistré):', reportId, mail.error)

  return NextResponse.json({ success: true, id: reportId })
}
