// Source de verite des offres "ChapVoice" (moteur Voice Swap / changement de
// voix temps reel). Ces offres sont SEPAREES des formules d'abonnement
// classiques (lib/plans.ts) et des offres Live : elles creditent des MINUTES
// de conversion vocale (stockees en secondes dans la table voice_subscriptions).
//
// Regles produit validees :
// - Toutes les voix premium sont accessibles a TOUS les plans.
// - A l'achat, les minutes s'ACCUMULENT (ajout au solde restant) et la date
//   d'expiration est repoussee a +30 jours.

export interface VoiceOffer {
  id: string
  name: string
  price: number // FCFA
  minutes: number // minutes de conversion creditees
  validityDays: number // duree de validite a partir de l'achat
  features: string[]
  highlight?: boolean // mis en avant dans l'UI
}

// Validite par defaut d'une recharge ChapVoice (mensuelle).
export const VOICE_VALIDITY_DAYS = 30

export const VOICE_OFFERS: VoiceOffer[] = [
  {
    id: 'voice_basic',
    name: 'ChapVoice Basic',
    price: 5000,
    minutes: 15,
    validityDays: VOICE_VALIDITY_DAYS,
    features: [
      'Changement de voix temps reel',
      'WhatsApp, Telegram, Discord',
      'Toutes les voix premium',
    ],
  },
  {
    id: 'voice_pro',
    name: 'ChapVoice Pro',
    price: 10000,
    minutes: 35,
    validityDays: VOICE_VALIDITY_DAYS,
    highlight: true,
    features: [
      'Changement de voix temps reel',
      'WhatsApp, Telegram, Discord',
      'Toutes les voix premium',
      'Priorite serveur',
    ],
  },
  {
    id: 'voice_ultra',
    name: 'ChapVoice Ultra',
    price: 15000,
    minutes: 60,
    validityDays: VOICE_VALIDITY_DAYS,
    features: [
      'Changement de voix temps reel',
      'WhatsApp, Telegram, Discord',
      'Toutes les voix premium',
      'Priorite maximale',
      'Support prioritaire',
    ],
  },
]

export function getVoiceOffer(id: string): VoiceOffer | undefined {
  return VOICE_OFFERS.find((o) => o.id === id)
}

export function isVoiceOffer(id: string): boolean {
  return VOICE_OFFERS.some((o) => o.id === id)
}

// Libelles pour l'affichage admin (mappe l'id d'offre voix vers son nom).
export const VOICE_OFFER_LABELS: Record<string, string> = Object.fromEntries(
  VOICE_OFFERS.map((o) => [o.id, o.name]),
)
