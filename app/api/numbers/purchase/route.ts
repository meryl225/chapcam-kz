import { NextResponse, type NextRequest } from 'next/server'
import { requireUserId, UnauthorizedError } from '@/lib/numbers/auth'
import { countryByCode, serviceBySlug, rentalPlanByKey } from '@/lib/numbers/catalog'
import { getBestQuote, purchaseCheapest, getRentQuote, rentCheapest, cancelFor } from '@/lib/numbers/providers'
import { adjustWallet, createActivation, getBalance } from '@/lib/numbers/db'
import { serializeActivation } from '@/lib/numbers/serialize'

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId()
    const body = (await req.json().catch(() => ({}))) as { country?: string; service?: string; plan?: string }
    const country = countryByCode(body.country ?? '')
    const service = serviceBySlug(body.service ?? '')
    if (!country || !service) {
      return NextResponse.json({ error: 'Pays ou service inconnu' }, { status: 400 })
    }
    // Forfait : par défaut "verification" (SMS unique). Sinon location.
    const plan = rentalPlanByKey(body.plan ?? 'verification') ?? rentalPlanByKey('verification')!
    const isRental = plan.mode === 'rental'

    // 1) Devis (prix client estimé) et vérification du solde avant tout achat.
    const balance = await getBalance(userId)
    const quote = isRental
      ? await getRentQuote(country, service, plan.minHours)
      : await getBestQuote(country, service)
    if (!quote.available || quote.priceXof == null) {
      return NextResponse.json(
        { error: isRental ? 'Location indisponible pour ce pays/service.' : 'Indisponible chez les fournisseurs actuellement.' },
        { status: 409 },
      )
    }
    if (balance < quote.priceXof) {
      return NextResponse.json(
        { error: 'Solde insuffisant', need: quote.priceXof, balanceXof: balance },
        { status: 402 },
      )
    }

    // 2) Achat/location chez le moins cher (bascule auto si échec).
    const outcome = isRental
      ? await rentCheapest(country, service, plan.minHours)
      : await purchaseCheapest(country, service)

    // 3) Si le prix réel dépasse le solde (cas rare), on annule et on rembourse côté fournisseur.
    if (outcome.priceXof > balance) {
      await cancelFor(outcome.result.provider, outcome.result.providerOrder).catch(() => {})
      return NextResponse.json(
        { error: 'Solde insuffisant', need: outcome.priceXof, balanceXof: balance },
        { status: 402 },
      )
    }

    // 4) Débit du portefeuille + enregistrement de l'activation.
    const newBalance = await adjustWallet(userId, -outcome.priceXof, {
      kind: 'purchase',
      method: 'wallet',
      reference: `${outcome.result.provider}:${outcome.result.providerOrder}`,
    })
    const row = await createActivation({
      userId,
      provider: outcome.result.provider,
      providerOrder: outcome.result.providerOrder,
      countryCode: country.code,
      serviceSlug: service.slug,
      serviceLabel: service.label,
      phoneE164: outcome.result.phone,
      priceXof: outcome.priceXof,
      costUsd: outcome.costUsd,
      expiresAt: outcome.result.expiresAt,
    })

    return NextResponse.json({ activation: serializeActivation(row), balanceXof: newBalance })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.log('[v0] purchase route error:', (e as Error)?.message)
    return NextResponse.json({ error: (e as Error)?.message || 'Achat impossible' }, { status: 500 })
  }
}
