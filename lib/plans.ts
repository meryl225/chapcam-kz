// Source de verite des formules d'abonnement ChapCam.
// Utilise a la fois par la page /dashboard/plans et les routes API.

// 'standard' est conserve dans le type pour la compatibilite des anciens
// abonnes en base, mais n'apparait plus dans la liste des forfaits proposes.
export type PlanId = 'starter' | 'standard' | 'premium' | 'ultimate' | 'vip_debout'

export interface PlanConfig {
  id: PlanId
  name: string
  duration: string
  durationDays: number
  price: number
  oldPrice: number
  discount: number
  points: number
  minutes: string
  features: string[]
  popular: boolean
  /** true = filigrane "logo ChapCam" visible sur le rendu ; false = sans logo (retrait automatique) */
  watermark: boolean
  /** Etiquette mise en avant affichee sur la carte (ex: "Meilleure offre", "Sans logo") */
  highlight?: string
}

export const PLANS: PlanConfig[] = [
  {
    id: 'starter',
    name: 'Starter',
    duration: '1 Jour',
    durationDays: 1,
    price: 10000,
    oldPrice: 12000,
    discount: 17,
    points: 500,
    minutes: '4 min 10 sec',
    features: ['Transformation du visage et corps entier', 'Qualite HD 1080p'],
    popular: false,
    watermark: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    duration: '90 Jours',
    durationDays: 90,
    price: 50000,
    oldPrice: 65000,
    discount: 23,
    points: 2500,
    minutes: '20 min 50 sec',
    features: ['Transformation du visage et corps entier', 'Qualite 4K Ultra HD', 'Support prioritaire'],
    popular: false,
    watermark: true,
  },
  {
    id: 'ultimate',
    name: 'VIP PRO',
    duration: '365 Jours',
    durationDays: 365,
    price: 85000,
    oldPrice: 110000,
    discount: 23,
    points: 4250,
    minutes: '35 min 25 sec',
    features: [
      'Transformation du visage et corps entier',
      'Qualite 4K Ultra HD',
      'Support VIP 24/7',
      'Acces aux nouveautes en avant-premiere',
    ],
    popular: true,
    watermark: false,
    highlight: 'Meilleure offre',
  },
  {
    id: 'vip_debout',
    name: 'VIP DEBOUT',
    duration: '365 Jours',
    durationDays: 365,
    price: 150000,
    oldPrice: 180000,
    discount: 17,
    points: 7200,
    minutes: '60 min',
    features: [
      'Transformation du visage et corps entier',
      'Qualite 4K Ultra HD maximale',
      'Support VIP prioritaire 24/7',
      'Acces anticipe a toutes les nouveautes',
    ],
    popular: false,
    watermark: false,
    highlight: 'Sans logo',
  },
]

export function getPlan(id: string): PlanConfig | undefined {
  return PLANS.find((p) => p.id === id)
}

// --- Quota du service proxy "Navigation Sécurisée" ---
// Choix rentable : le quota de données proxy est un POOL UNIQUE partagé entre
// tous les pays, dimensionné selon le forfait payé. Sans forfait actif = 0 Go.
// (Évite l'abus du "10 Go par pays activé".)
export const PROXY_QUOTA_GB: Record<PlanId, number> = {
  starter: 2,
  standard: 15,
  premium: 50,
  ultimate: 120,
  vip_debout: 200,
}

/** Quota proxy (Go) accordé par un forfait. Retourne 0 si forfait inconnu/absent. */
export function proxyQuotaForPlan(planId: string | null | undefined): number {
  if (!planId) return 0
  return PROXY_QUOTA_GB[planId as PlanId] ?? 0
}
