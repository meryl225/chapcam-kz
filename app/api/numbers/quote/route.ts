import { NextResponse, type NextRequest } from 'next/server'
import { requireUserId, UnauthorizedError } from '@/lib/numbers/auth'
import { countryByCode, serviceBySlug, rentalPlanByKey } from '@/lib/numbers/catalog'
import { getBestQuote, getRentQuote } from '@/lib/numbers/providers'
import type { QuoteResponse } from '@/lib/numbers/types'

export async function GET(req: NextRequest) {
  try {
    await requireUserId()
    const { searchParams } = new URL(req.url)
    const country = countryByCode(searchParams.get('country') ?? '')
    const service = serviceBySlug(searchParams.get('service') ?? '')
    if (!country || !service) {
      return NextResponse.json({ error: 'Pays ou service inconnu' }, { status: 400 })
    }
    const plan = rentalPlanByKey(searchParams.get('plan') ?? 'verification') ?? rentalPlanByKey('verification')!
    const q = plan.mode === 'rental'
      ? await getRentQuote(country, service, plan.minHours)
      : await getBestQuote(country, service)
    const body: QuoteResponse = {
      available: q.available,
      priceXof: q.priceXof,
      cheapestProvider: q.best?.provider ?? null,
      providerCount: q.quotes.length,
      successRate: q.best?.successRate ?? null,
    }
    return NextResponse.json(body)
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.log('[v0] quote route error:', (e as Error)?.message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
