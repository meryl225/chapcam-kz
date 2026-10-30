// Achats Apple (App Store, directs ou via RevenueCat) suspendus : seuls ces
// comptes sont encore credites. Les remboursements restent toujours appliques.
const APPLE_PURCHASE_ALLOWED_EMAILS = new Set([
  'bebi.kacou11@gmail.com',
  'fanny.guck@gmail.com',
])

export function isApplePurchaseAllowed(email: string | null | undefined) {
  return Boolean(email) && APPLE_PURCHASE_ALLOWED_EMAILS.has(email!.trim().toLowerCase())
}
