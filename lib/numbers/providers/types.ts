import 'server-only'
import type { CanonCountry, CanonService } from '@/lib/numbers/catalog'

export type ProviderId = 'fivesim' | 'smsman' | 'smspool'

export type Quote = {
  provider: ProviderId
  costUsd: number
  count: number // disponibilité approximative
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
  /** Achète un numéro. Lève une erreur si indisponible. */
  purchase(country: CanonCountry, service: CanonService): Promise<PurchaseResult>
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
  rent?(country: CanonCountry, service: CanonService, minHours: number): Promise<PurchaseResult>
}

export function normalizePhone(raw: string): string {
  const digits = String(raw).replace(/[^\d]/g, '')
  return digits ? `+${digits}` : String(raw)
}
