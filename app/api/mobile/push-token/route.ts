import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { isExpoPushToken } from '@/lib/push-notifications'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

async function authenticate(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.auth.getUser(token)
  return error || !data.user ? null : data.user
}

async function readPushToken(request: NextRequest): Promise<string | null> {
  const body = (await request.json().catch(() => ({}))) as { token?: unknown }
  return isExpoPushToken(body.token) ? body.token : null
}

export async function POST(request: NextRequest) {
  const user = await authenticate(request)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })

  const pushToken = await readPushToken(request)
  if (!pushToken) return NextResponse.json({ error: 'Token invalide' }, { status: 400, headers: NO_STORE })

  // Token is the key: a device that switches account is reassigned to the new user.
  const { error } = await createAdminClient()
    .from('push_tokens')
    .upsert(
      { token: pushToken, user_id: user.id, platform: 'ios', updated_at: new Date().toISOString() },
      { onConflict: 'token' },
    )
  if (error) {
    console.error('[mobile/push-token] Enregistrement impossible:', error.message)
    return NextResponse.json({ error: 'Enregistrement impossible' }, { status: 500, headers: NO_STORE })
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE })
}

export async function DELETE(request: NextRequest) {
  const user = await authenticate(request)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })

  const pushToken = await readPushToken(request)
  if (!pushToken) return NextResponse.json({ error: 'Token invalide' }, { status: 400, headers: NO_STORE })

  await createAdminClient().from('push_tokens').delete().eq('token', pushToken).eq('user_id', user.id)
  return NextResponse.json({ ok: true }, { headers: NO_STORE })
}
