// ChapCam Numbers — data layer
// Realistic mock data for the virtual phone number marketplace.
// No real telecom backend is wired; this models providers, countries,
// available inventory, owned numbers, inbound SMS, and API keys.

export type NumberType = 'temporary' | 'long-term'
export type Capability = 'sms' | 'voice' | 'mms'
export type NumberStatus = 'active' | 'expiring' | 'released'

export interface Country {
  code: string // ISO 3166-1 alpha-2
  name: string
  flag: string // emoji
  dialCode: string
}

export interface Provider {
  id: string
  name: string
  reliability: number // 0-100
  latencyMs: number
}

export interface AvailableNumber {
  id: string
  number: string // E.164
  countryCode: string
  region: string
  providerId: string
  type: NumberType
  capabilities: Capability[]
  monthlyPrice: number // USD
  setupPrice: number // USD, one-time
}

export interface OwnedNumber {
  id: string
  number: string
  countryCode: string
  region: string
  providerId: string
  type: NumberType
  capabilities: Capability[]
  status: NumberStatus
  label: string
  monthlyPrice: number
  purchasedAt: string // ISO
  renewsAt: string // ISO
  autoRenew: boolean
}

export type MessageKind = 'otp' | 'verification' | 'general'

export interface SmsMessage {
  id: string
  numberId: string
  sender: string
  body: string
  receivedAt: string // ISO
  read: boolean
  kind: MessageKind
}

export interface ApiKey {
  id: string
  name: string
  token: string
  scope: 'read' | 'read-write' | 'full'
  createdAt: string
  lastUsedAt: string | null
  live: boolean
}

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dialCode: '+49' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', dialCode: '+31' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', dialCode: '+34' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', dialCode: '+46' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', dialCode: '+48' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dialCode: '+61' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', dialCode: '+55' },
  { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91' },
]

export const PROVIDERS: Provider[] = [
  { id: 'aerial', name: 'Aerial Telecom', reliability: 99.95, latencyMs: 120 },
  { id: 'nimbus', name: 'Nimbus Mobile', reliability: 99.9, latencyMs: 180 },
  { id: 'orbit', name: 'Orbit Carrier', reliability: 99.8, latencyMs: 210 },
  { id: 'vertex', name: 'Vertex Networks', reliability: 99.99, latencyMs: 90 },
  { id: 'relay', name: 'Relay Comms', reliability: 99.7, latencyMs: 240 },
]

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code)
}

