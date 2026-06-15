import 'server-only'
import type { ActivationRow, TxRow } from './db'
import type { Activation, ActivationStatus, Tx } from './types'

export function serializeActivation(r: ActivationRow): Activation {
  return {
    id: Number(r.id),
    provider: r.provider,
    countryCode: r.country_code,
    serviceSlug: r.service_slug,
    serviceLabel: r.service_label,
    phone: r.phone_e164,
    priceXof: Number(r.price_xof),
    status: r.status as ActivationStatus,
    code: r.code,
    fullSms: r.full_sms,
    createdAt: new Date(r.created_at).getTime(),
    expiresAt: r.expires_at ? new Date(r.expires_at).getTime() : null,
  }
}

export function serializeTx(r: TxRow): Tx {
  return {
    id: Number(r.id),
    kind: r.kind,
    amountXof: Number(r.amount_xof),
    method: r.method,
    reference: r.reference,
    status: r.status,
    createdAt: new Date(r.created_at).getTime(),
  }
}
