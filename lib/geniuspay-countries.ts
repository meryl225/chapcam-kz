// ============================================================
// Source de verite unique des pays de paiement (client + serveur).
//
//   - Cote d'Ivoire / Benin / Togo  => PayDunya (paiements existants inchanges).
//   - TOUS les autres pays du monde => GeniusPay.
//       - carte bancaire (Visa / Mastercard) disponible PARTOUT,
//       - + methodes Mobile Money specifiques pour les pays ou GeniusPay les
//         supporte (Orange, Wave, MTN, M-Pesa, Airtel...).
//
// Le modal itere sur PAYMENT_COUNTRIES et route selon `provider`. Le montant est
// TOUJOURS envoye en XOF (choix produit) ; GeniusPay convertit vers la devise
// locale du payeur. On n'envoie JAMAIS `payment_method` a l'API GeniusPay (cela
// forcerait Wave) : la methode choisie sert d'indication (metadata) et la page
// hebergee, pre-filtree par le pays, laisse le client finaliser.
// ============================================================

export type PaymentProvider = 'paydunya' | 'geniuspay'

export interface UICountryMethod {
  id: string
  label: string
  sublabel?: string
  kind: 'mobile' | 'card'
}

export interface UICountry {
  code: string // ISO 3166-1 alpha-2
  name: string
  flag: string
  provider: PaymentProvider
  methods: UICountryMethod[]
}

