export type ProxyProductId = 'RESIDENTIAL' | 'ISP' | 'MOBILE'

export type ProxyProduct = {
  id: ProxyProductId
  name: string
  tagline: string
  icon: 'home' | 'sim' | 'wifi'
  features: string[]
  highlight?: boolean
}

// Vitrine des offres. Aucun coût/prix ici : le fournisseur de proxies n'est pas
// encore choisi. Quand il le sera, on ajoutera les coûts réels + le calcul de
// prix (coût × taux USD→FCFA × marge) et on rouvrira l'activation.
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
  },
]
