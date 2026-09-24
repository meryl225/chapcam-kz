import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { currencyForCountry } from '@/lib/currency-map'

// Detection du pays du visiteur pour proposer automatiquement sa devise.
// Utilise les en-tetes de geolocalisation injectes par Vercel (disponibles en
// production/preview). En local ils sont absents -> currency null, le client
// retombe alors sur une heuristique basee sur la langue du navigateur.
export const dynamic = 'force-dynamic'

export async function GET() {
  const h = await headers()
  const country =
    h.get('x-vercel-ip-country') ||
    h.get('cf-ipcountry') || // repli si derriere Cloudflare
    ''

  return NextResponse.json(
    { country, currency: currencyForCountry(country) },
    { headers: { 'Cache-Control': 'private, max-age=3600' } },
  )
}
