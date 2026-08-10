import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { estimateToolCostUsd, type ToolName } from './tool-costs'

export type { ToolName } from './tool-costs'

// ============================================================
// Journal de consommation par utilisateur et par outil IA (Neon).
// Chaque generation reussie (Studio Photo en Video, Motion, Traduction) ecrit
// une ligne ici : qui, quel outil, combien de credits, duree, cout $ estime.
// Cela permet a l'admin de voir la consommation par utilisateur et de rapprocher
// la facture fournisseur (HeyGen / fal.ai).
// C'est un journal PROSPECTIF : il n'enregistre que les generations posterieures
// a son deploiement (l'historique reste sur les dashboards fournisseurs).
// ============================================================

let _client: NeonQueryFunction<false, false> | null = null
function getClient(): NeonQueryFunction<false, false> {
  if (!_client) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    _client = neon(url)
  }
  return _client
}
const sql: NeonQueryFunction<false, false> = ((...args: unknown[]) =>
  // @ts-expect-error — relais transparent vers le client Neon (tagged template + appels).
  getClient()(...args)) as NeonQueryFunction<false, false>

// Cree la table + index si absents (idempotent, execute a la volee).
let _ensured = false
async function ensureTable(): Promise<void> {
  if (_ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS tool_usage_events (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      tool TEXT NOT NULL,
      credits INTEGER NOT NULL DEFAULT 1,
      duration_seconds NUMERIC,
      estimated_cost_usd NUMERIC NOT NULL DEFAULT 0,
      meta JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_tool_usage_user ON tool_usage_events (user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_tool_usage_created ON tool_usage_events (created_at)`
  _ensured = true
}

/**
 * Enregistre une generation. NON BLOQUANT : n'echoue jamais l'appelant (toute
 * erreur est journalisee mais avalee), pour ne pas casser une generation reussie.
 */
export async function logToolUsage(params: {
  userId: string
  tool: ToolName
  credits?: number
  durationSeconds?: number
  precision?: boolean
  meta?: Record<string, unknown>
}): Promise<void> {
  try {
    await ensureTable()
    const credits = params.credits ?? 1
    const costUsd = estimateToolCostUsd(params.tool, {
      durationSeconds: params.durationSeconds,
      precision: params.precision,
    })
    const duration = params.durationSeconds ?? null
    const meta = params.meta ? JSON.stringify(params.meta) : null
    await sql`
      INSERT INTO tool_usage_events
        (user_id, tool, credits, duration_seconds, estimated_cost_usd, meta)
      VALUES
        (${params.userId}, ${params.tool}, ${credits}, ${duration}, ${costUsd}, ${meta})
    `
  } catch (err) {
    console.error('[tool-usage] Echec journalisation (ignore):', err)
  }
}

export type ToolUsageRow = {
  user_id: string
  tool: ToolName
  generations: number
  credits: number
  cost_usd: number
  last_used: string
}

export type ToolUsageTotals = {
  tool: ToolName
  generations: number
  credits: number
  cost_usd: number
}

/**
 * Agrege la consommation par (utilisateur, outil) sur une periode donnee.
 * Retourne aussi les totaux par outil. Utilise cote admin uniquement.
 */
export async function getToolUsage(
  sinceIso: string,
  untilIso: string,
): Promise<{ rows: ToolUsageRow[]; totals: ToolUsageTotals[] }> {
  await ensureTable()
  const rows = (await sql`
    SELECT
      user_id,
      tool,
      COUNT(*)::int                      AS generations,
      COALESCE(SUM(credits), 0)::int     AS credits,
      COALESCE(SUM(estimated_cost_usd), 0)::float AS cost_usd,
      MAX(created_at)                    AS last_used
    FROM tool_usage_events
    WHERE created_at >= ${sinceIso} AND created_at < ${untilIso}
    GROUP BY user_id, tool
    ORDER BY cost_usd DESC
  `) as ToolUsageRow[]

  const totals = (await sql`
    SELECT
      tool,
      COUNT(*)::int                      AS generations,
      COALESCE(SUM(credits), 0)::int     AS credits,
      COALESCE(SUM(estimated_cost_usd), 0)::float AS cost_usd
    FROM tool_usage_events
    WHERE created_at >= ${sinceIso} AND created_at < ${untilIso}
    GROUP BY tool
  `) as ToolUsageTotals[]

  return { rows, totals }
}
