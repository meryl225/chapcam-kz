// ChapCam Numbers — domain types and realistic in-session sample data.
// NOTE: Demo data for a polished UI scaffold. No live telecom backend is wired.

export type NumberType = 'temporary' | 'long-term'
export type Capability = 'sms' | 'voice' | 'mms'
export type NumberStatus = 'active' | 'expiring' | 'expired'

export type Country = {
  code: string // ISO-2
  name: string
  dial: string // E.164 prefix
  flag: string // emoji
}

export type Provider = {
  id: string
  name: string
  reliability: number // 0-100
  avgDeliverySec: number
  hue: number
}

export type Listing = {
  id: string
  countryCode: string
  providerId: string
  type: NumberType
  price: number // USD
  stock: number
  availability: number // 0-100
  capabilities: Capability[]
}

export type OwnedNumber = {
  id: string
  e164: string
  countryCode: string
  providerId: string
  type: NumberType
  label: string
  status: NumberStatus
  purchasedAt: number
  expiresAt: number
  autoRenew: boolean
  messageCount: number
}

export type Message = {
  id: string
  numberId: string
  sender: string
  body: string
  receivedAt: number
  read: boolean
  archived: boolean
}

export type OrderStatus = 'completed' | 'active' | 'refunded' | 'failed'
export type Order = {
  id: string
  numberLabel: string
  e164: string
  countryCode: string
  providerId: string
  amount: number
  status: OrderStatus
  createdAt: number
}

export type TxKind = 'deposit' | 'purchase' | 'refund'
export type Transaction = {
  id: string
  kind: TxKind
  method: string
  amount: number // + deposit, - spend
  status: 'completed' | 'pending' | 'failed'
  createdAt: number
  reference: string
}

export type ApiKey = {
  id: string
  name: string
  prefix: string
  secret: string
  createdAt: number
  lastUsedAt: number | null
  scopes: string[]
}

export type SupportTicket = {
  id: string
  subject: string
  category: string
  status: 'open' | 'pending' | 'resolved'
  priority: 'low' | 'normal' | 'high'
  createdAt: number
  lastReplyAt: number
  messages: { from: 'user' | 'agent'; body: string; at: number }[]
}

