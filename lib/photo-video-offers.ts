// Source de verite des packs de CREDITS "Studio Photo en Video". Ces packs sont
// achetables SEPAREMENT, sans forfait Live Swap : ils creditent directement le
// solde de credits photo-video (1 credit = 1 video parlante de 30 secondes),
// stocke dans Neon (table photo_video_credits, voir lib/photo-video-quota.ts).
//
// Regles produit :
// - 1 credit = 1 video de 30s.
// - A l'achat, les credits s'ACCUMULENT au solde existant (pas d'expiration).
// - Cout HeyGen mesure ~470 FCFA / video de 30s -> marge confortable.

export interface PhotoVideoOffer {
  id: string
  name: string
  price: number // FCFA
  credits: number // nombre de videos de 30s creditees
  features: string[]
  highlight?: boolean // mis en avant dans l'UI
}

export const PHOTO_VIDEO_OFFERS: PhotoVideoOffer[] = [
  {
    id: 'pv_pack_3',
    name: 'Pack Découverte',
    price: 3000,
    credits: 3,
    features: [
      '3 vidéos de 30 secondes',
      'Voix ChapCam incluses',
      'Sans forfait Live Swap requis',
    ],
  },
  {
    id: 'pv_pack_8',
    name: 'Pack Créateur',
    price: 7000,
    credits: 8,
    highlight: true,
    features: [
      '8 vidéos de 30 secondes',
      'Clonage de voix inclus',
      'Gestes & expressivité',
      'Sans forfait Live Swap requis',
    ],
  },
  {
    id: 'pv_pack_20',
    name: 'Pack Pro',
    price: 15000,
    credits: 20,
    features: [
      '20 vidéos de 30 secondes',
      'Clonage de voix inclus',
      'Meilleur prix par vidéo',
      'Sans forfait Live Swap requis',
    ],
  },
]

export function getPhotoVideoOffer(id: string): PhotoVideoOffer | undefined {
  return PHOTO_VIDEO_OFFERS.find((o) => o.id === id)
}

export function isPhotoVideoOffer(id: string): boolean {
  return PHOTO_VIDEO_OFFERS.some((o) => o.id === id)
}

// Libelles pour l'affichage admin (mappe l'id de pack vers son nom).
export const PHOTO_VIDEO_OFFER_LABELS: Record<string, string> = Object.fromEntries(
  PHOTO_VIDEO_OFFERS.map((o) => [o.id, o.name]),
)
