'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  type OwnedNumber, type Message, type Transaction, type ApiKey, type Order, type SupportTicket, type Listing,
  countryByCode,
} from '@/lib/numbers/data'

type Toast = { id: number; title: string; desc?: string }

export type AccountUser = { name: string; email: string }

type Ctx = {
  user: AccountUser
  balance: number
  owned: OwnedNumber[]
  messages: Message[]
  transactions: Transaction[]
  orders: Order[]
  apiKeys: ApiKey[]
  tickets: SupportTicket[]
  unreadCount: number
  buyNumber: (listing: Listing, label: string) => boolean
  releaseNumber: (id: string) => void
  toggleAutoRenew: (id: string) => void
  renameNumber: (id: string, label: string) => void
  markRead: (id: string) => void
  markAllRead: () => void
  archiveMessage: (id: string) => void
  deposit: (amount: number, method: string) => void
  createApiKey: (name: string) => ApiKey
  revokeApiKey: (id: string) => void
  createTicket: (subject: string, category: string, priority: SupportTicket['priority'], body: string) => void
  toasts: Toast[]
  pushToast: (title: string, desc?: string) => void
}

const NumbersContext = createContext<Ctx | null>(null)

export function useNumbers() {
  const ctx = useContext(NumbersContext)
  if (!ctx) throw new Error('useNumbers must be used within NumbersProvider')
  return ctx
}

let idc = 1000
const nextId = (p: string) => `${p}_${++idc}`

export function NumbersProvider({ user, children }: { user: AccountUser; children: ReactNode }) {
  // Compte neuf : aucun solde, numéro, message ou historique tant que rien n'a
  // été acheté. Ces données seront alimentées par les API ChapCam.
  const [balance, setBalance] = useState(0)
  const [owned, setOwned] = useState<OwnedNumber[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])

  const pushToast = (title: string, desc?: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, title, desc }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }

  const unreadCount = useMemo(() => messages.filter((m) => !m.read && !m.archived).length, [messages])

  const buyNumber: Ctx['buyNumber'] = (listing, label) => {
    if (balance < listing.price) {
      pushToast('Solde insuffisant', 'Ajoutez des fonds à votre portefeuille pour continuer.')
      return false
    }
    const country = countryByCode(listing.countryCode)
    const e164 = `${country?.dial ?? '+1'} ${Math.floor(100 + Math.random() * 899)} ${Math.floor(1000 + Math.random() * 8999)}`
    const id = nextId('num')
    const duration = listing.type === 'temporary' ? 24 * 3600_000 : 30 * 24 * 3600_000
    const num: OwnedNumber = {
      id, e164, countryCode: listing.countryCode, providerId: listing.providerId, type: listing.type,
      label: label || `Numéro ${country?.name}`, status: 'active', purchasedAt: Date.now(),
      expiresAt: Date.now() + duration, autoRenew: listing.type === 'long-term', messageCount: 0,
    }
    setOwned((l) => [num, ...l])
    setBalance((b) => +(b - listing.price).toFixed(2))
    setTransactions((t) => [{ id: nextId('tx'), kind: 'purchase', method: 'Wallet', amount: -listing.price, status: 'completed', createdAt: Date.now(), reference: id }, ...t])
    setOrders((o) => [{ id: nextId('ord'), numberLabel: num.label, e164, countryCode: listing.countryCode, providerId: listing.providerId, amount: listing.price, status: 'active', createdAt: Date.now() }, ...o])
    pushToast('Numéro acheté', `${e164} est maintenant actif.`)
    return true
  }

  const releaseNumber = (id: string) => {
    setOwned((l) => l.map((n) => (n.id === id ? { ...n, status: 'expired' as const, autoRenew: false } : n)))
    pushToast('Numéro libéré')
  }
  const toggleAutoRenew = (id: string) => setOwned((l) => l.map((n) => (n.id === id ? { ...n, autoRenew: !n.autoRenew } : n)))
  const renameNumber = (id: string, label: string) => setOwned((l) => l.map((n) => (n.id === id ? { ...n, label } : n)))

  const markRead = (id: string) => setMessages((m) => m.map((x) => (x.id === id ? { ...x, read: true } : x)))
  const markAllRead = () => setMessages((m) => m.map((x) => ({ ...x, read: true })))
  const archiveMessage = (id: string) => setMessages((m) => m.map((x) => (x.id === id ? { ...x, archived: true, read: true } : x)))

  const deposit = (amount: number, method: string) => {
    setBalance((b) => +(b + amount).toFixed(2))
    setTransactions((t) => [{ id: nextId('tx'), kind: 'deposit', method, amount, status: 'completed', createdAt: Date.now(), reference: `${method.slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 8999)}` }, ...t])
    pushToast('Fonds ajoutés', `${method} : +$${amount.toFixed(2)}`)
  }

  const createApiKey: Ctx['createApiKey'] = (name) => {
    const rand = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    const key: ApiKey = { id: nextId('key'), name, prefix: `cck_live_${rand.slice(0, 4)}`, secret: `cck_live_${rand.slice(0, 32)}`, createdAt: Date.now(), lastUsedAt: null, scopes: ['numbers:read', 'numbers:write', 'messages:read'] }
    setApiKeys((k) => [key, ...k])
    pushToast('Clé API créée', 'Copiez-la maintenant — elle ne sera plus affichée.')
    return key
  }
  const revokeApiKey = (id: string) => {
    setApiKeys((k) => k.filter((x) => x.id !== id))
    pushToast('Clé API révoquée')
  }

  const createTicket: Ctx['createTicket'] = (subject, category, priority, body) => {
    const t: SupportTicket = { id: nextId('tkt'), subject, category, status: 'open', priority, createdAt: Date.now(), lastReplyAt: Date.now(), messages: [{ from: 'user', body, at: Date.now() }] }
    setTickets((list) => [t, ...list])
    pushToast('Demande envoyée', 'Notre équipe vous répondra sous peu.')
  }

  const value: Ctx = {
    user, balance, owned, messages, transactions, orders, apiKeys, tickets, unreadCount,
    buyNumber, releaseNumber, toggleAutoRenew, renameNumber, markRead, markAllRead, archiveMessage,
    deposit, createApiKey, revokeApiKey, createTicket, toasts, pushToast,
  }

  return <NumbersContext.Provider value={value}>{children}</NumbersContext.Provider>
}
