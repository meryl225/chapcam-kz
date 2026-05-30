// Source de verite des modes de paiement ChapCam.
// Utilise par la page /dashboard/plans, le formulaire de confirmation et l'API.

export type PaymentMethodId = 'wave' | 'orange' | 'mtn' | 'moov'

export interface PaymentMethod {
  id: PaymentMethodId
  label: string
  // 'link'  -> paiement via un lien Wave (existant, non modifie)
  // 'phone' -> paiement par numero (Orange Money / MTN / Moov)
  type: 'link' | 'phone'
  // Pour les paiements par numero :
  number?: string
  beneficiary?: string
  color: string // couleur d'accent de la carte (classe tailwind text/bg)
  logo: string // chemin du logo officiel du moyen de paiement
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'wave',
    label: 'Wave',
    type: 'link',
    color: '#1dc3ff',
    logo: '/payments/wave.png',
  },
  {
    id: 'orange',
    label: 'Orange Money',
    type: 'phone',
    number: '+2250779475824',
    beneficiary: 'KACOU BEBI MERYL',
    color: '#ff7900',
    logo: '/payments/orange.png',
  },
  {
    id: 'mtn',
    label: 'MTN Mobile Money',
    type: 'phone',
    number: '+2250555560189',
    beneficiary: 'KACOU BEBI MERYL',
    color: '#ffcc00',
    logo: '/payments/mtn.png',
  },
  {
    id: 'moov',
    label: 'Moov Money',
    type: 'phone',
    number: '+2250150641042',
    beneficiary: 'KACOU BEBI MERYL',
    color: '#0066ff',
    logo: '/payments/moov.png',
  },
]

export const PAYMENT_METHOD_LOGOS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.id, m.logo]),
)

export function getPaymentMethod(id: string): PaymentMethod | undefined {
  return PAYMENT_METHODS.find((m) => m.id === id)
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.id, m.label]),
)
