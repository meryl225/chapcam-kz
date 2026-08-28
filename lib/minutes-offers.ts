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

// Helper : points credites = minutes * 60s * (points/seconde 720p).
const minutesToPoints = (min: number) => min * 60 * POINTS_PER_SECOND_SD

// --- Offre ANNIVERSAIRE "3 mois" (grille en minutes affichee dans le popup et
// sur la page de recharge). Tarif promo : 1 000 FCFA / minute de swap.
// Ces packs creditent des POINTS et n'affectent pas le forfait de l'utilisateur.
export const ANNIVERSARY_MINUTES_OFFERS: MinutesOffer[] = [
  { id: 'anniv_5', name: 'Forfait Testeur — 2 minutes', price: 5000, minutes: 2, points: minutesToPoints(2), validityDays: 30 },
  { id: 'anniv_10', name: '10 minutes de swap', price: 10000, minutes: 10, points: minutesToPoints(10), validityDays: 30 },
  { id: 'anniv_20', name: '20 minutes de swap', price: 20000, minutes: 20, points: minutesToPoints(20), validityDays: 30 },
  { id: 'anniv_50', name: '50 minutes de swap', price: 50000, minutes: 50, points: minutesToPoints(50), validityDays: 60 },
  { id: 'anniv_100', name: '100 minutes de swap', price: 100000, minutes: 100, points: minutesToPoints(100), validityDays: 90 },
]

export const MINUTES_OFFERS: MinutesOffer[] = [
  {
    id: 'minutes_4',
    name: '4 minutes supplémentaires',
    price: 10000,
    minutes: 4,
    points: 4 * 60 * POINTS_PER_SECOND_SD, // 480 points
    validityDays: 30,
  },
  // L'offre anniversaire fait partie du meme catalogue -> paiement + credit
  // des points geres par les memes routes serveur (source de verite unique).
  ...ANNIVERSARY_MINUTES_OFFERS,
]

// Offre par defaut (pack 4 min) utilisee par le bouton "+minutes" du Live Swap.
// Recherche par id (et non par index) pour rester stable si le tableau evolue.
export const MINUTES_OFFER = MINUTES_OFFERS.find((o) => o.id === 'minutes_4')!

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
