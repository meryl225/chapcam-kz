import { NextResponse } from 'next/server'
import { APPLE_PRODUCTS, planForAppleProduct } from '@/lib/apple-iap'
import { LIVESWAP_MINUTES_OFFERING, LIVESWAP_MINUTE_PACKS, REVENUECAT_OFFERING, TOKEN_PACKS } from '@/lib/revenuecat'

// Contenu des 5 forfaits iOS (avantages, jetons, minutes). Les prix ne sont
// volontairement PAS renvoyes : sur iOS ils viennent uniquement de StoreKit.
// Les mentions de filigrane sont retirees : aucun forfait iOS n'en affiche.
const WATERMARK_PATTERN = /filigrane|logo chapcam/i

export async function GET() {
  const plans = APPLE_PRODUCTS.map(({ productId }) => {
    const plan = planForAppleProduct(productId)!
    return {
      productId,
      planId: plan.id,
      name: plan.name,
      jetons: plan.jetons,
      minutes: plan.minutes,
      bestOffer: plan.bestOffer,
      highlight: plan.highlight,
      features: plan.features.filter((f) => !WATERMARK_PATTERN.test(f)),
    }
  })
  return NextResponse.json({
    plans,
    tokenPacks: TOKEN_PACKS,
    offering: REVENUECAT_OFFERING,
    minutePacks: LIVESWAP_MINUTE_PACKS,
    minutesOffering: LIVESWAP_MINUTES_OFFERING,
  }, { headers: { 'Cache-Control': 'public, max-age=300' } })
}
