import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

export type UserReportKind = 'abuse' | 'support'
export type UserReportStatus = 'new' | 'handled'

export type EmailStatus = 'pending' | 'sent' | 'failed' | 'delivered' | 'bounced'

export type UserReport = {
  id: string
  kind: UserReportKind
  status: UserReportStatus
  user_id: string
  email: string
  name: string | null
  reason: string | null
  message: string
  creation_id: string | null
  creation_title: string | null
  content_url: string | null
  context: string | null
  platform: string | null
  email_sent: boolean
  email_status: EmailStatus
  email_message_id: string | null
  email_error: string | null
  created_at: string
  handled_at: string | null
}

export const ABUSE_REASONS = [
  'Contenu sexuel',
  'Violence',
  'Haine ou harcèlement',
  'Usurpation d’identité',
  'Escroquerie ou fraude',
  'Cybercriminalité',
  'Désinformation / deepfake trompeur',
  'Atteinte à la réputation ou à la vie privée',
  'Contenu intime non consenti',
  'Autre',
] as const

let client: NeonQueryFunction<false, false> | null = null
function db() {
  if (!client) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
    client = neon(process.env.DATABASE_URL)
  }
  return client
}

let tableReady = false
async function ensureTable() {
  if (tableReady) return
  const sql = db()
  await sql`
    CREATE TABLE IF NOT EXISTS user_reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      kind text NOT NULL CHECK (kind IN ('abuse', 'support')),
      status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'handled')),
      user_id text NOT NULL,
      email text NOT NULL,
      name text,
      reason text,
      message text NOT NULL,
      creation_id text,
      creation_title text,
      content_url text,
      context text,
      platform text,
      email_sent boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      handled_at timestamptz
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS user_reports_kind_status_created ON user_reports (kind, status, created_at DESC)`
  await sql`ALTER TABLE user_reports ADD COLUMN IF NOT EXISTS email_status text NOT NULL DEFAULT 'pending'`
  await sql`ALTER TABLE user_reports ADD COLUMN IF NOT EXISTS email_message_id text`
  await sql`ALTER TABLE user_reports ADD COLUMN IF NOT EXISTS email_error text`
  tableReady = true
}

export async function saveUserReport(input: {
  kind: UserReportKind
  userId: string
  email: string
  name?: string | null
  reason?: string | null
  message: string
  creationId?: string | null
  creationTitle?: string | null
  contentUrl?: string | null
  context?: string | null
  platform?: string | null
}): Promise<string> {
  await ensureTable()
  const rows = (await db()`
    INSERT INTO user_reports (kind, user_id, email, name, reason, message, creation_id, creation_title, content_url, context, platform)
    VALUES (
      ${input.kind}, ${input.userId}, ${input.email}, ${input.name ?? null}, ${input.reason ?? null}, ${input.message},
      ${input.creationId ?? null}, ${input.creationTitle ?? null}, ${input.contentUrl ?? null}, ${input.context ?? null}, ${input.platform ?? null}
    )
    RETURNING id
  `) as Array<{ id: string }>
  return String(rows[0].id)
}

export async function recordReportNotification(
  id: string,
  result: { success: boolean; id?: string | null; error?: unknown },
) {
  const error = result.success ? null : String((result.error as any)?.message ?? result.error ?? 'unknown').slice(0, 500)
  await db()`
    UPDATE user_reports
    SET email_sent = ${result.success},
        email_status = ${result.success ? 'sent' : 'failed'},
        email_message_id = ${result.id ?? null},
        email_error = ${error}
    WHERE id = ${id}
  `
}

const DELIVERED_EVENTS = new Set(['delivered', 'opened', 'clicks', 'uniqueOpened'])
const REJECTED_EVENTS = new Set(['softBounces', 'hardBounces', 'blocked', 'invalid', 'error', 'spam'])

// Brevo accepting a message is not delivery: the recipient server can still reject it later
// (e.g. Zoho "554 5.7.7 Email policy violation"). Brevo's per-message events give the real outcome.
async function fetchDeliveryOutcome(messageId: string) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return null
  const url = `https://api.brevo.com/v3/smtp/statistics/events?messageId=${encodeURIComponent(messageId)}&days=30&limit=50`
  const res = await fetch(url, { headers: { 'api-key': apiKey, accept: 'application/json' }, cache: 'no-store' })
  if (!res.ok) return null
  const { events = [] } = (await res.json()) as { events?: Array<{ email: string; event: string; reason?: string }> }

  const byRecipient = new Map<string, { delivered: boolean; rejected?: string }>()
  for (const e of events) {
    const entry = byRecipient.get(e.email) ?? { delivered: false }
    if (DELIVERED_EVENTS.has(e.event)) entry.delivered = true
    else if (REJECTED_EVENTS.has(e.event)) entry.rejected = `${e.event}${e.reason ? ` ${e.reason}` : ''}`
    byRecipient.set(e.email, entry)
  }
  if (byRecipient.size === 0) return null

  const delivered = [...byRecipient].filter(([, r]) => r.delivered).map(([email]) => email)
  const rejected = [...byRecipient].filter(([, r]) => !r.delivered && r.rejected).map(([email, r]) => `${email}: ${r.rejected}`)
  if (delivered.length === 0 && rejected.length === 0) return null

  const status: EmailStatus = delivered.length > 0 ? 'delivered' : 'bounced'
  const detail = [delivered.length ? `livré à ${delivered.join(', ')}` : '', ...rejected].filter(Boolean).join(' · ')
  return { status, detail: detail.slice(0, 500) }
}

async function refreshDeliveryStatuses(rows: UserReport[]) {
  const pending = rows.filter((r) => r.email_message_id && r.email_status === 'sent').slice(0, 20)
  await Promise.all(
    pending.map(async (row) => {
      const outcome = await fetchDeliveryOutcome(row.email_message_id!).catch(() => null)
      if (!outcome) return
      row.email_status = outcome.status
      row.email_error = outcome.detail
      await db()`UPDATE user_reports SET email_status = ${outcome.status}, email_error = ${outcome.detail} WHERE id = ${row.id}`.catch(
        (error) => console.error('[reports] Statut de livraison non enregistré:', row.id, error),
      )
    }),
  )
}

export async function listUserReports(kind: UserReportKind | 'all', status: UserReportStatus | 'all'): Promise<UserReport[]> {
  await ensureTable()
  const rows = (await db()`
    SELECT * FROM user_reports
    WHERE (${kind} = 'all' OR kind = ${kind}) AND (${status} = 'all' OR status = ${status})
    ORDER BY created_at DESC
    LIMIT 200
  `) as UserReport[]
  const reports = rows.map((row) => ({ ...row, id: String(row.id), created_at: new Date(row.created_at).toISOString() }))
  await refreshDeliveryStatuses(reports)
  return reports
}

export async function setUserReportStatus(id: string, status: UserReportStatus): Promise<boolean> {
  await ensureTable()
  const rows = (await db()`
    UPDATE user_reports
    SET status = ${status}, handled_at = ${status === 'handled' ? new Date().toISOString() : null}
    WHERE id = ${id}
    RETURNING id
  `) as Array<{ id: string }>
  return rows.length > 0
}
