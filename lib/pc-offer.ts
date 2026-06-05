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
  price: number // FCFA, paiement unique
  description: string
  features: string[]
}

export const PC_OFFER: PcOffer = {
  id: 'pc',
  name: 'ChapCam PC — Mode Gamer',
  price: 50000,
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

// Lien de telechargement du logiciel (Cloudflare R2 ou autre). Configurable via
// variable d'environnement, avec un repli raisonnable.
export function getDesktopDownloadUrl(): string {
  return (
    process.env.DESKTOP_DOWNLOAD_URL ||
    process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL ||
    'https://chapcam.com/download'
  )
}

export function getPcOffer(id: string): PcOffer | undefined {
  return id === PC_OFFER.id ? PC_OFFER : undefined
}

export function isPcOffer(id: string): boolean {
  return id === PC_OFFER.id
}
