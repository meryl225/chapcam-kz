// Tarification du Live Swap — SOURCE UNIQUE DE VERITE (client + serveur).
//
// Le 1080p (VIP) coute plus cher a produire cote Decart (GPU HD). On facture
// donc le HD plus cher que le 720p pour que les points consommes collent au
// cout GPU reel. Comme la resolution est fixe pour toute la duree d'une
// session, le ratio points_used / duration_seconds suffit ensuite a distinguer
// une session HD (3 pts/s) d'une session SD (2 pts/s) — pas besoin de colonne
// dediee dans swap_sessions.

/** 720p (offres standard) : tarif de base. */
export const POINTS_PER_SECOND_SD = 2
/** 1080p (VIP) : plus cher car GPU HD plus couteux chez Decart. */
export const POINTS_PER_SECOND_HD = 3

export type SwapResolution = '720p' | '1080p'

/** Points debites par seconde selon la resolution reellement active. */
export function pointsPerSecond(resolution?: SwapResolution | string | null): number {
  return resolution === '1080p' ? POINTS_PER_SECOND_HD : POINTS_PER_SECOND_SD
}
