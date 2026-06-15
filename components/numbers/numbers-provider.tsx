'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  INITIAL_OWNED, INITIAL_MESSAGES, INITIAL_TRANSACTIONS, INITIAL_API_KEYS, INITIAL_ORDERS, INITIAL_TICKETS,
  type OwnedNumber, type Message, type Transaction, type ApiKey, type Order, type SupportTicket, type Listing,
  countryByCode,
} from '@/lib/numbers/data'

type Toast = { id: number; title: string; desc?: string }

type Ctx = {
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

export function NumbersProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(132.5)
  const [owned, setOwned] = useState<OwnedNumber[]>(INITIAL_OWNED)
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS)
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(INITIAL_API_KEYS)
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS)
  const [toasts, setToasts] = useState<Toast[]>([])

  const pushToast = (title: string, desc?: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, title, desc }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }

  const ownedRef = useRef(owned)
  ownedRef.current = owned

  // Simulate live inbound SMS on active numbers.
  useEffect(() => {
    const SENDERS = ['STRIPE', 'GitHub', 'Discord', 'Uber', 'Amazon', 'OpenAI', 'Airbnb', 'Coinbase']
    const interval = setInterval(() => {
      const active = ownedRef.current.filter((n) => n.status !== 'expired')
      if (active.length === 0) return
      const target = active[Math.floor(Math.random() * active.length)]
      const sender = SENDERS[Math.floor(Math.random() * SENDERS.length)]
      const code = String(Math.floor(100000 + Math.random() * 899999))
      const msg: Message = {
        id: nextId('m'), numberId: target.id, sender,
        body: `Your ${sender} verification code is ${code}.`,
        receivedAt: Date.now(), read: false, archived: false,
      }
      setMessages((m) => [msg, ...m])
      setOwned((list) => list.map((n) => (n.id === target.id ? { ...n, messageCount: n.messageCount + 1 } : n)))
      pushToast(`New SMS on ${target.e164}`, `${sender}: code ${code}`)
    }, 22000)
    return () => clearInterval(interval)
  }, [])

  const unreadCount = useMemo(() => messages.filter((m) => !m.read && !m.archived).length, [messages])

  const buyNumber: Ctx['buyNumber'] = (listing, label) => {
    if (balance < listing.price) {
      pushToast('Insufficient balance', 'Add funds in your wallet to continue.')
      return false
    }
    const country = countryByCode(listing.countryCode)
    const e164 = `${country?.dial ?? '+1'} ${Math.floor(100 + Math.random() * 899)} ${Math.floor(1000 + Math.random() * 8999)}`
    const id = nextId('num')
    const duration = listing.type === 'temporary' ? 24 * 3600_000 : 30 * 24 * 3600_000
    const num: OwnedNumber = {
      id, e164, countryCode: listing.countryCode, providerId: listing.providerId, type: listing.type,
      label: label || `${country?.name} number`, status: 'active', purchasedAt: Date.now(),
      expiresAt: Date.now() + duration, autoRenew: listing.type === 'long-term', messageCount: 0,
    }
    setOwned((l) => [num, ...l])
    setBalance((b) => +(b - listing.price).toFixed(2))
    setTransactions((t) => [{ id: nextId('tx'), kind: 'purchase', method: 'Wallet', amount: -listing.price, status: 'completed', createdAt: Date.now(), reference: id }, ...t])
    setOrders((o) => [{ id: nextId('ord'), numberLabel: num.label, e164, countryCode: listing.countryCode, providerId: listing.providerId, amount: listing.price, status: 'active', createdAt: Date.now() }, ...o])
    pushToast('Number purchased', `${e164} is now active.`)
    return true
  }

  const releaseNumber = (id: string) => {
    setOwned((l) => l.map((n) => (n.id === id ? { ...n, status: 'expired' as const, autoRenew: false } : n)))
    pushToast('Number released')
  }
  const toggleAutoRenew = (id: string) => setOwned((l) => l.map((n) => (n.id === id ? { ...n, autoRenew: !n.autoRenew } : n)))
  const renameNumber = (id: string, label: string) => setOwned((l) => l.map((n) => (n.id === id ? { ...n, label } : n)))

  const markRead = (id: string) => setMessages((m) => m.map((x) => (x.id === id ? { ...x, read: true } : x)))
  const markAllRead = () => setMessages((m) => m.map((x) => ({ ...x, read: true })))
  const archiveMessage = (id: string) => setMessages((m) => m.map((x) => (x.id === id ? { ...x, archived: true, read: true } : x)))

  const deposit = (amount: number, method: string) => {
    setBalance((b) => +(b + amount).toFixed(2))
    setTransactions((t) => [{ id: nextId('tx'), kind: 'deposit', method, amount, status: 'completed', createdAt: Date.now(), reference: `${method.slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 8999)}` }, ...t])
    pushToast('Funds added', `${method}: +$${amount.toFixed(2)}`)
  }

  const createApiKey: Ctx['createApiKey'] = (name) => {
    const rand = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    const key: ApiKey = { id: nextId('key'), name, prefix: `cck_live_${rand.slice(0, 4)}`, secret: `cck_live_${rand.slice(0, 32)}`, createdAt: Date.now(), lastUsedAt: null, scopes: ['numbers:read', 'numbers:write', 'messages:read'] }
    setApiKeys((k) => [key, ...k])
    pushToast('API key created', 'Copy it now — it will not be shown again.')
    return key
  }
  const revokeApiKey = (id: string) => {
    setApiKeys((k) => k.filter((x) => x.id !== id))
    pushToast('API key revoked')
  }

  const createTicket: Ctx['createTicket'] = (subject, category, priority, body) => {
    const t: SupportTicket = { id: nextId('tkt'), subject, category, status: 'open', priority, createdAt: Date.now(), lastReplyAt: Date.now(), messages: [{ from: 'user', body, at: Date.now() }] }
    setTickets((list) => [t, ...list])
    pushToast('Ticket submitted', 'Our team will reply shortly.')
  }

  const value: Ctx = {
    balance, owned, messages, transactions, orders, apiKeys, tickets, unreadCount,
    buyNumber, releaseNumber, toggleAutoRenew, renameNumber, markRead, markAllRead, archiveMessage,
    deposit, createApiKey, revokeApiKey, createTicket, toasts, pushToast,
  }

  return <NumbersContext.Provider value={value}>{children}</NumbersContext.Provider>
}
