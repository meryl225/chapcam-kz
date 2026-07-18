// Source de verite des formules d'abonnement ChapCam.
// Utilise a la fois par la page /dashboard/plans et les routes API.

export type PlanId = 'starter' | 'standard' | 'premium' | 'ultimate' | 'vipdebout'

// Statut du logo (watermark) par forfait :
// - 'with'   : rendu AVEC logo ChapCam (Starter, Standard)
// - 'manual' : sans logo, active manuellement sur demande (Premium 50.000 F)
// - 'auto'   : sans logo automatiquement inclus (Ultimate 85.000 F)
export type WatermarkStatus = 'with' | 'manual' | 'auto'

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
  // Forfait mis en avant (agrandi + halo). Reserve a Premium et VIP PRO.
  highlight: boolean
  // Forfait le plus avantageux : affiche le badge "MEILLEURE OFFRE". Reserve au VIP PRO.
  bestOffer: boolean
  watermark: WatermarkStatus
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
    features: ['Transformation du visage et corps entier', 'Qualite HD'],
    popular: false,
    highlight: false,
    bestOffer: false,
    watermark: 'with',
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
    highlight: true,
    bestOffer: false,
    // Affichage public : AVEC logo. Le retrait reste possible manuellement par
    // l'admin pour un client precis (voir MANUAL_NO_WATERMARK_PLANS dans lib/watermark.ts).
    watermark: 'with',
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
      'Acces aux nouveautes',
    ],
    popular: false,
    highlight: true,
    bestOffer: true,
    watermark: 'auto',
  },
  {
    id: 'vipdebout',
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
    highlight: true,
    bestOffer: false,
    watermark: 'auto',
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
  vipdebout: 200,
}

/** Quota proxy (Go) accordé par un forfait. Retourne 0 si forfait inconnu/absent. */
export function proxyQuotaForPlan(planId: string | null | undefined): number {
  if (!planId) return 0
  return PROXY_QUOTA_GB[planId as PlanId] ?? 0
}
