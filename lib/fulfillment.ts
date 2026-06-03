// ============================================================
// Logique de "fulfillment" partagee : crediter un achat ChapCam.
// Utilisee par :
//   - l'approbation admin manuelle (app/api/admin/payments/action)
//   - le paiement automatique PayDunya (callback IPN + verification statut)
// Tout passe par la cle service_role (createAdminClient).
// ============================================================

import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { ADMIN_EMAIL } from '@/lib/admin-auth'
import { getPlan, type PlanConfig } from '@/lib/plans'
import { getLiveOffer, type LiveOffer } from '@/lib/live-offers'
import { getInstallOffer, type InstallOffer } from '@/lib/install-offer'
import { grantLiveWindow } from '@/lib/live-access'
import {
  sendSubscriptionApprovedEmail,
  sendLiveAccessApprovedEmail,
  sendInstallationPaidEmail,
} from '@/lib/email'

type Admin = ReturnType<typeof createAdminClient>

function fmtDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// Cherche un compte par email (insensible a la casse). Retourne l'id ou null.
export async function resolveUserIdByEmail(admin: Admin, email: string): Promise<string | null> {
  try {
    const target = email.trim().toLowerCase()
    for (let page = 1; page <= 10; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      const users = data?.users || []
      const match = users.find((u) => u.email?.toLowerCase() === target)
      if (match) return match.id
      if (users.length < 1000) break
    }
  } catch (e) {
    console.warn('[fulfillment] Resolution user_id impossible:', e)
  }
  return null
}

// Credite les points / active l'abonnement pour un user donne.
export async function activateSubscription(
  admin: Admin,
  userId: string,
  email: string,
  plan: { id: string; price: number; points: number; durationDays: number },
): Promise<{ now: Date; end: Date }> {
  const now = new Date()
  const end = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000)

  const { data: existing } = await admin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  const subPayload = {
    user_id: userId,
    email,
    plan: plan.id,
    amount: plan.price,
    status: 'active',
    points: plan.points,
    max_points: plan.points,
    is_active: true,
    start_date: now.toISOString(),
    end_date: end.toISOString(),
    expires_at: end.toISOString(),
  }

  if (existing) {
    const { error } = await admin.from('subscriptions').update(subPayload).eq('id', existing.id)
    if (error) console.error('[fulfillment] Erreur update subscription:', error.message)
  } else {
    const { error } = await admin.from('subscriptions').insert(subPayload)
    if (error) console.error('[fulfillment] Erreur insert subscription:', error.message)
  }

  return { now, end }
}

export interface PurchaseInput {
  productId: string // id de formule (plans.ts) OU id d'offre Live (live-offers.ts)
  email: string
  fullName: string
  userId?: string | null
}

export interface PurchaseResult {
  ok: boolean
  kind: 'plan' | 'live' | 'installation' | null
  userLinked: boolean
  message: string
}

// Cœur du crediting : determine le type de produit (formule a points OU offre
// Live Pro), credite le bon acces et envoie l'email correspondant.
// Si userId n'est pas fourni, on tente de le resoudre par email.
export async function creditPurchase(
  admin: Admin,
  input: PurchaseInput,
): Promise<PurchaseResult> {
  const plan: PlanConfig | undefined = getPlan(input.productId)
  const liveOffer: LiveOffer | undefined = getLiveOffer(input.productId)
  const installOffer: InstallOffer | undefined = getInstallOffer(input.productId)

  if (!plan && !liveOffer && !installOffer) {
    return { ok: false, kind: null, userLinked: false, message: `Produit inconnu : ${input.productId}` }
  }

  let userId = input.userId || null
  if (!userId) userId = await resolveUserIdByEmail(admin, input.email)

  if (!userId) {
    return {
      ok: false,
      kind: installOffer ? 'installation' : liveOffer ? 'live' : 'plan',
      userLinked: false,
      message: `Aucun compte ChapCam ne correspond a ${input.email}.`,
    }
  }

  const now = new Date()

  if (installOffer) {
    // Frais d'installation regles : on marque la (les) demande(s) d'installation
    // en attente de ce client comme "payees" pour que l'equipe puisse planifier.
    const { error: updErr } = await admin
      .from('installation_requests')
      .update({ paid: true, paid_at: now.toISOString() })
      .eq('user_id', userId)
      .eq('status', 'pending')
    if (updErr) {
      // Colonnes paid/paid_at peut-etre absentes : on n'echoue pas le credit.
      console.warn('[fulfillment] Maj installation_requests (paid) ignoree:', updErr.message)
    }
    sendInstallationPaidEmail(input.email, input.fullName, installOffer.price).catch((e) =>
      console.error('[fulfillment] Email installation echoue:', e),
    )
    return { ok: true, kind: 'installation', userLinked: true, message: "Frais d'installation regles." }
  }

  if (liveOffer) {
    await grantLiveWindow(admin, userId, 1)
    sendLiveAccessApprovedEmail(
      input.email,
      input.fullName,
      liveOffer.name,
      liveOffer.price,
      liveOffer.windowMinutes,
    ).catch((e) => console.error('[fulfillment] Email Live echoue:', e))
    return { ok: true, kind: 'live', userLinked: true, message: 'Acces Live Pro credite.' }
  }

  // Formule a points
  const { end } = await activateSubscription(admin, userId, input.email, plan!)
  sendSubscriptionApprovedEmail(
    input.email,
    input.fullName,
    plan!.name,
    plan!.price,
    plan!.points,
    fmtDate(now),
    fmtDate(end),
  ).catch((e) => console.error('[fulfillment] Email abonnement echoue:', e))

  return { ok: true, kind: 'plan', userLinked: true, message: 'Abonnement active.' }
}

