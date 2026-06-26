// Catalogue canonique ChapCam Numbers.
// Chaque service / pays est mappé vers les identifiants propres à chaque
// fournisseur. Le mapping 5sim est explicite (slugs stables) ; pour sms-man et
// smspool, on résout dynamiquement par nom (voir adapters) via `match`.

export type CanonService = {
  slug: string
  label: string
  icon: string // nom lucide (résolu côté UI)
  logo: string // slug theSVG.org pour le vrai logo de marque
  logoVariant?: string // variante theSVG (défaut: 'default'). 'dark' pour les logos blancs (Uber, Apple)
  fivesim: string // product 5sim
  match: string[] // mots-clés pour matcher les catalogues sms-man / smspool
}

export type CanonCountry = {
  code: string // ISO-2
  name: string
  dial: string
  flag: string
  fivesim: string // slug pays 5sim
  match: string[] // mots-clés pour matcher (sms-man / smspool name)
}

// Forfaits proposés. "verification" = SMS unique (activation, fiable).
// Les autres sont des LOCATIONS (numéro réutilisable, multi-SMS) via 5sim
// hosting. La durée réelle est imposée par le fournisseur : on tente la
// location et on grise le forfait s'il n'est pas disponible.
export type RentalPlanKey = 'verification' | 'rent_3d' | 'rent_1w' | 'rent_1m'

export type RentalPlan = {
  key: RentalPlanKey
  label: string
  short: string
  mode: 'verification' | 'rental'
  /** Durée minimale souhaitée (heures). 0 = activation ponctuelle. */
  minHours: number
}

export const RENTAL_PLANS: RentalPlan[] = [
  { key: 'verification', label: 'Vérification (SMS unique)', short: 'Quelques minutes', mode: 'verification', minHours: 0 },
  { key: 'rent_3d', label: 'Location 3 jours', short: '3 jours', mode: 'rental', minHours: 72 },
  { key: 'rent_1w', label: 'Location 1 semaine', short: '1 semaine', mode: 'rental', minHours: 168 },
  { key: 'rent_1m', label: 'Location 1 mois', short: '1 mois', mode: 'rental', minHours: 720 },
]

export function rentalPlanByKey(key: string): RentalPlan | undefined {
  return RENTAL_PLANS.find((p) => p.key === key)
}

export const SERVICES: CanonService[] = [
  { slug: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle', logo: 'whatsapp', fivesim: 'whatsapp', match: ['whatsapp'] },
  { slug: 'telegram', label: 'Telegram', icon: 'Send', logo: 'telegram', fivesim: 'telegram', match: ['telegram'] },
  { slug: 'google', label: 'Google / Gmail', icon: 'Mail', logo: 'gmail', fivesim: 'google', match: ['google', 'gmail', 'youtube'] },
  { slug: 'facebook', label: 'Facebook', icon: 'Facebook', logo: 'facebook', fivesim: 'facebook', match: ['facebook'] },
  { slug: 'instagram', label: 'Instagram', icon: 'Instagram', logo: 'instagram', fivesim: 'instagram', match: ['instagram'] },
  { slug: 'tiktok', label: 'TikTok', icon: 'Music2', logo: 'tiktok', fivesim: 'tiktok', match: ['tiktok', 'douyin'] },
  { slug: 'twitter', label: 'X (Twitter)', icon: 'Twitter', logo: 'x', fivesim: 'twitter', match: ['twitter', 'x.com', ' x '] },
  { slug: 'discord', label: 'Discord', icon: 'MessageSquare', logo: 'discord', fivesim: 'discord', match: ['discord'] },
  { slug: 'amazon', label: 'Amazon', icon: 'ShoppingCart', logo: 'amazon', fivesim: 'amazon', match: ['amazon'] },
  { slug: 'uber', label: 'Uber', icon: 'Car', logo: 'uber', logoVariant: 'mono', fivesim: 'uber', match: ['uber'] },
  { slug: 'microsoft', label: 'Microsoft', icon: 'Grid2x2', logo: 'microsoft', fivesim: 'microsoft', match: ['microsoft', 'outlook', 'hotmail'] },
  { slug: 'apple', label: 'Apple', icon: 'Apple', logo: 'apple', logoVariant: 'mono', fivesim: 'apple', match: ['apple', 'icloud'] },
]

export const COUNTRIES: CanonCountry[] = [
  { code: 'US', name: 'États-Unis', dial: '+1', flag: '🇺🇸', fivesim: 'usa', match: ['united states', 'usa'] },
  { code: 'GB', name: 'Royaume-Uni', dial: '+44', flag: '🇬🇧', fivesim: 'england', match: ['united kingdom', 'england', 'britain'] },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷', fivesim: 'france', match: ['france'] },
  { code: 'DE', name: 'Allemagne', dial: '+49', flag: '🇩🇪', fivesim: 'germany', match: ['germany'] },
  { code: 'NL', name: 'Pays-Bas', dial: '+31', flag: '🇳🇱', fivesim: 'netherlands', match: ['netherlands'] },
  { code: 'ES', name: 'Espagne', dial: '+34', flag: '🇪🇸', fivesim: 'spain', match: ['spain'] },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦', fivesim: 'canada', match: ['canada'] },
  { code: 'KZ', name: 'Kazakhstan', dial: '+7', flag: '🇰🇿', fivesim: 'kazakhstan', match: ['kazakhstan'] },
  { code: 'RU', name: 'Russie', dial: '+7', flag: '🇷🇺', fivesim: 'russia', match: ['russia'] },
  { code: 'IN', name: 'Inde', dial: '+91', flag: '🇮🇳', fivesim: 'india', match: ['india'] },
  { code: 'ID', name: 'Indonésie', dial: '+62', flag: '🇮🇩', fivesim: 'indonesia', match: ['indonesia'] },
  { code: 'BR', name: 'Brésil', dial: '+55', flag: '🇧🇷', fivesim: 'brazil', match: ['brazil'] },
  { code: 'NG', name: 'Nigéria', dial: '+234', flag: '🇳🇬', fivesim: 'nigeria', match: ['nigeria'] },
  { code: 'CI', name: "Côte d'Ivoire", dial: '+225', flag: '🇨🇮', fivesim: 'ivory', match: ['ivory', "cote d'ivoire", 'cote divoire'] },
  { code: 'ZA', name: 'Afrique du Sud', dial: '+27', flag: '🇿🇦', fivesim: 'southafrica', match: ['south africa'] },
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭', fivesim: 'philippines', match: ['philippines'] },
  { code: 'UA', name: 'Ukraine', dial: '+380', flag: '🇺🇦', fivesim: 'ukraine', match: ['ukraine'] },
  { code: 'PL', name: 'Pologne', dial: '+48', flag: '🇵🇱', fivesim: 'poland', match: ['poland'] },
]

export const serviceBySlug = (slug: string) => SERVICES.find((s) => s.slug === slug)
export const countryByCode = (code: string) => COUNTRIES.find((c) => c.code === code)

export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}
