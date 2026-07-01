import { NextResponse, type NextRequest } from 'next/server'
import { requireUserId, UnauthorizedError } from '@/lib/numbers/auth'
import { deleteActivation, getActivation, refundActivationOnce, updateActivation } from '@/lib/numbers/db'
import { cancelFor, finishFor, getCodeFor } from '@/lib/numbers/providers'
import { serializeActivation } from '@/lib/numbers/serialize'
import type { ProviderId } from '@/lib/numbers/providers/types'
import type { ActivationRow } from '@/lib/numbers/db'

async function refund(userId: string, row: ActivationRow) {
  // Idempotent : ne rembourse qu'une fois, même si le polling front et le cron
  // de réconciliation traitent la même activation.
  await refundActivationOnce(userId, row.provider, row.provider_order, Number(row.price_xof))
}

// Interroge le fournisseur et met à jour le statut / code de l'activation.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId()
    const { id } = await params
    const row = await getActivation(userId, Number(id))
    if (!row) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    if (row.status !== 'waiting') {
      return NextResponse.json({ activation: serializeActivation(row) })
    }

    const provider = row.provider as ProviderId
    const res = await getCodeFor(provider, row.provider_order)

    if (res.status === 'received') {
      const updated = await updateActivation(userId, row.id, {
        status: 'received',
        code: res.code ?? null,
        fullSms: res.fullSms ?? null,
      })
      await finishFor(provider, row.provider_order).catch(() => {})
      return NextResponse.json({ activation: serializeActivation(updated ?? row) })
    }

    // Expiration : aucun SMS reçu. On annule chez le fournisseur, on rembourse
    // le client, puis on SUPPRIME l'activation (aucune trace dans l'historique).
    const expired = row.expires_at ? new Date(row.expires_at).getTime() < Date.now() : false
    if (res.status === 'cancelled' || expired) {
      await cancelFor(provider, row.provider_order).catch(() => {})
      await refund(userId, row)
      await deleteActivation(userId, row.id)
      return NextResponse.json({ deleted: true, activation: null })
    }

    return NextResponse.json({ activation: serializeActivation(row) })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.log('[v0] activation GET error:', (e as Error)?.message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

// Annulation manuelle par l'utilisateur. Aucun code reçu -> remboursement puis
// SUPPRESSION de l'activation (le numéro ne doit pas apparaître dans l'historique).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId()
    const { id } = await params
    const row = await getActivation(userId, Number(id))
    if (!row) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    // Si un code a déjà été reçu, on ne supprime rien : l'activation reste dans
    // l'historique (numéro réellement utilisé).
    if (row.status !== 'waiting') {
      return NextResponse.json({ activation: serializeActivation(row) })
    }
    await cancelFor(row.provider as ProviderId, row.provider_order).catch(() => {})
    await refund(userId, row)
    await deleteActivation(userId, row.id)
    return NextResponse.json({ deleted: true, activation: null })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.log('[v0] activation DELETE error:', (e as Error)?.message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
