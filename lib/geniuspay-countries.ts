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

// --- Logos des moyens de paiement (operateurs Mobile Money) ---------------
// Utilise pour l'affichage marketing des pays principaux. `logo` est optionnel :
// quand on n'a pas d'asset fiable, on retombe sur une pastille texte.
export interface PaymentOperator {
  key: string
  label: string
  logo?: string
}

// Cle operateur -> logo (assets presents dans public/images).
const OPERATOR_LOGOS: Record<string, string> = {
  orange_money: '/images/orange-money-logo.png',
  wave: '/images/wave-logo.png',
  mtn_money: '/images/mtn-momo-logo.jpg',
  airtel_money: '/images/airtel-logo.svg',
  vodafone_cash: '/images/vodafone-logo.svg',
  djamo: '/images/djamo-logo.png',
}

const op = (key: string, label: string): PaymentOperator => ({
  key,
  label,
  logo: OPERATOR_LOGOS[key],
})

// Operateurs affiches par pays PayDunya (methode 'mobile' agregee).
const PAYDUNYA_OPERATORS: Record<string, PaymentOperator[]> = {
  CI: [op('wave', 'Wave'), op('orange_money', 'Orange Money'), op('mtn_money', 'MTN'), op('moov_money', 'Moov'), op('djamo', 'Djamo')],
  BJ: [op('mtn_money', 'MTN'), op('moov_money', 'Moov')],
  TG: [op('moov_money', 'Moov'), op('tmoney', 'T-Money')],
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

// --- Indicatifs telephoniques internationaux (ISO2 -> indicatif) ----------
// CRITIQUE pour le Mobile Money : la page de checkout hebergee GeniusPay choisit
// les methodes disponibles (MTN, M-Pesa, Orange...) d'apres l'INDICATIF du
// numero `customer.phone` qu'on lui envoie — PAS d'apres customer.country.
// Verifie empiriquement : `customer.phone = "+234"` fait passer la page sur
// Nigeria et affiche MTN Mobile Money ; sans indicatif, la page tombe sur "US"
// (geo-IP) et ne propose que la carte. On envoie donc toujours le prefixe du
// pays choisi pour debloquer le bon Mobile Money.
const DIALING_CODES: Record<string, string> = {
  AF: '93', ZA: '27', AL: '355', DZ: '213', DE: '49', AD: '376', AO: '244', AG: '1',
  SA: '966', AR: '54', AM: '374', AU: '61', AT: '43', AZ: '994', BS: '1', BH: '973',
  BD: '880', BB: '1', BE: '32', BZ: '501', BJ: '229', BT: '975', BY: '375', BO: '591',
  BA: '387', BW: '267', BR: '55', BN: '673', BG: '359', BF: '226', BI: '257', KH: '855',
  CM: '237', CA: '1', CV: '238', CL: '56', CN: '86', CY: '357', CO: '57', KM: '269',
  CG: '242', CD: '243', KR: '82', KP: '850', CR: '506', CI: '225', HR: '385', CU: '53',
  DK: '45', DJ: '253', DM: '1', EG: '20', AE: '971', EC: '593', ER: '291', ES: '34',
  EE: '372', SZ: '268', US: '1', ET: '251', FJ: '679', FI: '358', FR: '33', GA: '241',
  GM: '220', GE: '995', GH: '233', GR: '30', GD: '1', GT: '502', GN: '224', GW: '245',
  GQ: '240', GY: '592', HT: '509', HN: '504', HU: '36', IN: '91', ID: '62', IQ: '964',
  IR: '98', IE: '353', IS: '354', IL: '972', IT: '39', JM: '1', JP: '81', JO: '962',
  KZ: '7', KE: '254', KG: '996', KI: '686', KW: '965', LA: '856', LS: '266', LV: '371',
  LB: '961', LR: '231', LY: '218', LI: '423', LT: '370', LU: '352', MK: '389', MG: '261',
  MY: '60', MW: '265', MV: '960', ML: '223', MT: '356', MA: '212', MH: '692', MU: '230',
  MR: '222', MX: '52', FM: '691', MD: '373', MC: '377', MN: '976', ME: '382', MZ: '258',
  MM: '95', NA: '264', NR: '674', NP: '977', NI: '505', NE: '227', NG: '234', NO: '47',
  NZ: '64', OM: '968', UG: '256', UZ: '998', PK: '92', PW: '680', PS: '970', PA: '507',
  PG: '675', PY: '595', NL: '31', PE: '51', PH: '63', PL: '48', PT: '351', QA: '974',
  RO: '40', GB: '44', RU: '7', RW: '250', KN: '1', SM: '378', VC: '1', LC: '1',
  SB: '677', SV: '503', WS: '685', ST: '239', SN: '221', RS: '381', SC: '248', SL: '232',
  SG: '65', SK: '421', SI: '386', SO: '252', SD: '249', SS: '211', LK: '94', SE: '46',
  CH: '41', SR: '597', SY: '963', TJ: '992', TZ: '255', TD: '235', CZ: '420', TH: '66',
  TL: '670', TG: '228', TO: '676', TT: '1', TN: '216', TM: '993', TR: '90', TV: '688',
  UA: '380', UY: '598', VU: '678', VA: '39', VE: '58', VN: '84', YE: '967', ZM: '260',
  ZW: '263',
}

/** Indicatif international (ex. 'NG' -> '234'), ou null si inconnu. */
export function getDialingCode(code: string | null | undefined): string | null {
  if (!code) return null
  return DIALING_CODES[code.trim().toUpperCase()] || null
}

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

// Ordre de base de la liste :
//   1) PayDunya (CI, BJ, TG)
//   2) Pays GeniusPay Mobile Money (mis en avant)
//   3) Tous les autres pays (carte bancaire), ordre alphabetique.
const BASE_ORDER: UICountry[] = [
  ...PAYDUNYA_COUNTRIES,
  ...FEATURED_GENIUSPAY,
  ...OTHER_GENIUSPAY,
]

// Pays epingles tout en haut, dans cet ordre exact (juste apres la Cote
// d'Ivoire on veut le Nigeria puis la France).
const PINNED_ORDER = ['CI', 'NG', 'FR']

// Liste finale : les pays epingles en tete, puis tout le reste dans l'ordre de
// base (sans doublon).
const byCode = new Map(BASE_ORDER.map((c) => [c.code, c]))
export const PAYMENT_COUNTRIES: UICountry[] = [
  ...PINNED_ORDER.map((code) => byCode.get(code)).filter((c): c is UICountry => Boolean(c)),
  ...BASE_ORDER.filter((c) => !PINNED_ORDER.includes(c.code)),
]

// Index rapide (utilise cote serveur pour la validation).
const COUNTRY_BY_CODE: Record<string, UICountry> = Object.fromEntries(
  PAYMENT_COUNTRIES.map((c) => [c.code, c]),
)

// --- Pays "principaux" mis en avant (affichage marketing) -----------------
// Ceux explicitement cites dans l'API (PayDunya + Mobile Money GeniusPay) plus
// la France, toujours en avant. Le reste des pays du monde (carte seule) est
// resume par "+N autres pays".
const PRINCIPAL_CODES = new Set<string>([...PAYDUNYA_CODES, ...FEATURED_ORDER, 'FR'])
export const PRINCIPAL_COUNTRIES: UICountry[] = PAYMENT_COUNTRIES.filter((c) =>
  PRINCIPAL_CODES.has(c.code),
)
// Nombre de pays restants (carte bancaire) non affiches individuellement.
export const OTHER_COUNTRIES_COUNT = PAYMENT_COUNTRIES.length - PRINCIPAL_COUNTRIES.length

/**
 * Operateurs / moyens de paiement Mobile Money a afficher pour un pays donne.
 * (La carte bancaire Visa/Mastercard est geree separement cote UI.)
 */
export function getPaymentOperators(country: UICountry): PaymentOperator[] {
  if (country.provider === 'paydunya') {
    return PAYDUNYA_OPERATORS[country.code] || []
  }
  return (MOBILE_MONEY[country.code] || []).map((m) => op(m.id, m.label))
}

/**
 * Valide le couple (pays, methode) recu du client contre la liste de verite.
 * Retourne le code pays normalise + l'id de methode, ou null si invalide.
 * (Le token GeniusPay n'est plus utilise : on n'envoie jamais payment_method.)
 */
export function resolveGeniusPayMethod(
  countryCode: string | null | undefined,
  methodId: string | null | undefined,
): {
  countryCode: string
  methodId: string
  methodLabel: string
  dialingCode: string | null
} | null {
  if (!countryCode) return null
  const country = COUNTRY_BY_CODE[countryCode.trim().toUpperCase()]
  if (!country) return null
  const method = country.methods.find((m) => m.id === methodId)
  if (!method) return null
  return {
    countryCode: country.code,
    methodId: method.id,
    methodLabel: method.label,
    dialingCode: getDialingCode(country.code),
  }
}
