import { headers } from 'next/headers'

// Localisation approximative fournie GRATUITEMENT par l'edge Vercel a chaque
// requete sur l'app deployee (aucune API externe, aucune IP brute stockee).
// En local/preview ces en-tetes peuvent etre absents -> tous les champs null.
export interface GeoInfo {
  country: string | null   // code ISO pays, ex. "FR", "CI", "SN"
  region: string | null    // region/etat
  city: string | null      // ville approximative
  latitude: number | null
  longitude: number | null
}

function decode(value: string | null): string | null {
  if (!value) return null
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export async function getRequestGeo(): Promise<GeoInfo> {
  const h = await headers()
  const lat = h.get('x-vercel-ip-latitude')
  const lon = h.get('x-vercel-ip-longitude')
  return {
    country: h.get('x-vercel-ip-country'),
    region: decode(h.get('x-vercel-ip-country-region')),
    city: decode(h.get('x-vercel-ip-city')),
    latitude: lat ? Number(lat) : null,
    longitude: lon ? Number(lon) : null,
  }
}
