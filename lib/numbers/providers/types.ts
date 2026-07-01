import 'server-only'
import type { CanonCountry, CanonService } from '@/lib/numbers/catalog'

export type ProviderId = 'smsman'

/**
 * Seuil minimum de taux de réussite (en %) visé pour la sélection des numéros.
 * On privilégie toujours les offres dont le taux annoncé atteint ce seuil.
 */
export const MIN_SUCCESS_RATE = 70
/**
 * Taux supposé quand un fournisseur ne renvoie pas l'information (ex: sms-man).
 * Fixé au seuil pour ne pas exclure ces offres par défaut, sans les surclasser.
 */
export const DEFAULT_SUCCESS_RATE = 70

export type Quote = {
  provider: ProviderId
  costUsd: number
  count: number // disponibilité approximative
  successRate?: number // taux de réussite annoncé par le fournisseur (0-100), si connu
}

export type PurchaseResult = {
  provider: ProviderId
  providerOrder: string
  phone: string // E.164 avec +, sans espaces
  costUsd: number
  expiresAt: Date | null
}

export type CodeResult = {
  status: 'waiting' | 'received' | 'cancelled'
  code?: string | null
  fullSms?: string | null
}

export interface ProviderAdapter {
  id: ProviderId
  name: string
  /** Coût + disponibilité pour un pays/service, ou null si indisponible. */
  quote(country: CanonCountry, service: CanonService): Promise<Quote | null>
  /**
   * Achète un numéro. Lève une erreur si indisponible.
   * @param maxCostUsd Coût fournisseur maximum accepté (USD). Si fourni, le
   * fournisseur ne doit pas assigner un numéro plus cher (plafond anti-perte).
   */
  purchase(country: CanonCountry, service: CanonService, maxCostUsd?: number): Promise<PurchaseResult>
  /** Récupère le statut + code SMS d'une commande. */
  getCode(providerOrder: string): Promise<CodeResult>
  /** Annule la commande (remboursement côté fournisseur si applicable). */
  cancel(providerOrder: string): Promise<void>
  /** Clôture la commande après réception (optionnel). */
  finish?(providerOrder: string): Promise<void>

  // --- Location (numéro réutilisable, multi-SMS) — optionnel par fournisseur ---
  /** Devis de location ; null si la location n'est pas disponible pour ce pays/service. */
  rentQuote?(country: CanonCountry, service: CanonService, minHours: number): Promise<Quote | null>
  /** Loue un numéro. Lève une erreur si indisponible. expiresAt = fin réelle imposée par le fournisseur. */
  rent?(country: CanonCountry, service: CanonService, minHours: number, maxCostUsd?: number): Promise<PurchaseResult>
}

export function normalizePhone(raw: string): string {
  const digits = String(raw).replace(/[^\d]/g, '')
  return digits ? `+${digits}` : String(raw)
}
