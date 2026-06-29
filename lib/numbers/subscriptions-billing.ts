import 'server-only'
import { adjustWallet, getBalance } from '@/lib/numbers/db'
import { releaseNumber } from '@/lib/numbers/telnyx/client'
import {
  listDueSubscriptions,
  renewSubscription,
  setSubscriptionStatus,
  nextPeriodEnd,
  type SubscriptionRow,
} from '@/lib/numbers/subscriptions'

/**
 * Renouvellement mensuel des numéros durables (onoff).
 * Exécuté par le cron. Pour chaque abonnement arrivé à échéance :
 *  - auto_renew OFF  -> on libère le numéro et on l'expire.
 *  - solde suffisant -> débit + nouvelle période de 30 jours.
 *  - solde insuffisant -> `past_due`, période de grâce, puis expiration.
 */

// Délai de grâce après échéance impayée avant de libérer définitivement le numéro.
const GRACE_DAYS = 3

function pastDueTooLong(sub: SubscriptionRow): boolean {
  const end = new Date(sub.current_period_end).getTime()
  return Date.now() - end > GRACE_DAYS * 24 * 60 * 60 * 1000
}

async function expireAndRelease(sub: SubscriptionRow): Promise<void> {
  await releaseNumber(sub.provider_number_id, sub.phone_e164).catch((e) => {
    console.log('[v0] renew: release failed', sub.phone_e164, (e as Error)?.message)
  })
  await setSubscriptionStatus(sub.id, 'expired', { autoRenew: false })
}

export type RenewalSummary = {
  processed: number
  renewed: number
  pastDue: number
  expired: number
}

export async function processDueSubscriptions(limit = 200): Promise<RenewalSummary> {
  const due = await listDueSubscriptions(limit)
  const summary: RenewalSummary = { processed: due.length, renewed: 0, pastDue: 0, expired: 0 }

  for (const sub of due) {
    try {
      // Renouvellement désactivé : on libère à l'échéance.
      if (!sub.auto_renew) {
        await expireAndRelease(sub)
        summary.expired++
        continue
      }

      const balance = await getBalance(sub.user_id)
      if (balance >= sub.monthly_price_xof) {
        // Débit du loyer mensuel + nouvelle période.
        await adjustWallet(sub.user_id, -sub.monthly_price_xof, {
          kind: 'purchase',
          method: 'wallet',
          reference: `telnyx-renew:${sub.id}:${sub.current_period_end}`,
        })
        await renewSubscription(sub.id, nextPeriodEnd())
        summary.renewed++
      } else if (pastDueTooLong(sub)) {
        // Impayé au-delà de la grâce -> on libère.
        await expireAndRelease(sub)
        summary.expired++
      } else {
        // Solde insuffisant : on marque past_due (période de grâce en cours).
        await setSubscriptionStatus(sub.id, 'past_due')
        summary.pastDue++
      }
    } catch (e) {
      console.log('[v0] renew: error on sub', sub.id, (e as Error)?.message)
    }
  }

  return summary
}
