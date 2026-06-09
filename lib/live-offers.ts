// Source de verite de l'offre "Live Pro" (2e outil de face swap temps reel).
// Cette offre est SEPAREE des formules d'abonnement classiques (lib/plans.ts) :
// elle ne credite PAS de points Decart, elle ouvre une fenetre d'acces de 15 min.

export interface LiveOffer {
  id: string
  name: string
  price: number // FCFA
  windowMinutes: number // duree de la fenetre d'horloge une fois demarree
  description: string
}

// Essai gratuit offert une seule fois a tous les comptes (en secondes).
export const LIVE_TRIAL_SECONDS = 120

// OFFRE LIVE PRO 15 MIN RETIREE : le forfait n'est plus valide ni vendable.
// On garde le type + les helpers pour ne pas casser le backend (fulfillment,
// paiement, admin), mais la liste est vide : aucune offre Live ne peut plus
// etre achetee et plus rien ne s'affiche cote client.
export const LIVE_OFFERS: LiveOffer[] = []

export function getLiveOffer(id: string): LiveOffer | undefined {
  return LIVE_OFFERS.find((o) => o.id === id)
}

export function isLiveOffer(id: string): boolean {
  return LIVE_OFFERS.some((o) => o.id === id)
}

// Libelles pour l'affichage admin (mappe l'id d'offre Live vers son nom).
export const LIVE_OFFER_LABELS: Record<string, string> = Object.fromEntries(
  LIVE_OFFERS.map((o) => [o.id, o.name]),
)
