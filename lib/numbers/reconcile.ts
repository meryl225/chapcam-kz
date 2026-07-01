import 'server-only'
import { sql, refundActivationOnce, type ActivationRow } from '@/lib/numbers/db'
import { cancelFor, finishFor, getCodeFor } from '@/lib/numbers/providers'
import type { ProviderId } from '@/lib/numbers/providers/types'

export type ReconcileResult = {
  scanned: number
  received: number
  refunded: number
  stillWaiting: number
  errors: number
}

/**
 * Réconcilie en arrière-plan TOUTES les activations encore "waiting", pour tous
 * les utilisateurs — indépendamment du fait que le client ait gardé sa page
 * ouverte. Pour chacune :
 *   - SMS reçu chez le fournisseur  -> statut "received" + code enregistré.
 *   - Commande annulée/remboursée par le fournisseur OU expirée -> on annule
 *     côté fournisseur, on rembourse le client (idempotent) et on passe en "expired".
 *
 * C'est le filet de sécurité qui garantit qu'un numéro sans SMS finit toujours
 * par être remboursé automatiquement, même si l'utilisateur a quitté l'app.
 */
export async function reconcileWaitingActivations(limit = 200): Promise<ReconcileResult> {
  const res: ReconcileResult = { scanned: 0, received: 0, refunded: 0, stillWaiting: 0, errors: 0 }

  const rows = (await sql`
    SELECT * FROM numbers_activations
    WHERE status = 'waiting'
    ORDER BY created_at ASC
    LIMIT ${limit}
  `) as ActivationRow[]

  for (const row of rows) {
    res.scanned++
    const provider = row.provider as ProviderId
    try {
      const code = await getCodeFor(provider, row.provider_order)

      if (code.status === 'received') {
        await sql`
          UPDATE numbers_activations
          SET status = 'received',
              code = ${code.code ?? null},
              full_sms = ${code.fullSms ?? null},
              updated_at = now()
          WHERE id = ${row.id} AND status = 'waiting'
        `
        await finishFor(provider, row.provider_order).catch(() => {})
        res.received++
        continue
      }

      const expired = row.expires_at ? new Date(row.expires_at).getTime() < Date.now() : false
      if (code.status === 'cancelled' || expired) {
        await cancelFor(provider, row.provider_order).catch(() => {})
        const didRefund = await refundActivationOnce(
          row.user_id,
          row.provider,
          row.provider_order,
          Number(row.price_xof),
        )
        // Aucun SMS reçu -> on supprime l'activation pour ne laisser aucune
        // trace dans l'historique. Garde-fou `code IS NULL` : on ne supprime
        // jamais un numéro qui aurait reçu un code entre-temps.
        await sql`
          DELETE FROM numbers_activations
          WHERE id = ${row.id} AND status = 'waiting' AND code IS NULL
        `
        if (didRefund) res.refunded++
        continue
      }

      res.stillWaiting++
    } catch (e) {
      res.errors++
      console.log(`[v0] reconcile activation ${row.id} (${provider}:${row.provider_order}) failed:`, (e as Error)?.message)
    }
  }

  return res
}
