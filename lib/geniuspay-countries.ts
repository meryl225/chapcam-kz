// ============================================================
// Structure de donnees des paiements GeniusPay par pays.
//   pays (ISO2) -> devise -> methodes disponibles -> token GeniusPay
//
// C'est la SOURCE DE VERITE unique cote client ET serveur. Pour ajouter /
// retirer un pays ou une methode plus tard, il suffit de modifier ce fichier :
// l'UI (selecteur de pays) et la route de creation s'y adaptent automatiquement.
//
// Champ `gp` = token `payment_method` envoye a l'API GeniusPay.
//   - Une valeur (ex. 'orange_money') : token verifie comme ACCEPTE par l'API,
//     qui renvoie une page de checkout hebergee.
//   - null : l'API ne connait pas de token dedie pour cette methode (elle
//     renvoie une 422 si on le force). On ouvre alors la checkout hebergee
//     GENERIQUE, pre-hintee par le pays (customer.country), ou l'utilisateur
//     choisit son operateur. => aucun echec possible.
//
// Filet de securite supplementaire cote serveur (lib/geniuspay.ts) : si l'appel
// avec un token echoue malgre tout, on rejoue SANS token (checkout generique).
// Le paiement ne peut donc jamais etre bloque par un mapping imparfait.
//
// NB : le montant est TOUJOURS envoye en XOF (choix produit) ; GeniusPay
// convertit automatiquement vers la devise locale du payeur. La `currency` ci-
// dessous est indicative (affichage / evolutions futures).
// ============================================================

export interface GeniusPayMethod {
  /** Identifiant interne stable (utilise dans l'URL / metadata). */
  id: string
  /** Libelle affiche a l'utilisateur. */
  label: string
  /** Token `payment_method` GeniusPay, ou null pour checkout generique. */
  gp: string | null
}

export interface GeniusPayCountry {
  /** Code ISO 3166-1 alpha-2 (envoye comme customer.country). */
  code: string
  /** Nom affiche. */
  name: string
  /** Drapeau (emoji). */
  flag: string
  /** Devise locale (indicative). */
  currency: string
  /** Methodes de paiement disponibles pour ce pays. */
  methods: GeniusPayMethod[]
}

// --- Presets de methodes (reutilisables) ---------------------------------
// Tokens ACCEPTES par l'API (verifies empiriquement) : renvoient une checkout.
const ORANGE: GeniusPayMethod = { id: 'orange_money', label: 'Orange Money', gp: 'orange_money' }
const WAVE: GeniusPayMethod = { id: 'wave', label: 'Wave', gp: 'wave' }
const MTN: GeniusPayMethod = { id: 'mtn_money', label: 'MTN Mobile Money', gp: 'mtn_money' }
const MOOV: GeniusPayMethod = { id: 'moov_money', label: 'Moov Money', gp: 'moov_money' }
const VISA: GeniusPayMethod = { id: 'visa', label: 'Visa', gp: 'card' }
const MASTERCARD: GeniusPayMethod = { id: 'mastercard', label: 'Mastercard', gp: 'card' }

// Methodes sans token dedie cote API => checkout generique (gp: null).
const FREE_MONEY: GeniusPayMethod = { id: 'free_money', label: 'Free Money', gp: null }
const MOBICASH: GeniusPayMethod = { id: 'mobicash', label: 'Mobicash', gp: null }
const AIRTEL: GeniusPayMethod = { id: 'airtel_money', label: 'Airtel Money', gp: null }
const MPESA: GeniusPayMethod = { id: 'mpesa', label: 'M-Pesa', gp: null }
const VODACOM: GeniusPayMethod = { id: 'vodacom', label: 'Vodacom', gp: null }
const VODAFONE: GeniusPayMethod = { id: 'vodafone_cash', label: 'Vodafone Cash', gp: null }
const TIGO: GeniusPayMethod = { id: 'tigo_pesa', label: 'Tigo Pesa', gp: null }
const ZAMTEL: GeniusPayMethod = { id: 'zamtel', label: 'Zamtel', gp: null }
const MPESA_VODACOM: GeniusPayMethod = { id: 'mpesa_vodacom', label: 'M-Pesa (Vodacom)', gp: null }

// --- Liste des pays -------------------------------------------------------
// NB : Cote d'Ivoire, Benin et Togo NE figurent PAS ici : leurs paiements
// existants (PayDunya) restent inchanges, comme demande.
export const GENIUSPAY_COUNTRIES: GeniusPayCountry[] = [
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳', currency: 'XOF', methods: [FREE_MONEY, ORANGE, WAVE, VISA, MASTERCARD] },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', currency: 'XOF', methods: [ORANGE, WAVE, MOOV, MOBICASH, VISA, MASTERCARD] },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', currency: 'XOF', methods: [ORANGE, MOBICASH, VISA, MASTERCARD] },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲', currency: 'XAF', methods: [MTN, ORANGE, VISA, MASTERCARD] },
  { code: 'CG', name: 'République du Congo', flag: '🇨🇬', currency: 'XAF', methods: [AIRTEL, MTN, ORANGE, MPESA, VISA, MASTERCARD] },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦', currency: 'XAF', methods: [AIRTEL] },
  { code: 'CD', name: 'RD Congo', flag: '🇨🇩', currency: 'CDF', methods: [AIRTEL, ORANGE, VODACOM] },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES', methods: [MPESA] },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', currency: 'RWF', methods: [AIRTEL, MTN] },
  { code: 'UG', name: 'Ouganda', flag: '🇺🇬', currency: 'UGX', methods: [AIRTEL, MTN] },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', currency: 'SLE', methods: [ORANGE] },
  { code: 'GN', name: 'Guinée', flag: '🇬🇳', currency: 'GNF', methods: [ORANGE, VISA, MASTERCARD] },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', currency: 'XOF', methods: [AIRTEL] },
  { code: 'GW', name: 'Guinée-Bissau', flag: '🇬🇼', currency: 'XOF', methods: [ORANGE, VISA, MASTERCARD] },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', currency: 'GHS', methods: [MTN, VODAFONE, VISA, MASTERCARD] },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN', methods: [MTN, VISA, MASTERCARD] },
  { code: 'ZM', name: 'Zambie', flag: '🇿🇲', currency: 'ZMW', methods: [MTN, ZAMTEL] },
  { code: 'TZ', name: 'Tanzanie', flag: '🇹🇿', currency: 'TZS', methods: [MPESA, AIRTEL, TIGO] },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼', currency: 'MWK', methods: [AIRTEL] },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿', currency: 'MZN', methods: [MPESA_VODACOM] },
]

// --- Helpers (utilises par la route serveur) ------------------------------
export function getGeniusPayCountry(code: string | null | undefined): GeniusPayCountry | null {
  if (!code) return null
  const c = code.trim().toUpperCase()
  return GENIUSPAY_COUNTRIES.find((x) => x.code === c) || null
}

/**
 * Resout (pays, methode) -> token GeniusPay a envoyer.
 * Retourne null si le couple est invalide (l'appelant doit refuser) ou si la
 * methode n'a pas de token dedie (=> checkout generique).
 */
export function resolveGeniusPayMethod(
  countryCode: string | null | undefined,
  methodId: string | null | undefined,
): { country: GeniusPayCountry; method: GeniusPayMethod } | null {
  const country = getGeniusPayCountry(countryCode)
  if (!country) return null
  const method = country.methods.find((m) => m.id === methodId)
  if (!method) return null
  return { country, method }
}
