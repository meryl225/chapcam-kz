// Carte pays -> devise d'AFFICHAGE (indicative). Module SANS "use client" pour
// etre importable a la fois cote serveur (route /api/geo) et cote client
// (lib/currency-convert). Le debit reel reste toujours en XOF (FCFA).
//
// On ne mappe que vers des devises REELLEMENT proposees dans le selecteur
// (voir CURRENCIES dans lib/currency-convert). Un pays inconnu -> XOF (la devise
// de facturation), ce qui evite d'afficher une conversion trompeuse.

// UEMOA (zone franc Ouest) -> XOF
const XOF_COUNTRIES = ['BJ', 'BF', 'CI', 'GW', 'ML', 'NE', 'SN', 'TG']
// CEMAC (zone franc Centre) -> XAF
const XAF_COUNTRIES = ['CM', 'CF', 'TD', 'CG', 'GQ', 'GA']
// Zone euro (principaux pays)
const EUR_COUNTRIES = [
  'FR', 'DE', 'ES', 'IT', 'PT', 'NL', 'BE', 'IE', 'AT', 'FI', 'GR', 'LU',
  'SK', 'SI', 'EE', 'LV', 'LT', 'CY', 'MT', 'HR',
]
// Reste de l'Europe / anglophone utilisant le dollar comme reference pratique
const USD_COUNTRIES = ['US', 'EC', 'SV', 'PA']

const DIRECT: Record<string, string> = {
  NG: 'NGN', // Nigeria
  GH: 'GHS', // Ghana
  MA: 'MAD', // Maroc
  KE: 'KES', // Kenya
  ZA: 'ZAR', // Afrique du Sud
  GB: 'GBP', // Royaume-Uni
  CA: 'CAD', // Canada
}

/**
 * Retourne le code devise d'affichage pour un code pays ISO-3166 alpha-2.
 * Renvoie null si le pays est vide/inconnu (l'appelant retombe alors sur une
 * heuristique langue, puis XOF).
 */
export function currencyForCountry(country: string | null | undefined): string | null {
  if (!country) return null
  const cc = country.trim().toUpperCase()
  if (!cc) return null
  if (DIRECT[cc]) return DIRECT[cc]
  if (XOF_COUNTRIES.includes(cc)) return 'XOF'
  if (XAF_COUNTRIES.includes(cc)) return 'XAF'
  if (EUR_COUNTRIES.includes(cc)) return 'EUR'
  if (USD_COUNTRIES.includes(cc)) return 'USD'
  return null
}