const now = Date.now()
const HOUR = 3600_000
const DAY = 24 * HOUR

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { code: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { code: 'CI', name: "Côte d'Ivoire", dial: '+225', flag: '🇨🇮' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
]

export const PROVIDERS: Provider[] = [
  { id: 'nexa', name: 'Nexa Telecom', reliability: 99, avgDeliverySec: 3, hue: 217 },
  { id: 'orbit', name: 'Orbit Connect', reliability: 97, avgDeliverySec: 5, hue: 199 },
  { id: 'vela', name: 'Vela Mobile', reliability: 95, avgDeliverySec: 8, hue: 245 },
  { id: 'pulse', name: 'Pulse Networks', reliability: 98, avgDeliverySec: 4, hue: 188 },
  { id: 'meridian', name: 'Meridian SMS', reliability: 94, avgDeliverySec: 11, hue: 230 },
]

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

export const LISTINGS: Listing[] = (() => {
  const rand = rng(42)
  const out: Listing[] = []
  let i = 0
  for (const c of COUNTRIES) {
    const providerCount = 2 + Math.floor(rand() * 3)
    const shuffled = [...PROVIDERS].sort(() => rand() - 0.5).slice(0, providerCount)
    for (const p of shuffled) {
      const type: NumberType = rand() > 0.5 ? 'temporary' : 'long-term'
      const base = type === 'temporary' ? 0.4 : 4
      const price = +(base + rand() * (type === 'temporary' ? 2 : 12)).toFixed(2)
      out.push({
        id: `lst_${i++}`,
        countryCode: c.code,
        providerId: p.id,
        type,
        price,
        stock: 5 + Math.floor(rand() * 480),
        availability: 60 + Math.floor(rand() * 40),
        capabilities: rand() > 0.4 ? ['sms', 'voice'] : ['sms'],
      })
    }
  }
  return out
})()

export const INITIAL_OWNED: OwnedNumber[] = [
  { id: 'num_1', e164: '+1 415 555 0142', countryCode: 'US', providerId: 'nexa', type: 'long-term', label: 'Inscription — ligne US', status: 'active', purchasedAt: now - 12 * DAY, expiresAt: now + 18 * DAY, autoRenew: true, messageCount: 3 },
  { id: 'num_2', e164: '+44 20 7946 0958', countryCode: 'GB', providerId: 'pulse', type: 'temporary', label: 'Vérification QA', status: 'expiring', purchasedAt: now - 20 * HOUR, expiresAt: now + 4 * HOUR, autoRenew: false, messageCount: 2 },
  { id: 'num_3', e164: '+225 07 12 34 56', countryCode: 'CI', providerId: 'orbit', type: 'long-term', label: 'Ligne support — Abidjan', status: 'active', purchasedAt: now - 40 * DAY, expiresAt: now + 50 * DAY, autoRenew: true, messageCount: 1 },
]

export const INITIAL_MESSAGES: Message[] = [
  { id: 'm1', numberId: 'num_1', sender: 'STRIPE', body: 'Votre code de vérification Stripe est 482913.', receivedAt: now - 2 * HOUR, read: false, archived: false },
  { id: 'm2', numberId: 'num_1', sender: '+1 202 555 0173', body: 'Bonjour ! Je confirme notre appel de 15 h demain.', receivedAt: now - 6 * HOUR, read: true, archived: false },
  { id: 'm3', numberId: 'num_1', sender: 'GITHUB', body: "Votre code d'authentification GitHub : 771204", receivedAt: now - 26 * HOUR, read: true, archived: false },
  { id: 'm4', numberId: 'num_2', sender: 'WhatsApp', body: 'Code WhatsApp 901-233. Ne le partagez pas.', receivedAt: now - 3 * HOUR, read: false, archived: false },
  { id: 'm5', numberId: 'num_2', sender: 'Telegram', body: 'Code Telegram : 55012', receivedAt: now - 9 * HOUR, read: true, archived: false },
  { id: 'm6', numberId: 'num_3', sender: 'Orange CI', body: 'Bienvenue. Votre code est 6620.', receivedAt: now - 30 * HOUR, read: true, archived: false },
]

export const INITIAL_ORDERS: Order[] = [
  { id: 'ord_1041', numberLabel: 'Inscription — ligne US', e164: '+1 415 555 0142', countryCode: 'US', providerId: 'nexa', amount: 8.0, status: 'active', createdAt: now - 12 * DAY },
  { id: 'ord_1040', numberLabel: 'Vérification QA', e164: '+44 20 7946 0958', countryCode: 'GB', providerId: 'pulse', amount: 1.2, status: 'active', createdAt: now - 20 * HOUR },
  { id: 'ord_1039', numberLabel: 'Ligne support — Abidjan', e164: '+225 07 12 34 56', countryCode: 'CI', providerId: 'orbit', amount: 9.5, status: 'active', createdAt: now - 40 * DAY },
  { id: 'ord_1038', numberLabel: 'Test marketing DE', e164: '+49 30 5550 8841', countryCode: 'DE', providerId: 'vela', amount: 0.9, status: 'completed', createdAt: now - 6 * DAY },
  { id: 'ord_1037', numberLabel: 'Inscription temp. FR', e164: '+33 1 7550 1190', countryCode: 'FR', providerId: 'meridian', amount: 0.7, status: 'refunded', createdAt: now - 9 * DAY },
]

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 'tx_5012', kind: 'deposit', method: 'Wave', amount: 50, status: 'completed', createdAt: now - 13 * DAY, reference: 'WAVE-8841' },
  { id: 'tx_5011', kind: 'purchase', method: 'Wallet', amount: -8, status: 'completed', createdAt: now - 12 * DAY, reference: 'ord_1041' },
  { id: 'tx_5010', kind: 'deposit', method: 'USDT (TRC20)', amount: 100, status: 'completed', createdAt: now - 10 * DAY, reference: 'USDT-3a9f' },
  { id: 'tx_5009', kind: 'purchase', method: 'Wallet', amount: -9.5, status: 'completed', createdAt: now - 40 * DAY, reference: 'ord_1039' },
  { id: 'tx_5008', kind: 'refund', method: 'Wallet', amount: 0.7, status: 'completed', createdAt: now - 9 * DAY, reference: 'ord_1037' },
  { id: 'tx_5007', kind: 'deposit', method: 'Orange Money', amount: 25, status: 'pending', createdAt: now - 2 * HOUR, reference: 'OM-1029' },
]

export const INITIAL_API_KEYS: ApiKey[] = [
  { id: 'key_1', name: 'Production', prefix: 'cck_live_8f2a', secret: 'cck_live_8f2a9d3b71c64e02ab5f4729de10', createdAt: now - 30 * DAY, lastUsedAt: now - 2 * HOUR, scopes: ['numbers:read', 'numbers:write', 'messages:read'] },
  { id: 'key_2', name: 'Staging', prefix: 'cck_test_2b71', secret: 'cck_test_2b71c64e02ab5f4729de108f2a9d', createdAt: now - 14 * DAY, lastUsedAt: now - 4 * DAY, scopes: ['numbers:read', 'messages:read'] },
]

export const INITIAL_TICKETS: SupportTicket[] = [
  { id: 'tkt_3021', subject: 'SMS non reçus sur le numéro britannique', category: 'Réception SMS', status: 'pending', priority: 'high', createdAt: now - 5 * HOUR, lastReplyAt: now - 2 * HOUR, messages: [ { from: 'user', body: 'Mon numéro britannique ne reçoit pas les codes de vérification.', at: now - 5 * HOUR }, { from: 'agent', body: "Merci de nous avoir contactés — nous vérifions la route avec l'opérateur.", at: now - 2 * HOUR } ] },
  { id: 'tkt_3020', subject: "Facture d'octobre", category: 'Facturation', status: 'resolved', priority: 'normal', createdAt: now - 8 * DAY, lastReplyAt: now - 7 * DAY, messages: [{ from: 'user', body: "Puis-je obtenir une facture PDF pour octobre ?", at: now - 8 * DAY }] },
]

