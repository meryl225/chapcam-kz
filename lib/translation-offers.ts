// Source de verite des packs de CREDITS "Traduction Video" (HeyGen).
// Achetables SEPAREMENT, sans forfait Live Swap : creditent directement le solde
// de credits Traduction (table translation_credits, voir lib/translation-quota.ts).
//
// Regles produit & MARGE :
// - 1 credit = 1 video traduite <= 60s dans 1 langue, mode Rapide.
// - Le mode Precision (meilleure synchro labiale) coute 2 credits.
// - Cout HeyGen mesure : ~1200 FCFA/min (Rapide), ~2400 FCFA/min (Precision).
//   Comme Precision coute 2 credits, le cout par credit est ~1200 FCFA constant.
// - Les prix ci-dessous garantissent une marge > 40% (per-credit >= 2000 F).
// - A l'achat, les credits s'ACCUMULENT au solde existant (pas d'expiration).

export interface TranslationOffer {
  id: string
  name: string
  price: number // FCFA
  credits: number // nombre de traductions (Rapide) creditees
  features: string[]
  highlight?: boolean
}

export const TRANSLATION_OFFERS: TranslationOffer[] = [
  {
    id: 'translation_pack_1',
    name: 'Traduction Unique',
    price: 2500,
    credits: 1,
    features: [
      '1 vidéo traduite (jusqu\u2019à 60s)',
      'Voix clonée + synchro labiale',
      'Sous-titres optionnels',
      'Sans forfait requis',
    ],
  },
  {
    id: 'translation_pack_3',
    name: 'Pack Multilingue',
    price: 6900,
    credits: 3,
    highlight: true,
    features: [
      '3 vidéos traduites (jusqu\u2019à 60s)',
      'Idéal pour toucher plusieurs pays',
      'Meilleur prix par traduction',
      'Sans forfait requis',
    ],
  },
  {
    id: 'translation_pack_8',
    name: 'Pack Créateur',
    price: 16000,
    credits: 8,
    features: [
      '8 vidéos traduites (jusqu\u2019à 60s)',
      'Tarif le plus avantageux',
      'Parfait pour une campagne',
      'Sans forfait requis',
    ],
  },
]

export function getTranslationOffer(id: string): TranslationOffer | undefined {
  return TRANSLATION_OFFERS.find((o) => o.id === id)
}

export function isTranslationOffer(id: string): boolean {
  return TRANSLATION_OFFERS.some((o) => o.id === id)
}

// Libelles pour l'affichage admin (mappe l'id de pack vers son nom).
export const TRANSLATION_OFFER_LABELS: Record<string, string> = Object.fromEntries(
  TRANSLATION_OFFERS.map((o) => [o.id, o.name]),
)
