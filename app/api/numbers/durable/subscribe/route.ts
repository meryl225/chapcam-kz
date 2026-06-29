import { NextResponse, type NextRequest } from 'next/server'
import { requireUserId, UnauthorizedError } from '@/lib/numbers/auth'
import { searchAvailableNumbers, orderNumber, releaseNumber, isTelnyxConfigured } from '@/lib/numbers/telnyx/client'
import { getUsdToXof, tierPriceXof } from '@/lib/numbers/pricing'
import { adjustWallet, getBalance } from '@/lib/numbers/db'
import { createSubscription } from '@/lib/numbers/subscriptions'

/**
 * Souscrit à un NUMÉRO DURABLE (onoff) : achète le numéro chez Telnyx et ouvre
 * un abonnement mensuel payé via le portefeuille FCFA. Le prix est TOUJOURS
 * recalculé côté serveur (jamais celui envoyé par le client).
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId()
    if (!isTelnyxConfigured()) {
      return NextResponse.json({ error: 'Service de numéros durables non configuré.' }, { status: 503 })
    }
    const body = (await req.json().catch(() => ({}))) as {
      phoneNumber?: string
      country?: string
      label?: string
    }
    const phoneNumber = (body.phoneNumber || '').trim()
    const country = (body.country || '').toUpperCase()
    if (!phoneNumber || !country) {
      return NextResponse.json({ error: 'Numéro ou pays manquant.' }, { status: 400 })
    }

    // 1) Re-vérifier que le numéro est toujours disponible + obtenir son coût réel.
    const [available, usdToXof, balance] = await Promise.all([
      searchAvailableNumbers({ countryCode: country, limit: 30 }),
      getUsdToXof(),
      getBalance(userId),
    ])
    const match = available.find((n) => n.phoneNumber === phoneNumber)
    if (!match) {
      return NextResponse.json({ error: 'Ce numéro n’est plus disponible. Relancez une recherche.' }, { status: 409 })
    }
    const costUsd = match.monthlyCostUsd + match.upfrontCostUsd
    const monthlyPriceXof = tierPriceXof(costUsd, usdToXof)

    // 2) Vérifier le solde AVANT d'acheter.
    if (balance < monthlyPriceXof) {
      return NextResponse.json(
        { error: 'Solde insuffisant', need: monthlyPriceXof, balanceXof: balance },
        { status: 402 },
      )
    }

    // 3) Commander le numéro chez Telnyx.
    const ordered = await orderNumber(phoneNumber)

    // 4) Débiter le portefeuille. Si le débit échoue, libérer le numéro.
    let newBalance: number
    try {
      newBalance = await adjustWallet(userId, -monthlyPriceXof, {
        kind: 'purchase',
        method: 'wallet',
        reference: `telnyx-sub:${ordered.orderId}`,
      })
    } catch (e) {
      await releaseNumber(ordered.phoneNumberId, phoneNumber).catch(() => {})
      throw e
    }

    // 5) Créer l'abonnement. Si l'enregistrement échoue, rembourser + libérer.
    try {
      const sub = await createSubscription({
        userId,
        phoneE164: phoneNumber,
        providerNumberId: ordered.phoneNumberId,
        countryCode: country,
        capabilities: match.features.length ? match.features : ['sms', 'voice'],
        monthlyPriceXof,
        label: body.label?.slice(0, 60) || null,
      })
      return NextResponse.json({ subscription: sub, balanceXof: newBalance })
    } catch (e) {
      await adjustWallet(userId, monthlyPriceXof, {
        kind: 'refund',
        method: 'wallet',
        reference: `telnyx-sub:${ordered.orderId}`,
      }).catch(() => {})
      await releaseNumber(ordered.phoneNumberId, phoneNumber).catch(() => {})
      throw e
    }
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.log('[v0] durable subscribe error:', (e as Error)?.message)
    return NextResponse.json(
      { error: "Souscription impossible pour le moment. Si vous avez été débité, vous serez remboursé." },
      { status: 409 },
    )
  }
}