export const DAILY_ACTIVITY = Array.from({ length: 14 }, (_, i) => {
  const r = rng(100 + i)()
  return { day: new Date(now - (13 - i) * DAY).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), messages: 20 + Math.floor(r * 80), orders: 1 + Math.floor(r * 9) }
})

export const REVENUE_SERIES = Array.from({ length: 12 }, (_, i) => {
  const r = rng(200 + i)()
  return { month: new Date(now - (11 - i) * 30 * DAY).toLocaleDateString('en-US', { month: 'short' }), revenue: 400 + Math.floor(r * 2600) }
})

export const TOP_COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸', share: 34 },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', share: 22 },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', share: 18 },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', share: 14 },
  { code: 'IN', name: 'India', flag: '🇮🇳', share: 12 },
]

export const POPULAR_TYPES = [
  { label: 'Temporary — SMS', share: 46 },
  { label: 'Long-term — SMS + Voice', share: 33 },
  { label: 'Long-term — SMS', share: 21 },
]

export const FUNDING_METHODS = [
  { id: 'orange', name: 'Orange Money', kind: 'Mobile Money', hue: 28 },
  { id: 'mtn', name: 'MTN Money', kind: 'Mobile Money', hue: 48 },
  { id: 'moov', name: 'Moov Money', kind: 'Mobile Money', hue: 211 },
  { id: 'wave', name: 'Wave', kind: 'Mobile Money', hue: 199 },
  { id: 'visa', name: 'Visa', kind: 'Card', hue: 222 },
  { id: 'mastercard', name: 'Mastercard', kind: 'Card', hue: 18 },
  { id: 'usdt', name: 'USDT (TRC20)', kind: 'Crypto', hue: 152 },
]

// ---- Admin sample data ----
export const ADMIN_USERS = [
  { id: 'usr_8841', name: 'Aïcha Koné', email: 'aicha@acme.io', plan: 'Scale', balance: 248.5, numbers: 12, status: 'active', risk: 'low', joinedAt: now - 120 * DAY },
  { id: 'usr_8840', name: 'James Carter', email: 'james@northwind.dev', plan: 'Growth', balance: 64.0, numbers: 5, status: 'active', risk: 'low', joinedAt: now - 80 * DAY },
  { id: 'usr_8839', name: 'Priya Nair', email: 'priya@finlytics.in', plan: 'Starter', balance: 9.25, numbers: 2, status: 'active', risk: 'medium', joinedAt: now - 40 * DAY },
  { id: 'usr_8838', name: 'Marco Rossi', email: 'marco@quickship.eu', plan: 'Growth', balance: 0.0, numbers: 0, status: 'suspended', risk: 'high', joinedAt: now - 20 * DAY },
  { id: 'usr_8837', name: 'Fatou Diallo', email: 'fatou@paygo.ci', plan: 'Scale', balance: 512.75, numbers: 23, status: 'active', risk: 'low', joinedAt: now - 200 * DAY },
]

export const ADMIN_RISK_EVENTS = [
  { id: 're_1', user: 'marco@quickship.eu', type: 'Vélocité', detail: '40 numéros temporaires achetés en 5 min', severity: 'high', at: now - 3 * HOUR },
  { id: 're_2', user: 'priya@finlytics.in', type: 'Incohérence géo.', detail: 'Connexion depuis 3 pays en 1 heure', severity: 'medium', at: now - 9 * HOUR },
  { id: 're_3', user: 'unknown@temp.io', type: 'E-mail jetable', detail: "Inscription bloquée à l'enregistrement", severity: 'low', at: now - 26 * HOUR },
]

export const ADMIN_LOGS = [
  { id: 'log_1', actor: 'admin@chapcam.com', action: 'Utilisateur marco@quickship.eu suspendu', at: now - 2 * HOUR },
  { id: 'log_2', actor: 'admin@chapcam.com', action: 'Commande ord_1037 remboursée (0,70 $)', at: now - 9 * DAY },
  { id: 'log_3', actor: 'system', action: 'Opérateur Vela Mobile signalé dégradé', at: now - 14 * HOUR },
]

// ---- helpers ----
export const countryByCode = (code: string) => COUNTRIES.find((c) => c.code === code)
export const providerById = (id: string) => PROVIDERS.find((p) => p.id === id)

export function formatUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function timeAgo(ms: number) {
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs} h`
  const days = Math.floor(hrs / 24)
  return `il y a ${days} j`
}

export function timeLeft(expiresAt: number) {
  const diff = expiresAt - Date.now()
  if (diff <= 0) return 'expiré'
  const hrs = Math.floor(diff / HOUR)
  if (hrs < 24) return `${hrs} h restantes`
  const days = Math.floor(hrs / 24)
  return `${days} j restants`
}

export function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric' })
}