// --- Drapeau emoji calcule depuis le code ISO2 (pas de hardcode) ----------
function flagOf(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

// --- Methode carte, disponible pour tous les pays -------------------------
const CARD: UICountryMethod = {
  id: 'card',
  label: 'Carte bancaire',
  sublabel: 'Visa / Mastercard',
  kind: 'card',
}

const mm = (id: string, label: string): UICountryMethod => ({ id, label, kind: 'mobile' })

// --- Mobile Money par pays (uniquement la ou GeniusPay le supporte) -------
// L'ordre definit l'ordre d'affichage des methodes ; la carte est ajoutee a la
// fin automatiquement.
const MOBILE_MONEY: Record<string, UICountryMethod[]> = {
  SN: [mm('free_money', 'Free Money'), mm('orange_money', 'Orange Money'), mm('wave', 'Wave')],
  BF: [mm('orange_money', 'Orange Money'), mm('wave', 'Wave'), mm('moov_money', 'Moov Money'), mm('mobicash', 'Mobicash')],
  ML: [mm('orange_money', 'Orange Money'), mm('mobicash', 'Mobicash')],
  CM: [mm('mtn_money', 'MTN Mobile Money'), mm('orange_money', 'Orange Money')],
  CG: [mm('airtel_money', 'Airtel Money'), mm('mtn_money', 'MTN Mobile Money'), mm('orange_money', 'Orange Money'), mm('mpesa', 'M-Pesa')],
  GA: [mm('airtel_money', 'Airtel Money')],
  CD: [mm('airtel_money', 'Airtel Money'), mm('orange_money', 'Orange Money'), mm('vodacom', 'Vodacom')],
  KE: [mm('mpesa', 'M-Pesa')],
  RW: [mm('airtel_money', 'Airtel Money'), mm('mtn_money', 'MTN Mobile Money')],
  UG: [mm('airtel_money', 'Airtel Money'), mm('mtn_money', 'MTN Mobile Money')],
  SL: [mm('orange_money', 'Orange Money')],
  GN: [mm('orange_money', 'Orange Money')],
  NE: [mm('airtel_money', 'Airtel Money')],
  GW: [mm('orange_money', 'Orange Money')],
  GH: [mm('mtn_money', 'MTN Mobile Money'), mm('vodafone_cash', 'Vodafone Cash')],
  NG: [mm('mtn_money', 'MTN Mobile Money')],
  ZM: [mm('mtn_money', 'MTN Mobile Money'), mm('zamtel', 'Zamtel')],
  TZ: [mm('mpesa', 'M-Pesa'), mm('airtel_money', 'Airtel Money'), mm('tigo_pesa', 'Tigo Pesa')],
  MW: [mm('airtel_money', 'Airtel Money')],
  MZ: [mm('mpesa_vodacom', 'M-Pesa (Vodacom)')],
}

// Pays confies a PayDunya : NE PAS les router vers GeniusPay.
const PAYDUNYA_CODES = new Set(['CI', 'BJ', 'TG'])

// Ordre de "mise en avant" des pays Mobile Money (affiches en tete de liste).
const FEATURED_ORDER = [
  'SN', 'BF', 'ML', 'CM', 'GA', 'CG', 'CD', 'GN', 'GW', 'NE',
  'GH', 'NG', 'KE', 'RW', 'UG', 'TZ', 'ZM', 'MW', 'MZ', 'SL',
]

// --- Liste complete des pays du monde (ISO2 + nom francais) ---------------
// Utilisee pour offrir la carte bancaire PARTOUT.
const WORLD: Array<[string, string]> = [
  ['AF', 'Afghanistan'], ['ZA', 'Afrique du Sud'], ['AL', 'Albanie'], ['DZ', 'Algérie'],
  ['DE', 'Allemagne'], ['AD', 'Andorre'], ['AO', 'Angola'], ['AG', 'Antigua-et-Barbuda'],
  ['SA', 'Arabie saoudite'], ['AR', 'Argentine'], ['AM', 'Arménie'], ['AU', 'Australie'],
  ['AT', 'Autriche'], ['AZ', 'Azerbaïdjan'], ['BS', 'Bahamas'], ['BH', 'Bahreïn'],
  ['BD', 'Bangladesh'], ['BB', 'Barbade'], ['BE', 'Belgique'], ['BZ', 'Belize'],
  ['BJ', 'Bénin'], ['BT', 'Bhoutan'], ['BY', 'Biélorussie'], ['BO', 'Bolivie'],
  ['BA', 'Bosnie-Herzégovine'], ['BW', 'Botswana'], ['BR', 'Brésil'], ['BN', 'Brunei'],
  ['BG', 'Bulgarie'], ['BF', 'Burkina Faso'], ['BI', 'Burundi'], ['KH', 'Cambodge'],
  ['CM', 'Cameroun'], ['CA', 'Canada'], ['CV', 'Cap-Vert'], ['CL', 'Chili'],
  ['CN', 'Chine'], ['CY', 'Chypre'], ['CO', 'Colombie'], ['KM', 'Comores'],
  ['CG', 'Congo'], ['CD', 'Congo (RDC)'], ['KR', 'Corée du Sud'], ['KP', 'Corée du Nord'],
  ['CR', 'Costa Rica'], ['CI', "Côte d'Ivoire"], ['HR', 'Croatie'], ['CU', 'Cuba'],
  ['DK', 'Danemark'], ['DJ', 'Djibouti'], ['DM', 'Dominique'], ['EG', 'Égypte'],
  ['AE', 'Émirats arabes unis'], ['EC', 'Équateur'], ['ER', 'Érythrée'], ['ES', 'Espagne'],
  ['EE', 'Estonie'], ['SZ', 'Eswatini'], ['US', 'États-Unis'], ['ET', 'Éthiopie'],
  ['FJ', 'Fidji'], ['FI', 'Finlande'], ['FR', 'France'], ['GA', 'Gabon'],
  ['GM', 'Gambie'], ['GE', 'Géorgie'], ['GH', 'Ghana'], ['GR', 'Grèce'],
  ['GD', 'Grenade'], ['GT', 'Guatemala'], ['GN', 'Guinée'], ['GW', 'Guinée-Bissau'],
  ['GQ', 'Guinée équatoriale'], ['GY', 'Guyana'], ['HT', 'Haïti'], ['HN', 'Honduras'],
  ['HU', 'Hongrie'], ['IN', 'Inde'], ['ID', 'Indonésie'], ['IQ', 'Irak'],
  ['IR', 'Iran'], ['IE', 'Irlande'], ['IS', 'Islande'], ['IL', 'Israël'],
  ['IT', 'Italie'], ['JM', 'Jamaïque'], ['JP', 'Japon'], ['JO', 'Jordanie'],
  ['KZ', 'Kazakhstan'], ['KE', 'Kenya'], ['KG', 'Kirghizistan'], ['KI', 'Kiribati'],
  ['KW', 'Koweït'], ['LA', 'Laos'], ['LS', 'Lesotho'], ['LV', 'Lettonie'],
  ['LB', 'Liban'], ['LR', 'Liberia'], ['LY', 'Libye'], ['LI', 'Liechtenstein'],
  ['LT', 'Lituanie'], ['LU', 'Luxembourg'], ['MK', 'Macédoine du Nord'], ['MG', 'Madagascar'],
  ['MY', 'Malaisie'], ['MW', 'Malawi'], ['MV', 'Maldives'], ['ML', 'Mali'],
  ['MT', 'Malte'], ['MA', 'Maroc'], ['MH', 'Îles Marshall'], ['MU', 'Maurice'],
  ['MR', 'Mauritanie'], ['MX', 'Mexique'], ['FM', 'Micronésie'], ['MD', 'Moldavie'],
  ['MC', 'Monaco'], ['MN', 'Mongolie'], ['ME', 'Monténégro'], ['MZ', 'Mozambique'],
  ['MM', 'Myanmar'], ['NA', 'Namibie'], ['NR', 'Nauru'], ['NP', 'Népal'],
  ['NI', 'Nicaragua'], ['NE', 'Niger'], ['NG', 'Nigeria'], ['NO', 'Norvège'],
  ['NZ', 'Nouvelle-Zélande'], ['OM', 'Oman'], ['UG', 'Ouganda'], ['UZ', 'Ouzbékistan'],
  ['PK', 'Pakistan'], ['PW', 'Palaos'], ['PS', 'Palestine'], ['PA', 'Panama'],
  ['PG', 'Papouasie-Nouvelle-Guinée'], ['PY', 'Paraguay'], ['NL', 'Pays-Bas'], ['PE', 'Pérou'],
  ['PH', 'Philippines'], ['PL', 'Pologne'], ['PT', 'Portugal'], ['QA', 'Qatar'],
  ['RO', 'Roumanie'], ['GB', 'Royaume-Uni'], ['RU', 'Russie'], ['RW', 'Rwanda'],
  ['KN', 'Saint-Kitts-et-Nevis'], ['SM', 'Saint-Marin'], ['VC', 'Saint-Vincent-et-les-Grenadines'],
  ['LC', 'Sainte-Lucie'], ['SB', 'Îles Salomon'], ['SV', 'Salvador'], ['WS', 'Samoa'],
  ['ST', 'Sao Tomé-et-Principe'], ['SN', 'Sénégal'], ['RS', 'Serbie'], ['SC', 'Seychelles'],
  ['SL', 'Sierra Leone'], ['SG', 'Singapour'], ['SK', 'Slovaquie'], ['SI', 'Slovénie'],
  ['SO', 'Somalie'], ['SD', 'Soudan'], ['SS', 'Soudan du Sud'], ['LK', 'Sri Lanka'],
  ['SE', 'Suède'], ['CH', 'Suisse'], ['SR', 'Suriname'], ['SY', 'Syrie'],
  ['TJ', 'Tadjikistan'], ['TZ', 'Tanzanie'], ['TD', 'Tchad'], ['CZ', 'Tchéquie'],
  ['TH', 'Thaïlande'], ['TL', 'Timor oriental'], ['TG', 'Togo'], ['TO', 'Tonga'],
  ['TT', 'Trinité-et-Tobago'], ['TN', 'Tunisie'], ['TM', 'Turkménistan'], ['TR', 'Turquie'],
  ['TV', 'Tuvalu'], ['UA', 'Ukraine'], ['UY', 'Uruguay'], ['VU', 'Vanuatu'],
  ['VA', 'Vatican'], ['VE', 'Venezuela'], ['VN', 'Viêt Nam'], ['YE', 'Yémen'],
  ['ZM', 'Zambie'], ['ZW', 'Zimbabwe'],
]

const NAME_BY_CODE: Record<string, string> = Object.fromEntries(WORLD)

// Construit une entree pays GeniusPay : Mobile Money (si dispo) + carte.
function geniusCountry(code: string): UICountry {
  const mobile = MOBILE_MONEY[code] || []
  return {
    code,
    name: NAME_BY_CODE[code] || code,
    flag: flagOf(code),
    provider: 'geniuspay',
    methods: [...mobile, CARD],
  }
}

// --- Pays PayDunya (mobile money local + carte) ---------------------------
const PAYDUNYA_COUNTRIES: UICountry[] = [
  {
    code: 'CI',
    name: "Côte d'Ivoire",
    flag: flagOf('CI'),
    provider: 'paydunya',
    methods: [
      { id: 'mobile', label: 'Mobile Money', sublabel: 'Wave, Orange, MTN, Moov, Djamo', kind: 'mobile' },
      { id: 'card', label: 'Carte bancaire', sublabel: 'Visa / Mastercard', kind: 'card' },
    ],
  },
  {
    code: 'BJ',
    name: 'Bénin',
    flag: flagOf('BJ'),
    provider: 'paydunya',
    methods: [
      { id: 'mobile', label: 'Mobile Money', sublabel: 'MTN, Moov', kind: 'mobile' },
      { id: 'card', label: 'Carte bancaire', sublabel: 'Visa / Mastercard', kind: 'card' },
    ],
  },
  {
    code: 'TG',
    name: 'Togo',
    flag: flagOf('TG'),
    provider: 'paydunya',
    methods: [
      { id: 'mobile', label: 'Mobile Money', sublabel: 'Moov, T-Money', kind: 'mobile' },
      { id: 'card', label: 'Carte bancaire', sublabel: 'Visa / Mastercard', kind: 'card' },
    ],
  },
]

// Pays GeniusPay mis en avant (Mobile Money), dans l'ordre defini.
const FEATURED_GENIUSPAY: UICountry[] = FEATURED_ORDER.filter((c) => !PAYDUNYA_CODES.has(c)).map(
  geniusCountry,
)

// Tous les autres pays du monde (carte bancaire), tries par nom.
const featuredSet = new Set(FEATURED_ORDER)
const OTHER_GENIUSPAY: UICountry[] = WORLD.map(([code]) => code)
  .filter((code) => !PAYDUNYA_CODES.has(code) && !featuredSet.has(code))
  .map(geniusCountry)
  .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

// Liste finale affichee dans le selecteur.
//   1) PayDunya (CI, BJ, TG)
//   2) Pays GeniusPay Mobile Money (mis en avant)
//   3) Tous les autres pays (carte bancaire), ordre alphabetique.
export const PAYMENT_COUNTRIES: UICountry[] = [
  ...PAYDUNYA_COUNTRIES,
  ...FEATURED_GENIUSPAY,
  ...OTHER_GENIUSPAY,
]

// Index rapide (utilise cote serveur pour la validation).
const COUNTRY_BY_CODE: Record<string, UICountry> = Object.fromEntries(
  PAYMENT_COUNTRIES.map((c) => [c.code, c]),
)

/**
 * Valide le couple (pays, methode) recu du client contre la liste de verite.
 * Retourne le code pays normalise + l'id de methode, ou null si invalide.
 * (Le token GeniusPay n'est plus utilise : on n'envoie jamais payment_method.)
 */
export function resolveGeniusPayMethod(
  countryCode: string | null | undefined,
  methodId: string | null | undefined,
): { countryCode: string; methodId: string; methodLabel: string } | null {
  if (!countryCode) return null
  const country = COUNTRY_BY_CODE[countryCode.trim().toUpperCase()]
  if (!country) return null
  const method = country.methods.find((m) => m.id === methodId)
  if (!method) return null
  return { countryCode: country.code, methodId: method.id, methodLabel: method.label }
}