export function getProvider(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

// Deterministic pseudo-number generator so SSR and client match.
function buildNumber(dialCode: string, seed: number): string {
  const base = (seed * 7919) % 9000000 + 1000000
  const area = 200 + (seed % 799)
  return `${dialCode} ${area} ${String(base).slice(0, 3)} ${String(base).slice(3)}`
}

const REGIONS: Record<string, string[]> = {
  US: ['New York, NY', 'San Francisco, CA', 'Austin, TX', 'Miami, FL'],
  GB: ['London', 'Manchester', 'Bristol'],
  CA: ['Toronto, ON', 'Vancouver, BC'],
  FR: ['Paris', 'Lyon', 'Marseille'],
  DE: ['Berlin', 'Munich', 'Hamburg'],
  NL: ['Amsterdam', 'Rotterdam'],
  ES: ['Madrid', 'Barcelona'],
  SE: ['Stockholm', 'Gothenburg'],
  PL: ['Warsaw', 'Kraków'],
  AU: ['Sydney, NSW', 'Melbourne, VIC'],
  BR: ['São Paulo', 'Rio de Janeiro'],
  IN: ['Mumbai', 'Bengaluru', 'Delhi'],
}

const CAP_SETS: Capability[][] = [
  ['sms'],
  ['sms', 'voice'],
  ['sms', 'voice', 'mms'],
  ['sms', 'mms'],
]

// Build a deterministic inventory of available numbers.
export const AVAILABLE_NUMBERS: AvailableNumber[] = (() => {
  const out: AvailableNumber[] = []
  let seed = 17
  for (const country of COUNTRIES) {
    const count = 4
    for (let i = 0; i < count; i++) {
      seed += 13
      const provider = PROVIDERS[seed % PROVIDERS.length]
      const type: NumberType = i % 3 === 0 ? 'temporary' : 'long-term'
      const caps = CAP_SETS[seed % CAP_SETS.length]
      const regions = REGIONS[country.code] ?? [country.name]
      const monthly = type === 'temporary'
        ? Number((0.5 + (seed % 5) * 0.25).toFixed(2))
        : Number((2 + (seed % 8) * 0.5).toFixed(2))
      out.push({
        id: `av_${country.code}_${i}`,
        number: buildNumber(country.dialCode, seed),
        countryCode: country.code,
        region: regions[i % regions.length],
        providerId: provider.id,
        type,
        capabilities: caps,
        monthlyPrice: monthly,
        setupPrice: type === 'temporary' ? 0 : Number((0.5 + (seed % 3) * 0.5).toFixed(2)),
      })
    }
  }
  return out
})()

const now = Date.now()
const days = (n: number) => 1000 * 60 * 60 * 24 * n
const hours = (n: number) => 1000 * 60 * 60 * n
const mins = (n: number) => 1000 * 60 * n

export const SEED_OWNED: OwnedNumber[] = [
  {
    id: 'own_1',
    number: '+1 415 555 0192',
    countryCode: 'US',
    region: 'San Francisco, CA',
    providerId: 'vertex',
    type: 'long-term',
    capabilities: ['sms', 'voice', 'mms'],
    status: 'active',
    label: 'Production — Auth OTP',
    monthlyPrice: 4.5,
    purchasedAt: new Date(now - days(64)).toISOString(),
    renewsAt: new Date(now + days(26)).toISOString(),
    autoRenew: true,
  },
  {
    id: 'own_2',
    number: '+44 207 946 0813',
    countryCode: 'GB',
    region: 'London',
    providerId: 'aerial',
    type: 'long-term',
    capabilities: ['sms', 'voice'],
    status: 'active',
    label: 'EU Support Line',
    monthlyPrice: 3.0,
    purchasedAt: new Date(now - days(120)).toISOString(),
    renewsAt: new Date(now + days(11)).toISOString(),
    autoRenew: true,
  },
  {
    id: 'own_3',
    number: '+49 30 901820',
    countryCode: 'DE',
    region: 'Berlin',
    providerId: 'nimbus',
    type: 'temporary',
    capabilities: ['sms'],
    status: 'expiring',
    label: 'QA — Staging verifications',
    monthlyPrice: 0.75,
    purchasedAt: new Date(now - days(6)).toISOString(),
    renewsAt: new Date(now + days(1)).toISOString(),
    autoRenew: false,
  },
]

export const SEED_MESSAGES: SmsMessage[] = [
  {
    id: 'msg_1',
    numberId: 'own_1',
    sender: 'Stripe',
    body: 'Your Stripe verification code is 729104. It expires in 10 minutes.',
    receivedAt: new Date(now - mins(4)).toISOString(),
    read: false,
    kind: 'otp',
  },
  {
    id: 'msg_2',
    numberId: 'own_1',
    sender: 'WhatsApp',
    body: 'WhatsApp code 481-205. Don\u2019t share this code with others.',
    receivedAt: new Date(now - mins(38)).toISOString(),
    read: false,
    kind: 'verification',
  },
  {
    id: 'msg_3',
    numberId: 'own_2',
    sender: 'Telegram',
    body: 'Telegram code: 53914. You can also tap this link to log in: t.me/login/53914',
    receivedAt: new Date(now - hours(2)).toISOString(),
    read: true,
    kind: 'otp',
  },
  {
    id: 'msg_4',
    numberId: 'own_2',
    sender: '+44 7700 900441',
    body: 'Hi, following up on the support ticket #4821 — is the line still active?',
    receivedAt: new Date(now - hours(5)).toISOString(),
    read: true,
    kind: 'general',
  },
  {
    id: 'msg_5',
    numberId: 'own_3',
    sender: 'Google',
    body: 'G-558210 is your Google verification code.',
    receivedAt: new Date(now - hours(9)).toISOString(),
    read: true,
    kind: 'otp',
  },
  {
    id: 'msg_6',
    numberId: 'own_1',
    sender: 'Coinbase',
    body: 'Coinbase: Your authentication code is 094412. Never share it.',
    receivedAt: new Date(now - hours(26)).toISOString(),
    read: true,
    kind: 'otp',
  },
]

export const SEED_API_KEYS: ApiKey[] = [
  {
    id: 'key_1',
    name: 'Production server',
    token: 'cck_live_8Kd92Hf0aLp4Rn7xQv31Bz',
    scope: 'full',
    createdAt: new Date(now - days(210)).toISOString(),
    lastUsedAt: new Date(now - mins(12)).toISOString(),
    live: true,
  },
  {
    id: 'key_2',
    name: 'Staging worker',
    token: 'cck_test_2Pm51Wq8cVt0Yh6jLs94Df',
    scope: 'read-write',
    createdAt: new Date(now - days(54)).toISOString(),
    lastUsedAt: new Date(now - hours(3)).toISOString(),
    live: false,
  },
]

// Inbound senders used to simulate live SMS arriving.
export const SIMULATED_SENDERS: { sender: string; body: (code: string) => string; kind: MessageKind }[] = [
  { sender: 'Stripe', body: (c) => `Your Stripe verification code is ${c}.`, kind: 'otp' },
  { sender: 'Discord', body: (c) => `Your Discord verification code is ${c}.`, kind: 'verification' },
  { sender: 'Uber', body: (c) => `${c} is your Uber code. Reply STOP to unsubscribe.`, kind: 'otp' },
  { sender: 'Amazon', body: (c) => `${c} is your Amazon OTP. Do not share it with anyone.`, kind: 'otp' },
  { sender: 'OpenAI', body: (c) => `Your OpenAI verification code is ${c}.`, kind: 'verification' },
  { sender: 'Airbnb', body: (c) => `Your Airbnb code is ${c}. We will never ask for it.`, kind: 'otp' },
]

export function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 899999))
}

export const USAGE_7D: { day: string; received: number; sent: number }[] = [
  { day: 'Mon', received: 142, sent: 38 },
  { day: 'Tue', received: 189, sent: 51 },
  { day: 'Wed', received: 164, sent: 44 },
  { day: 'Thu', received: 221, sent: 60 },
  { day: 'Fri', received: 276, sent: 72 },
  { day: 'Sat', received: 198, sent: 41 },
  { day: 'Sun', received: 167, sent: 35 },
]

export function capabilityLabel(c: Capability): string {
  return c === 'sms' ? 'SMS' : c === 'voice' ? 'Voice' : 'MMS'
}

export function formatPrice(n: number): string {
  return `$${n.toFixed(2)}`
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
