// Source de verite des packs de CREDITS "Motion Control" (Kling via fal.ai).
// Ces packs sont achetables SEPAREMENT, sans forfait Live Swap : ils creditent
// directement le solde de credits Motion (1 credit = 1 clip de 10s max), stocke
// dans Neon (table motion_credits, voir lib/motion-quota.ts).
//
// Regles produit & MARGE :
// - 1 credit = 1 clip de 10 secondes maximum (duree plafonnee cote serveur).
// - Cout fal mesure : ~760 FCFA/clip (Standard) a ~1010 FCFA/clip (Pro).
// - Les prix ci-dessous sont calibres sur le PIRE cas (Pro) pour garantir une
//   marge > 45% meme si le client genere uniquement en qualite Pro.
// - A l'achat, les credits s'ACCUMULENT au solde existant (pas d'expiration).

export interface MotionOffer {
  id: string
  name: string
  price: number // FCFA
  credits: number // nombre de clips de 10s credites
  features: string[]
  highlight?: boolean // mis en avant dans l'UI
}

export const MOTION_OFFERS: MotionOffer[] = [
  {
    id: 'motion_pack_1',
    name: 'Clip Unique',
    price: 2500,
    credits: 1,
    features: [
      '1 clip Motion Control de 10s',
      'Transfert de mouvement Kling',
      'Sans forfait Live Swap requis',
    ],
  },
  {
    id: 'motion_pack_3',
    name: 'Pack Créateur',
    price: 6500,
    credits: 3,
    highlight: true,
    features: [
      '3 clips Motion Control de 10s',
      'Qualité Standard ou Pro au choix',
      'Meilleur prix par clip',
      'Sans forfait Live Swap requis',
    ],
  },
  {
    id: 'motion_pack_8',
    name: 'Pack Studio',
    price: 15000,
    credits: 8,
    features: [
      '8 clips Motion Control de 10s',
      'Qualité Standard ou Pro au choix',
      'Tarif le plus avantageux',
      'Sans forfait Live Swap requis',
    ],
  },
]

export function getMotionOffer(id: string): MotionOffer | undefined {
  return MOTION_OFFERS.find((o) => o.id === id)
}

export function isMotionOffer(id: string): boolean {
  return MOTION_OFFERS.some((o) => o.id === id)
}

// Libelles pour l'affichage admin (mappe l'id de pack vers son nom).
export const MOTION_OFFER_LABELS: Record<string, string> = Object.fromEntries(
  MOTION_OFFERS.map((o) => [o.id, o.name]),
)
