// Source de verite de l'offre "ChapCam PC" (logiciel Windows standalone).
// Achat unique a vie : l'utilisateur paie une fois, recoit une cle de licence
// + un lien de telechargement. Aucun abonnement, le face swap tourne sur le
// GPU local du client et sort vers une camera virtuelle.
//
// Cette offre est SEPAREE des formules a points (lib/plans.ts), de l'offre
// Live Pro (lib/live-offers.ts) et des frais d'installation (lib/install-offer.ts).

export interface PcOffer {
  id: string
  name: string
  price: number // FCFA, prix promo (paiement unique)
  originalPrice: number // FCFA, prix normal barre
  discountPercent: number // % de reduction affiche
  description: string
  features: string[]
}

export const PC_OFFER: PcOffer = {
  id: 'pc',
  name: 'ChapCam PC — Logiciel a vie',
  price: 50000,
  originalPrice: 100000,
  discountPercent: 50,
  description:
    "Utilise la puissance de ton PC. Aucune connexion internet requise apres installation. Compatible WhatsApp, Zoom, Discord, TikTok Live.",
  features: [
    'Face swap temps reel sur ton GPU local',
    'Camera virtuelle (WhatsApp, Zoom, Discord, TikTok Live)',
    'Aucun abonnement, paiement unique',
    'Fonctionne sans internet',
    'Meme qualite que les meilleurs outils pro',
  ],
}

// Lien de telechargement du logiciel ChapCam PC.
// Repli par defaut : le fichier Google Drive fourni. Peut etre surcharge a tout
// moment via la variable d'environnement DESKTOP_DOWNLOAD_URL (ex: quand on
// migrera vers un hebergement direct type Cloudflare R2).
export const DEFAULT_DESKTOP_DOWNLOAD_URL =
  'https://drive.google.com/file/d/1E_o7kFtBHKCkLBxnjhxLpPduNqdAqq1O/view?usp=sharing'

export function getDesktopDownloadUrl(): string {
  return (
    process.env.DESKTOP_DOWNLOAD_URL ||
    process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL ||
    DEFAULT_DESKTOP_DOWNLOAD_URL
  )
}

export function getPcOffer(id: string): PcOffer | undefined {
  return id === PC_OFFER.id ? PC_OFFER : undefined
}

export function isPcOffer(id: string): boolean {
  return id === PC_OFFER.id
}
