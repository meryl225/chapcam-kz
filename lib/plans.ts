// Source de verite des formules d'abonnement ChapCam.
// Utilise a la fois par la page /dashboard/plans et les routes API.

export type PlanId = 'starter' | 'standard' | 'premium' | 'ultimate' | 'vipdebout'

// Statut du logo (watermark) par forfait :
// - 'with'   : rendu AVEC logo ChapCam (Starter, Standard)
// - 'manual' : sans logo, active manuellement sur demande
// - 'auto'   : sans logo automatiquement inclus (Premium 50.000 F, VIP PRO, VIP DEBOUT)
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
  // Quota "Studio Photo en Video" inclus dans le forfait Live Swap : nombre de
  // videos photo->parlante que l'utilisateur peut generer par periode d'abonnement.
  photoVideoQuota: number
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
    photoVideoQuota: 2,
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
    photoVideoQuota: 5,
    features: [
      'Transformation du visage et corps entier',
      'Rendu sans logo ChapCam inclus',
      'Qualite 4K Ultra HD',
      'Support prioritaire',
    ],
    popular: false,
    highlight: true,
    bestOffer: false,
    // Sans logo automatique inclus (retrait du filigrane active des l'achat).
    watermark: 'auto',
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
    photoVideoQuota: 8,
    features: [
      'Transformation du visage et corps entier',
      'Rendu Full HD 1080p sans logo',
      'Studio CHAPCAM : scènes en direct (décors, styles, effets, arrière-plans)',
      'Prompts personnalisés en direct + Enhance',
      'Suivi temps réel : chrono précis & qualité réseau',
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
    discount: 25,
    points: 7200,
    minutes: '60 min',
    photoVideoQuota: 10,
    features: [
      'Transformation du visage et corps entier',
      'Rendu Full HD 1080p sans logo',
      'Studio CHAPCAM complet : scènes en direct (décors, styles, effets, arrière-plans)',
      'Prompts personnalisés illimités en direct + Enhance',
      'Suivi temps réel : chrono précis & qualité réseau',
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

// --- Quota "Studio Photo en Video" par forfait Live Swap ---
// Nombre de videos photo->parlante incluses par periode d'abonnement (2 a 10).
// Decouple des points/minutes du Live Swap : la photo-video ne consomme PAS de points.
export const PHOTO_VIDEO_QUOTA: Record<PlanId, number> = {
  starter: 2,
  standard: 3,
  premium: 5,
  ultimate: 8,
  vipdebout: 10,
}

/** Quota photo-video accordé par un forfait. Retourne 0 si forfait inconnu/absent. */
export function photoVideoQuotaForPlan(planId: string | null | undefined): number {
  if (!planId) return 0
  return PHOTO_VIDEO_QUOTA[planId as PlanId] ?? 0
}

// --- Quota "Motion Control" (Kling via fal.ai) par forfait Live Swap ---
// Le motion-transfer coute CHER (~760 F/clip de 10s cote fal), bien plus que la
// photo-video. Les quotas inclus sont donc VOLONTAIREMENT petits pour proteger
// la marge : chaque clip fait au maximum 10 secondes (plafond serveur/ client).
// Reserve aux forfaits de valeur (Starter/Standard n'en incluent pas).
export const MOTION_VIDEO_QUOTA: Record<PlanId, number> = {
  starter: 0,
  standard: 0,
  premium: 2,
  ultimate: 4,
  vipdebout: 6,
}

/** Quota Motion Control accordé par un forfait. Retourne 0 si inconnu/absent. */
export function motionQuotaForPlan(planId: string | null | undefined): number {
  if (!planId) return 0
  return MOTION_VIDEO_QUOTA[planId as PlanId] ?? 0
}

// Duree maximale (secondes) d'un clip Motion Control = duree de la video de
// reference. Plafonnee pour borner le cout fal par generation.
export const MOTION_MAX_SECONDS = 10
