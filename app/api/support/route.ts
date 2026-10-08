import { type NextRequest, NextResponse } from 'next/server'
import { sendPublicSupportEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const LIMITS = { name: 100, email: 254, subject: 150, message: 5000 }
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Anti-spam simple : 5 demandes par tranche de 10 minutes et par IP (par instance).
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5
const recentRequests = new Map<string, number[]>()

function isRateLimited(ip: string) {
  const now = Date.now()
  const hits = (recentRequests.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  if (hits.length >= MAX_PER_WINDOW) {
    recentRequests.set(ip, hits)
    return true
  }
  hits.push(now)
  recentRequests.set(ip, hits)
  return false
}

const clean = (value: unknown) => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim()
const singleLine = (value: string) => value.replace(/[\r\n]+/g, ' ')

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  // Champ piège invisible : un humain ne le remplit jamais.
  if (clean(body.website)) {
    return NextResponse.json({ success: true })
  }

  const name = singleLine(clean(body.name))
  const email = singleLine(clean(body.email)).toLowerCase()
  const subject = singleLine(clean(body.subject))
  const message = clean(body.message)

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: 'Merci de remplir tous les champs.' }, { status: 400 })
  }
  if (!EMAIL_PATTERN.test(email) || email.length > LIMITS.email) {
    return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 })
  }
  if (name.length > LIMITS.name || subject.length > LIMITS.subject || message.length > LIMITS.message) {
    return NextResponse.json({ error: 'Un des champs est trop long.' }, { status: 400 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Trop de demandes envoyées. Réessayez dans quelques minutes ou écrivez à contact@chapcam.com.' },
      { status: 429 },
    )
  }

  const result = await sendPublicSupportEmail({ name, email, subject, message })
  if (!result.success) {
    console.error('[support] Email non envoyé:', result.error)
    return NextResponse.json(
      { error: 'Envoi impossible pour le moment. Écrivez-nous directement à contact@chapcam.com.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ success: true })
}
