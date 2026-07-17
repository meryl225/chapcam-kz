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
  requirement: string
  features: string[]
}

export const PC_OFFER: PcOffer = {
  id: 'pc',
  name: 'ChapCam PC — Logiciel a vie',
  price: 50000,
  originalPrice: 100000,
  discountPercent: 50,
  description:
    "Change uniquement le visage (le corps n'est pas transforme). Utilise la puissance de ton ordinateur. Compatible Windows ET MacBook. Aucune connexion internet requise apres installation. Compatible WhatsApp, Zoom, Discord, TikTok Live.",
  requirement:
    "Compatible Windows et MacBook. Vous pouvez installer sur tout type d'ordinateur, mais une carte graphique GPU dediee (type PC Gamer) est recommandee pour de meilleures performances.",
  features: [
    'Change uniquement le visage (le corps n\'est pas transforme)',
    'Compatible Windows et MacBook',
    'GPU dedie (PC Gamer) recommande pour de meilleures performances',
    'Face swap temps reel sur ton GPU local',
    'Camera virtuelle (WhatsApp, Zoom, Discord, TikTok Live)',
    'Aucun abonnement, paiement unique',
    'Fonctionne sans internet',
    'Meme qualite que les meilleurs outils pro',
  ],
}

// Lien de telechargement du logiciel ChapCam PC (Windows).
// Surchageable via la variable d'environnement DESKTOP_DOWNLOAD_URL.
export const DEFAULT_DESKTOP_DOWNLOAD_URL =
  'https://drive.google.com/file/d/1kzFOUM6TseywncgcNcyG0x9d5yJJ1DSj/view?usp=drive_link'

export function getDesktopDownloadUrl(): string {
  return (
    process.env.DESKTOP_DOWNLOAD_URL ||
    process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL ||
    DEFAULT_DESKTOP_DOWNLOAD_URL
  )
}

// Lien de telechargement de la version MacBook de ChapCam PC.
// Surchageable via la variable d'environnement DESKTOP_DOWNLOAD_URL_MAC.
export const DEFAULT_DESKTOP_DOWNLOAD_URL_MAC =
  'https://drive.google.com/file/d/1ZMpAYb3_3momzcTUjCRi-GiXQvUQhvMt/view?usp=drive_link'

export function getDesktopDownloadUrlMac(): string {
  return (
    process.env.DESKTOP_DOWNLOAD_URL_MAC ||
    process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL_MAC ||
    DEFAULT_DESKTOP_DOWNLOAD_URL_MAC
  )
}

// Fin de l'offre de lancement (prix promo 50 000 FCFA). Apres cette date,
// le prix officiel passe a 100 000 FCFA. Surcharge possible via la variable
// d'environnement NEXT_PUBLIC_PC_LAUNCH_END (format ISO, ex: 2026-06-20T23:59:59Z).
// Relance : valable jusqu'au dimanche 21 juin 2026 a 23h heure du Cameroun (WAT, UTC+1).
export const PC_LAUNCH_OFFER_END = '2026-06-21T22:00:00Z'

export function getPcLaunchOfferEnd(): string {
  return process.env.NEXT_PUBLIC_PC_LAUNCH_END || PC_LAUNCH_OFFER_END
}

export function getPcOffer(id: string): PcOffer | undefined {
  return id === PC_OFFER.id ? PC_OFFER : undefined
}

export function isPcOffer(id: string): boolean {
  return id === PC_OFFER.id
}
