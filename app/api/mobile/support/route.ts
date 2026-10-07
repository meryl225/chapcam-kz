import { type NextRequest, NextResponse } from 'next/server'
import { createClient, type User } from '@supabase/supabase-js'
import { sendSupportRequestEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const MAX_MESSAGE = 4000

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
  const message = String(body?.message ?? '').trim()
  if (!message) {
    return NextResponse.json({ error: 'Décris ta demande avant d’envoyer.' }, { status: 400 })
  }
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: 'Ton message est trop long.' }, { status: 400 })
  }

  const name = String(user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0])
  const platform = body?.platform === 'android' ? 'Android' : 'iOS'

  const result = await sendSupportRequestEmail({ name, email: user.email, message, userId: user.id, platform })
  if (!result.success) {
    console.error('[support] Email non envoyé:', result.error)
    return NextResponse.json(
      { error: 'Le service client est momentanément indisponible. Réessaie plus tard.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ success: true })
}
