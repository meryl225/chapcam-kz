import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

export type UserReportKind = 'abuse' | 'support'
export type UserReportStatus = 'new' | 'handled'

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

export async function markReportEmailSent(id: string) {
  await db()`UPDATE user_reports SET email_sent = true WHERE id = ${id}`
}

export async function listUserReports(kind: UserReportKind | 'all', status: UserReportStatus | 'all'): Promise<UserReport[]> {
  await ensureTable()
  const rows = (await db()`
    SELECT * FROM user_reports
    WHERE (${kind} = 'all' OR kind = ${kind}) AND (${status} = 'all' OR status = ${status})
    ORDER BY created_at DESC
    LIMIT 200
  `) as UserReport[]
  return rows.map((row) => ({ ...row, id: String(row.id), created_at: new Date(row.created_at).toISOString() }))
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
