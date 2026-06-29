import { NextResponse, type NextRequest } from 'next/server'
import { requireUserId, UnauthorizedError } from '@/lib/numbers/auth'
import { searchAvailableNumbers, isTelnyxConfigured } from '@/lib/numbers/telnyx/client'
import { getUsdToXof, tierPriceXof, PRICE_TIERS } from '@/lib/numbers/pricing'

/**
 * Recherche de NUMÉROS DURABLES (onoff) disponibles à l'abonnement.
 * Renvoie le prix mensuel client en FCFA (coût Telnyx × taux × marge).
 */
export async function GET(req: NextRequest) {
  try {
    await requireUserId()
    if (!isTelnyxConfigured()) {
      return NextResponse.json({ error: 'Service de numéros durables non configuré.' }, { status: 503 })
    }
    const { searchParams } = new URL(req.url)
    const country = (searchParams.get('country') || 'US').toUpperCase()
    const locality = searchParams.get('locality') || undefined

    const [numbers, usdToXof] = await Promise.all([
      searchAvailableNumbers({ countryCode: country, limit: 20, locality }),
      getUsdToXof(),
    ])

    const results = numbers.map((n) => {
      // Coût Telnyx = mensuel + éventuel coût initial réparti.
      const costUsd = n.monthlyCostUsd + n.upfrontCostUsd
      const monthlyPriceXof = tierPriceXof(costUsd, usdToXof)
      return {
        phoneNumber: n.phoneNumber,
        countryCode: n.countryCode,
        features: n.features,
        region: n.region ?? null,
        monthlyPriceXof,
      }
    })

    return NextResponse.json({ country, floorXof: PRICE_TIERS.floorXof, numbers: results })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.log('[v0] durable search error:', (e as Error)?.message)
    return NextResponse.json({ error: 'Recherche indisponible pour le moment.' }, { status: 502 })
  }
}