// ------------------------------------------------------------
// PayDunya : verification autoritaire du statut d'une facture.
// On ne fait JAMAIS confiance au corps du callback : on reconfirme
// toujours aupres de PayDunya avec nos cles serveur.
// ------------------------------------------------------------

const PAYDUNYA_BASE_URL = 'https://app.paydunya.com/api/v1'

export interface PaydunyaConfirm {
  status: string // 'completed' | 'cancelled' | 'pending' | ...
  customData: Record<string, any>
  totalAmount: number
  token: string
  raw: any
}

export function paydunyaHeaders(): Record<string, string> | null {
  const masterKey = process.env.PAYDUNYA_MASTER_KEY
  const privateKey = process.env.PAYDUNYA_PRIVATE_KEY
  const token = process.env.PAYDUNYA_TOKEN
  if (!masterKey || !privateKey || !token) return null
  return {
    'Content-Type': 'application/json',
    'PAYDUNYA-MASTER-KEY': masterKey,
    'PAYDUNYA-PRIVATE-KEY': privateKey,
    'PAYDUNYA-TOKEN': token,
  }
}

// Interroge l'endpoint de confirmation PayDunya pour un token de facture.
export async function confirmPaydunyaInvoice(token: string): Promise<PaydunyaConfirm | null> {
  const headers = paydunyaHeaders()
  if (!headers) {
    console.error('[fulfillment] Cles PayDunya manquantes')
    return null
  }
  try {
    const res = await fetch(`${PAYDUNYA_BASE_URL}/checkout-invoice/confirm/${token}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    })
    const data = await res.json()
    // data.status reflete l'etat de la facture ; custom_data porte nos metadonnees.
    const status = String(data?.status || '').toLowerCase()
    const customData = data?.invoice?.custom_data || data?.custom_data || {}
    const totalAmount = Number(data?.invoice?.total_amount || 0)
    return { status, customData, totalAmount, token, raw: data }
  } catch (e) {
    console.error('[fulfillment] confirmPaydunyaInvoice echec:', e)
    return null
  }
}

// Verifie l'authenticite d'un IPN PayDunya via le hash SHA-512 de la Master Key.
// PayDunya joint a chaque IPN un champ "hash" = sha512(MASTER_KEY).
// Cette verification ne depend QUE de la Master Key (pas de la Private Key /
// Token), donc le credit automatique fonctionne meme si la paire
// Private Key + Token est mal configuree.
export function verifyPaydunyaHash(receivedHash: string | null | undefined): boolean {
  const masterKey = process.env.PAYDUNYA_MASTER_KEY
  if (!masterKey || !receivedHash) return false
  const expected = crypto.createHash('sha512').update(masterKey).digest('hex')
  // Comparaison a temps constant pour eviter les attaques temporelles.
  const a = Buffer.from(expected)
  const b = Buffer.from(String(receivedHash))
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// Cœur partage : credite une facture confirmee (peu importe la source de la
// confirmation : API PayDunya OU IPN verifie par hash). Idempotent.
async function fulfillConfirmedInvoice(params: {
  token: string
  status: string
  totalAmount: number
  customData: Record<string, any>
}): Promise<{
  status: 'completed' | 'pending' | 'cancelled' | 'error'
  alreadyDone: boolean
  result?: PurchaseResult
}> {
  const { token, status, totalAmount, customData } = params
  const admin = createAdminClient()

  // Retrouver la demande liee a ce token.
  const { data: reqRow } = await admin
    .from('payment_requests')
    .select('*')
    .eq('paydunya_token', token)
    .maybeSingle()

  if (status !== 'completed') {
    const mapped = status === 'cancelled' ? 'cancelled' : 'pending'
    return { status: mapped, alreadyDone: false }
  }

  // Idempotence : deja credite ?
  if (reqRow && reqRow.status === 'approved') {
    return { status: 'completed', alreadyDone: true }
  }

  // Metadonnees : priorite a la ligne en base, repli sur custom_data PayDunya.
  const cd = customData || {}
  const productId = String(reqRow?.plan || cd.product_id || cd.plan || '')
  const email = String(reqRow?.email || cd.email || cd.user_email || '')
  const fullName = String(reqRow?.full_name || cd.full_name || cd.user_name || 'Client ChapCam')
  const userId = (reqRow?.user_id as string | null) || (cd.user_id ? String(cd.user_id) : null)

  const result = await creditPurchase(admin, { productId, email, fullName, userId })

  // Marquer la demande approuvee (si elle existe).
  const now = new Date()
  if (reqRow) {
    await admin
      .from('payment_requests')
      .update({
        status: 'approved',
        validated_at: now.toISOString(),
        paid_amount: totalAmount || reqRow.amount,
        paid_at: now.toISOString(),
        user_id: userId,
      })
      .eq('id', reqRow.id)
      .neq('status', 'approved')

    await admin.from('admin_logs').insert({
      action: 'paydunya_approve',
      payment_request_id: reqRow.id,
      admin_email: ADMIN_EMAIL,
      details: {
        token,
        product: productId,
        amount: totalAmount,
        kind: result.kind,
        user_linked: result.userLinked,
        auto: true,
      },
    })
  }

  return { status: 'completed', alreadyDone: false, result }
}

// Credite directement a partir d'un IPN PayDunya deja verifie par hash.
// N'appelle PAS l'API de confirmation (donc independant de Private Key/Token).
export async function fulfillFromVerifiedIpn(payload: {
  token: string
  status: string
  totalAmount: number
  customData: Record<string, any>
}) {
  return fulfillConfirmedInvoice(payload)
}

// Confirme + credite une facture PayDunya de maniere idempotente.
// Appele par la route de statut (resilience si l'IPN n'arrive jamais) :
// reconfirme aupres de PayDunya avec nos cles serveur.
export async function confirmAndFulfillPaydunya(
  token: string,
): Promise<{ status: 'completed' | 'pending' | 'cancelled' | 'error'; alreadyDone: boolean; result?: PurchaseResult }> {
  const confirm = await confirmPaydunyaInvoice(token)
  if (!confirm) return { status: 'error', alreadyDone: false }

  return fulfillConfirmedInvoice({
    token,
    status: confirm.status,
    totalAmount: confirm.totalAmount,
    customData: confirm.customData,
  })
}

// ------------------------------------------------------------
// RECONCILIATION : filet de securite pour le mobile money.
// Beaucoup de clients paient puis ferment le navigateur sans revenir,
// et l'IPN PayDunya n'arrive pas toujours. On interroge donc PayDunya
// pour TOUTES les factures encore "pending" et on :
//   - credite automatiquement celles "completed" (paye -> credite),
//   - marque "cancelled" celles abandonnees (nettoie les doublons).
// Idempotent : peut tourner aussi souvent qu'on veut.
// ------------------------------------------------------------
export async function reconcilePendingPaydunya(opts?: { maxAgeDays?: number; limit?: number }) {
  const admin = createAdminClient()
  const maxAgeDays = opts?.maxAgeDays ?? 7
  const limit = opts?.limit ?? 200
  const since = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: rows, error } = await admin
    .from('payment_requests')
    .select('id, paydunya_token, created_at')
    .eq('payment_method', 'paydunya')
    .eq('status', 'pending')
    .not('paydunya_token', 'is', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[reconcile] Lecture pending echouee:', error.message)
    return { checked: 0, credited: 0, cancelled: 0, stillPending: 0, errors: 1 }
  }

  let credited = 0
  let cancelled = 0
  let stillPending = 0
  let errors = 0

  for (const row of rows || []) {
    const token = row.paydunya_token as string
    try {
      const r = await confirmAndFulfillPaydunya(token)
      if (r.status === 'completed') {
        credited++
      } else if (r.status === 'cancelled') {
        // Nettoyer : la facture a ete annulee/abandonnee cote PayDunya.
        await admin
          .from('payment_requests')
          .update({ status: 'cancelled' })
          .eq('id', row.id)
          .eq('status', 'pending')
        cancelled++
      } else if (r.status === 'error') {
        errors++
      } else {
        stillPending++
      }
    } catch (e) {
      console.error('[reconcile] Token', token, 'echec:', e)
      errors++
    }
  }

  return { checked: rows?.length || 0, credited, cancelled, stillPending, errors }
}
