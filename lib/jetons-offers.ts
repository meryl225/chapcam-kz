export type JetonsOffer = {
  id: string
  price: number
  jetons: number
  featured?: boolean
}

export const JETONS_OFFERS: JetonsOffer[] = [
  { id: 'jetons_100', price: 1000, jetons: 100 },
  { id: 'jetons_250', price: 2500, jetons: 250 },
  { id: 'jetons_500', price: 5000, jetons: 500, featured: true },
  { id: 'jetons_1000', price: 10000, jetons: 1000 },
]

export function getJetonsOffer(id: string) {
  return JETONS_OFFERS.find((offer) => offer.id === id)
}
