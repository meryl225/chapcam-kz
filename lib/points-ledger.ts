import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

export type LedgerKind =
  | 'subscription'
  | 'minutes'
  | 'topup'
  | 'admin_grant'
  | 'repair'

export interface CreditPointsInput {
  userId: string
  delta: number
  kind: LedgerKind
  source: string
  // Cle d'idempotence globale (token de paiement, transaction Apple/Google...).
  // Une meme reference ne peut etre creditee qu'une fois, tous comptes confondus.
  reference?: string | null
  actor?: string | null
  meta?: Record<string, unknown>
  // 'set' remplace le solde (forfait expire), 'add' ajoute au solde courant.
  mode?: 'add' | 'set'
}

export interface CreditPointsResult {
  applied: boolean
  balance: number
  ledgerId: number | null
}

const MISSING_FUNCTION_CODES = new Set(['PGRST202', '42883'])

// Credit atomique : la fonction SQL credit_points() verrouille la ligne,
// ecrit le mouvement dans points_ledger et met a jour le solde dans la meme
// transaction (voir scripts/2026-10-29-points-ledger.sql).
export async function creditPoints(admin: Admin, input: CreditPointsInput): Promise<CreditPointsResult> {
  if (!Number.isInteger(input.delta)) throw new Error(`creditPoints: delta non entier (${input.delta})`)

  const { data, error } = await admin.rpc('credit_points', {
    p_user_id: input.userId,
    p_delta: input.delta,
    p_kind: input.kind,
    p_source: input.source,
    p_reference: input.reference ?? null,
    p_actor: input.actor ?? null,
    p_meta: input.meta ?? {},
    p_mode: input.mode ?? 'add',
  })

  if (error && MISSING_FUNCTION_CODES.has(error.code ?? '')) {
    // Migration pas encore appliquee : on garde les paiements fonctionnels,
    // sans la garantie transactionnelle, et on le signale bruyamment.
    console.error('[points-ledger] credit_points() absente : appliquer scripts/2026-10-29-points-ledger.sql')
    return legacyCredit(admin, input)
  }
  if (error) throw new Error(`credit_points: ${error.message}`)

  const row = (Array.isArray(data) ? data[0] : data) as
    | { applied: boolean; balance: number; ledger_id: number | null }
    | undefined
  return {
    applied: Boolean(row?.applied),
    balance: Number(row?.balance ?? 0),
    ledgerId: row?.ledger_id ?? null,
  }
}

async function legacyCredit(admin: Admin, input: CreditPointsInput): Promise<CreditPointsResult> {
  const { data: sub, error } = await admin
    .from('subscriptions')
    .select('id, points, max_points')
    .eq('user_id', input.userId)
    .maybeSingle()
  if (error || !sub) throw new Error(`creditPoints (legacy): abonnement introuvable pour ${input.userId}`)

  const before = sub.points || 0
  const after = input.mode === 'set' ? input.delta : Math.max(before + input.delta, 0)
  const max =
    input.mode === 'set' ? after : Math.max((sub.max_points || 0) + Math.max(after - before, 0), after)
  const { error: updErr } = await admin
    .from('subscriptions')
    .update({ points: after, points_remaining: after, max_points: max, updated_at: new Date().toISOString() })
    .eq('id', sub.id)
  if (updErr) throw new Error(`creditPoints (legacy): ${updErr.message}`)
  return { applied: true, balance: after, ledgerId: null }
}
