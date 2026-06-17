import 'server-only'
import { getUsdToXof, MARKUP_MULTIPLIER } from '@/lib/numbers/pricing'

export type ProxyProductId = 'RESIDENTIAL' | 'ISP' | 'MOBILE'

export type ProxyProduct = {
  id: ProxyProductId
  name: string
  tagline: string
  icon: 'home' | 'sim' | 'wifi'
  features: string[]
  // Coût fournisseur (proxy-man) — source du calcul de prix.
  costUsd: number
  // Unité de facturation affichée.
  unit: 'Go' | 'IP'
  highlight?: boolean
}

// Coûts fournisseur réels (proxy-man). Le prix client = coût × taux × marge ×3.
export const PROXY_PRODUCTS: ProxyProduct[] = [
  {
    id: 'RESIDENTIAL',
    name: 'Proxies Résidentiels',
    tagline: "Conçus pour les tâches exigeant une grande confiance et un comportement d'utilisateur réel.",
    icon: 'home',
    features: [
      "Large pool d'IP résidentielles réelles",
      'Rotation automatique ou sessions persistantes',
      'Taux de réussite élevé avec un minimum de blocages',
      'Idéal pour le scraping et la vérification publicitaire',
    ],
    costUsd: 0.74,
    unit: 'Go',
    highlight: true,
  },
  {
    id: 'ISP',
    name: 'Proxies ISP Statiques',
    tagline: "Le parfait équilibre entre vitesse, stabilité et légitimité.",
    icon: 'sim',
    features: [
      'IP statiques fournies directement par les FAI',
      'IP privées exclusives (non partagées)',
      'Sessions stables pour les tâches longues',
      "Idéal pour les comptes et l'automatisation",
    ],
    costUsd: 5,
    unit: 'IP',
  },
  {
    id: 'MOBILE',
    name: 'IP Réseau Mobile',
    tagline: "Anonymat maximal avec un vrai trafic réseau mobile.",
    icon: 'wifi',
    features: [
      'Vraies adresses IP mobiles 4G/5G',
      'Ciblage par localisation et opérateur',
      'Confiance de niveau opérateur mobile',
      'Parfait pour les réseaux sociaux et tâches sensibles',
    ],
    costUsd: 1.35,
    unit: 'Go',
  },
]

export type ProxyProductPriced = ProxyProduct & { priceXof: number }

/** Prix client FCFA = coût fournisseur × taux USD→FCFA × marge (×3), arrondi. */
function priceXof(costUsd: number, usdToXof: number): number {
  const raw = costUsd * usdToXof * MARKUP_MULTIPLIER
  return Math.ceil(raw / 5) * 5
}

/** Renvoie les offres avec leur prix client FCFA calculé en direct. */
export async function getPricedProxyProducts(): Promise<ProxyProductPriced[]> {
  const usdToXof = await getUsdToXof()
  return PROXY_PRODUCTS.map((p) => ({ ...p, priceXof: priceXof(p.costUsd, usdToXof) }))
}
