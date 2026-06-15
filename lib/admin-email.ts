// Constante partagée (sans dépendance serveur) pour identifier l'administrateur
// aussi bien côté client que serveur. Source unique de vérité pour l'email admin.
export const ADMIN_EMAIL = 'fanny.guck@gmail.com'

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()
}
