// Source de verite des formules d'abonnement ChapCam.
// Utilise a la fois par la page /dashboard/plans et les routes API.

export type PlanId = 'starter' | 'standard' | 'premium' | 'ultimate' | 'vip'

export interface PlanGift {
  label: string
  sublabel?: string
  image?: string
}

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
  lifetime?: boolean
  gift?: PlanGift
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
  },
  {
    id: 'standard',
    name: 'Standard',
    duration: '30 Jours',
    durationDays: 30,
    price: 25000,
    oldPrice: 35000,
    discount: 29,
    points: 1250,
    minutes: '10 min 25 sec',
    features: ['Transformation du visage et corps entier', 'Qualite HD 1080p', 'Support prioritaire'],
    popular: true,
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
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
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
  },
  {
    id: 'vip',
    name: 'VIP A Vie',
    duration: 'A Vie',
    durationDays: 36500,
    price: 150000,
    oldPrice: 250000,
    discount: 40,
    points: 20000,
    minutes: '2h 46 min 40 sec',
    features: [
      'Acces illimite a vie',
      'Transformation du visage et corps entier',
      'Qualite 4K Ultra HD',
      'Voice Swap PRO inclus',
      'Support VIP prioritaire 24/7',
      'Acces anticipe a toutes les nouveautes',
    ],
    popular: false,
    lifetime: true,
    gift: {
      label: 'Changeur de voix i9 OFFERT',
      sublabel: 'Appareil physique livre chez vous',
      // image: renseignee des reception du visuel i9
    },
  },
]

export function getPlan(id: string): PlanConfig | undefined {
  return PLANS.find((p) => p.id === id)
}
