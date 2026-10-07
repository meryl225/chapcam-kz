import { type NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { neon } from '@neondatabase/serverless'
import { del } from '@vercel/blob'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteVideo, isR2Configured } from '@/lib/r2'
import { deleteStream } from '@/lib/cloudflare-stream'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }
const REDACTED_EMAIL = 'compte-supprime@deleted.invalid'
const REDACTED_TEXT = 'Compte supprimé'

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`)
}

// Retention policy (privacy policy §5): personal data is deleted; records that
// must be kept for legal, accounting or tax reasons (payments, Jetons ledger,
// paid licenses/rentals) are kept but stripped of anything identifying.
export async function POST(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })
  }

  const body = await request.json().catch(() => ({}))
  if (body?.confirm !== true) {
    return NextResponse.json({ error: 'Confirmation requise' }, { status: 400, headers: NO_STORE })
  }

  const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error: authError } = await anon.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })
  }

  const userId = user.id
  const email = user.email?.trim() || null
  const tombstone = `deleted:${randomUUID()}`
  const step = { name: 'init' }

  try {
    const db = createAdminClient()
    const sql = neon(process.env.DATABASE_URL!)

    step.name = 'neon:media-lookup'
    const media = (await sql`
      SELECT blob_pathname, r2_key, stream_uid FROM video_history WHERE user_id = ${userId}
    `) as { blob_pathname: string | null; r2_key: string | null; stream_uid: string | null }[]

    step.name = 'neon:transaction'
    await sql.transaction([
      sql`DELETE FROM video_history WHERE user_id = ${userId}`,
      sql`DELETE FROM motion_jobs WHERE user_id = ${userId}`,
      sql`DELETE FROM chapverify_jobs WHERE user_id = ${userId}`,
      sql`DELETE FROM photo_video_log WHERE user_id = ${userId}`,
      sql`DELETE FROM jetons_wallets WHERE user_id = ${userId}`,
      sql`DELETE FROM motion_credits WHERE user_id = ${userId}`,
      sql`DELETE FROM photo_video_credits WHERE user_id = ${userId}`,
      sql`DELETE FROM translation_credits WHERE user_id = ${userId}`,
      sql`DELETE FROM voice_message_credits WHERE user_id = ${userId}`,
      sql`DELETE FROM numbers_messages WHERE user_id = ${userId}`,
      sql`DELETE FROM numbers_calls WHERE user_id = ${userId}`,
      sql`DELETE FROM numbers_wallets WHERE user_id = ${userId}`,
      sql`UPDATE jetons_ledger SET user_id = ${tombstone}, meta = NULL WHERE user_id = ${userId}`,
      sql`UPDATE tool_usage_events SET user_id = ${tombstone}, meta = NULL WHERE user_id = ${userId}`,
      sql`UPDATE numbers_wallet_tx SET user_id = ${tombstone} WHERE user_id = ${userId}`,
      sql`UPDATE numbers_activations SET user_id = ${tombstone}, code = NULL, full_sms = NULL WHERE user_id = ${userId}`,
      sql`UPDATE numbers_subscriptions SET user_id = ${tombstone}, label = NULL, auto_renew = false,
            status = CASE WHEN status IN ('active', 'past_due') THEN 'cancelled' ELSE status END,
            cancelled_at = COALESCE(cancelled_at, now()), updated_at = now()
          WHERE user_id = ${userId}`,
    ])

    const supabaseDeletes = [
      'subscriptions', 'voice_subscriptions', 'user_avatars', 'proxy_subscriptions', 'swap_sessions',
      'live_bonus_grants', 'live_access', 'user_activity', 'user_geo',
    ]
    for (const table of supabaseDeletes) {
      step.name = `supabase:delete:${table}`
      const { error } = await db.from(table).delete().eq('user_id', userId)
      if (error) throw error
    }

    step.name = 'supabase:delete:profiles'
    {
      const { error } = await db.from('profiles').delete().eq('id', userId)
      if (error) throw error
    }

    const anonymize: Array<[string, Record<string, unknown>]> = [
      ['payment_requests', { user_id: null, full_name: REDACTED_TEXT, email: REDACTED_EMAIL, phone_number: REDACTED_TEXT, comment: null }],
      ['installation_requests', { user_id: null, full_name: null, email: null, phone: REDACTED_TEXT, location: REDACTED_TEXT, note: null }],
      ['pc_licenses', { user_id: null, email: null, hardware_id: null }],
      ['decart_token_logs', { user_id: null, email: null }],
    ]
    for (const [table, values] of anonymize) {
      step.name = `supabase:anonymize:${table}`
      const { error } = await db.from(table).update(values).eq('user_id', userId)
      if (error) throw error
    }

    if (email) {
      const pattern = escapeLike(email)
      const byEmail: Array<[string, Record<string, unknown>]> = [
        ['payment_requests', { full_name: REDACTED_TEXT, email: REDACTED_EMAIL, phone_number: REDACTED_TEXT, comment: null }],
        ['installation_requests', { full_name: null, email: null, phone: REDACTED_TEXT, location: REDACTED_TEXT, note: null }],
        ['payment_logs', { email: null, raw: null }],
        ['processed_payments', { email: null }],
        ['pc_licenses', { email: null, hardware_id: null }],
        ['decart_token_logs', { email: null }],
      ]
      for (const [table, values] of byEmail) {
        step.name = `supabase:anonymize-email:${table}`
        const { error } = await db.from(table).update(values).ilike('email', pattern)
        if (error) throw error
      }
    }

    step.name = 'supabase:storage:avatars'
    {
      const { data: files, error } = await db.storage.from('avatars').list(userId, { limit: 1000 })
      if (error) throw error
      if (files?.length) {
        const { error: removeError } = await db.storage.from('avatars').remove(files.map((f) => `${userId}/${f.name}`))
        if (removeError) throw removeError
      }
    }

    step.name = 'supabase:auth:deleteUser'
    {
      const { error } = await db.auth.admin.deleteUser(userId)
      if (error) throw error
    }

    // The account no longer exists; media cleanup is best-effort and logged.
    const avatarPath = user.user_metadata?.avatar_path
    const avatarTasks: Promise<unknown>[] =
      typeof avatarPath === 'string' && avatarPath.startsWith(`avatars/${userId}/`) ? [del(avatarPath)] : []
    await Promise.allSettled(
      avatarTasks.concat(media.flatMap((m) => {
        const tasks: Promise<unknown>[] = []
        if (m.blob_pathname) tasks.push(del(m.blob_pathname))
        if (isR2Configured()) {
          for (const key of new Set([m.r2_key, m.blob_pathname].filter(Boolean) as string[])) {
            tasks.push(deleteVideo(key))
          }
        }
        if (m.stream_uid) tasks.push(deleteStream(m.stream_uid))
        return tasks
      })),
    ).then((results) => {
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed) console.error(`[mobile/account/delete] ${failed} fichier(s) média non supprimé(s)`)
    })

    return NextResponse.json({ deleted: true }, { headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : (error as { message?: string })?.message || String(error)
    console.error(`[mobile/account/delete] Échec à l'étape ${step.name}:`, message)
    return NextResponse.json(
      { error: `Suppression impossible (${step.name}) : ${message}` },
      { status: 500, headers: NO_STORE },
    )
  }
}
