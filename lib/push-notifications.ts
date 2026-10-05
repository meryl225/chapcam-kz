import 'server-only'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const VIDEO_READY_TITLE = 'Ta vidéo ChapCam est prête ♾️'
export const VIDEO_READY_BODY = 'Appuie ici pour voir ta création.'

export function isExpoPushToken(token: unknown): token is string {
  return typeof token === 'string' && /^Expo(nent)?PushToken\[[^\]]{10,}\]$/.test(token)
}

type ExpoTicket = { status: 'ok' | 'error'; message?: string; details?: { error?: string } }

async function sendVideoReady(input: { generationId: string; userId: string; tool: string }): Promise<void> {
  // video_history.user_id is the Supabase auth user id; anything else cannot own a push token.
  if (!UUID_RE.test(input.userId)) return

  const admin = createAdminClient()

  // The primary key on generation_id is the dedup lock: only the first caller sends.
  const claim = await admin
    .from('generation_notifications')
    .insert({ generation_id: input.generationId, user_id: input.userId, tool: input.tool })
  if (claim.error) {
    if (claim.error.code !== '23505') console.error('[push] Reservation impossible:', claim.error.message)
    return
  }

  const { data: rows, error } = await admin.from('push_tokens').select('token').eq('user_id', input.userId)
  if (error) {
    console.error('[push] Lecture des tokens impossible:', error.message)
    return
  }
  const tokens = (rows ?? []).map((r) => r.token).filter(isExpoPushToken)
  if (tokens.length === 0) return

  const messages = tokens.map((to) => ({
    to,
    title: VIDEO_READY_TITLE,
    body: VIDEO_READY_BODY,
    sound: 'default',
    priority: 'high',
    data: { type: 'creation_ready', creationId: input.generationId },
  }))

  let tickets: ExpoTicket[] = []
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`Expo push HTTP ${res.status}`)
    tickets = ((await res.json()) as { data?: ExpoTicket[] }).data ?? []
  } catch (err) {
    // Release the lock so the next completion signal (poll, webhook, reconcile) can retry.
    await admin.from('generation_notifications').delete().eq('generation_id', input.generationId)
    console.error('[push] Envoi Expo echoue:', err)
    return
  }

  const stale = tickets
    .map((t, i) => (t.status === 'error' && t.details?.error === 'DeviceNotRegistered' ? tokens[i] : null))
    .filter((t): t is string => !!t)
  if (stale.length > 0) await admin.from('push_tokens').delete().in('token', stale)
}

/**
 * Schedules the "video ready" push after the current response so generation
 * routes are never slowed down or broken by a notification failure.
 */
export function notifyVideoReady(input: { generationId: string; userId: string; tool: string }): void {
  const task = () => sendVideoReady(input).catch((err) => console.error('[push] Notification echouee:', err))
  try {
    after(task)
  } catch {
    // Outside a request scope (scripts): run without blocking the caller.
    void task()
  }
}
