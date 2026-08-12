// Tarification du Live Swap — SOURCE UNIQUE DE VERITE (client + serveur).
//
// Le 1080p (VIP) coute plus cher a produire cote Decart (GPU HD). On facture
// donc le HD plus cher que le 720p pour que les points consommes collent au
// cout GPU reel. Comme la resolution est fixe pour toute la duree d'une
// session, le ratio points_used / duration_seconds suffit ensuite a distinguer
// une session HD (4 pts/s) d'une session SD (2 pts/s) — pas besoin de colonne
// dediee dans swap_sessions.

/** 720p (offres standard) : tarif de base. */
export const POINTS_PER_SECOND_SD = 2
/** 1080p (VIP) : facture 2x le 720p (marge au-dessus du surcout GPU Decart). */
export const POINTS_PER_SECOND_HD = 4

export type SwapResolution = '720p' | '1080p'

/** Points debites par seconde selon la resolution reellement active. */
export function pointsPerSecond(resolution?: SwapResolution | string | null): number {
  return resolution === '1080p' ? POINTS_PER_SECOND_HD : POINTS_PER_SECOND_SD
}

// === Reservation de warmup (anti sessions "fantomes") ===
// Decart facture le GPU des l'OUVERTURE du WebSocket : chargement du modele,
// warmup, negociation... AVANT que le swap ne soit "live". Or le client ne
// facture qu'a partir de `isConnected` (swap actif). Cette fenetre de connexion
// n'etait donc JAMAIS facturee : si le client mourait pendant le warmup (0
// heartbeat), le token avait brule du GPU sans aucune deduction -> session
// "fantome". On reserve donc un forfait de warmup DES l'emission du token.
// C'est une periode DISTINCTE du swap actif : aucun double-comptage avec les
// heartbeats, qui s'ajoutent par-dessus.
/** Duree de warmup/connexion facturee a l'emission du token (secondes). */
export const RESERVATION_SECONDS = 5
/** Points reserves a l'emission du token (tarif de base 720p). */
export const RESERVATION_POINTS = POINTS_PER_SECOND_SD * RESERVATION_SECONDS
