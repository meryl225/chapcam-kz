// Source de verite des packs de MINUTES supplementaires de Live Swap.
//
// Ces packs sont achetables SEPAREMENT, en plus (ou en dehors) d'un forfait :
// ils creditent directement des POINTS de Live Swap au solde existant SANS
// changer le forfait de l'utilisateur (meme s'il est VIP, on ajoute juste ses
// minutes). Reference : 2 points = 1 seconde de swap 720p (voir swap-pricing).
//
// Regle produit : 4 minutes = 10 000 FCFA = 4 x 60 x 2 = 480 points.
// A l'achat, les points s'ACCUMULENT au solde et la fenetre d'utilisation est
// prolongee (jamais raccourcie) pour que les minutes achetees restent valables.

import { POINTS_PER_SECOND_SD } from '@/lib/swap-pricing'

export interface MinutesOffer {
  id: string
  name: string
  price: number // FCFA
  minutes: number // minutes de Live Swap ajoutees
  points: number // points credites (= minutes * 60 * points/s)
  validityDays: number // fenetre de validite garantie pour les minutes ajoutees
}

export const MINUTES_OFFERS: MinutesOffer[] = [
  {
    id: 'minutes_4',
    name: '4 minutes supplémentaires',
    price: 10000,
    minutes: 4,
    points: 4 * 60 * POINTS_PER_SECOND_SD, // 480 points
    validityDays: 30,
  },
]

// Offre par defaut (pack unique 4 min) — pratique pour les boutons du hub.
export const MINUTES_OFFER = MINUTES_OFFERS[0]

export function getMinutesOffer(id: string): MinutesOffer | undefined {
  return MINUTES_OFFERS.find((o) => o.id === id)
}

export function isMinutesOffer(id: string): boolean {
  return MINUTES_OFFERS.some((o) => o.id === id)
}

// Libelles pour l'affichage admin (mappe l'id de pack vers son nom).
export const MINUTES_OFFER_LABELS: Record<string, string> = Object.fromEntries(
  MINUTES_OFFERS.map((o) => [o.id, o.name]),
)
