'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Activation, NumbersState, QuoteResponse, Tx } from '@/lib/numbers/types'
import type { ApiKey, SupportTicket } from '@/lib/numbers/data'
import { isAdminEmail } from '@/lib/admin-email'

type Toast = { id: number; title: string; desc?: string }

export type AccountUser = { name: string; email: string }

type BuyResult = { ok: boolean; activation?: Activation; error?: string }

type Ctx = {
  user: AccountUser
  // Vrai uniquement pour l'administrateur : conditionne l'affichage des infos
  // techniques (fournisseurs, références) masquées aux clients.
  isAdmin: boolean
  // Données réelles (FCFA)
  balanceXof: number
  activations: Activation[]
  transactions: Tx[]
  loading: boolean
  unreadCount: number
  // Actions réelles
  refreshState: () => Promise<void>
  quote: (countryCode: string, serviceSlug: string, plan?: string) => Promise<QuoteResponse>
  buyActivation: (countryCode: string, serviceSlug: string, plan?: string) => Promise<BuyResult>
  refreshActivation: (id: number) => Promise<Activation | null>
  cancelActivation: (id: number) => Promise<void>
  deposit: (amountXof: number, method: string) => Promise<void>
  // Lecture / archivage local des SMS reçus
  markRead: (id: number) => void
  markAllRead: () => void
  // API keys & support (session locale — branchement API ultérieur)
  apiKeys: ApiKey[]
  createApiKey: (name: string) => ApiKey
  revokeApiKey: (id: string) => void
  tickets: SupportTicket[]
  createTicket: (subject: string, category: string, priority: SupportTicket['priority'], body: string) => void
  // Toasts
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
  const [state, setState] = useState<NumbersState>({ balanceXof: 0, activations: [], transactions: [] })
  const [loading, setLoading] = useState(true)
  const [readIds, setReadIds] = useState<Set<number>>(new Set())
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])

  const pushToast = useCallback((title: string, desc?: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, title, desc }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  const refreshState = useCallback(async () => {
    try {
      const res = await fetch('/api/numbers/state', { cache: 'no-store' })
      if (!res.ok) throw new Error('state')
      const data = (await res.json()) as NumbersState
      setState(data)
    } catch {
      // silencieux : on garde l'état précédent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshState()
  }, [refreshState])

  // Sondage automatique tant qu'une activation attend un SMS.
  const hasWaiting = state.activations.some((a) => a.status === 'waiting')
  const waitingRef = useRef(hasWaiting)
  waitingRef.current = hasWaiting
  useEffect(() => {
    if (!hasWaiting) return
    const interval = setInterval(() => {
      if (waitingRef.current) refreshState()
    }, 5000)
    return () => clearInterval(interval)
  }, [hasWaiting, refreshState])

  const quote = useCallback<Ctx['quote']>(async (countryCode, serviceSlug, plan = 'verification') => {
    const res = await fetch(
      `/api/numbers/quote?country=${countryCode}&service=${serviceSlug}&plan=${plan}`,
      { cache: 'no-store' },
    )
    if (!res.ok) return { available: false, priceXof: null, cheapestProvider: null, providerCount: 0, successRate: null }
    return (await res.json()) as QuoteResponse
  }, [])

  const buyActivation = useCallback<Ctx['buyActivation']>(
    async (countryCode, serviceSlug, plan = 'verification') => {
      try {
        const res = await fetch('/api/numbers/purchase', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ country: countryCode, service: serviceSlug, plan }),
        })
        const data = await res.json()
        if (!res.ok) {
          pushToast('Achat impossible', data?.error ?? 'Réessayez plus tard.')
          return { ok: false, error: data?.error }
        }
        await refreshState()
        pushToast('Numéro activé', `${data.activation.phone} — en attente du SMS.`)
        return { ok: true, activation: data.activation as Activation }
      } catch {
        pushToast('Erreur réseau', 'Vérifiez votre connexion et réessayez.')
        return { ok: false, error: 'network' }
      }
    },
    [pushToast, refreshState],
  )

  const refreshActivation = useCallback<Ctx['refreshActivation']>(
    async (id) => {
      try {
        const res = await fetch(`/api/numbers/activation/${id}`, { cache: 'no-store' })
        if (!res.ok) return null
        const data = (await res.json()) as { activation: Activation | null; deleted?: boolean }
        // Numéro sans SMS supprimé côté serveur -> on le retire de l'état local
        // pour qu'il disparaisse immédiatement de l'historique.
        if (data.deleted || !data.activation) {
          setState((s) => ({ ...s, activations: s.activations.filter((a) => a.id !== id) }))
          return null
        }
        setState((s) => ({
          ...s,
          activations: s.activations.map((a) => (a.id === id ? data.activation! : a)),
        }))
        return data.activation
      } catch {
        return null
      }
    },
    [],
  )

  const cancelActivation = useCallback<Ctx['cancelActivation']>(
    async (id) => {
      try {
        const res = await fetch(`/api/numbers/activation/${id}`, { method: 'DELETE' })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          pushToast('Annulation impossible', d?.error ?? 'Le SMS a peut-être déjà été reçu.')
          return
        }
        await refreshState()
        pushToast('Numéro annulé', 'Remboursé si aucun SMS reçu.')
      } catch {
        pushToast('Erreur réseau')
      }
    },
    [pushToast, refreshState],
  )

  const deposit = useCallback<Ctx['deposit']>(
    async (amountXof, method) => {
      try {
        const res = await fetch('/api/numbers/wallet/deposit', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ amountXof, method }),
        })
        if (!res.ok) {
          pushToast('Rechargement impossible')
          return
        }
        await refreshState()
        pushToast('Fonds ajoutés', `${method}`)
      } catch {
        pushToast('Erreur réseau')
      }
    },
    [pushToast, refreshState],
  )

  const markRead = useCallback((id: number) => setReadIds((s) => new Set(s).add(id)), [])
  const markAllRead = useCallback(() => {
    setState((s) => {
      setReadIds(new Set(s.activations.filter((a) => a.code).map((a) => a.id)))
      return s
    })
  }, [])

  const unreadCount = useMemo(
    () => state.activations.filter((a) => a.code && !readIds.has(a.id)).length,
    [state.activations, readIds],
  )

  const createApiKey = useCallback<Ctx['createApiKey']>(
    (name) => {
      const rand = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
      const key: ApiKey = {
        id: nextId('key'), name, prefix: `cck_live_${rand.slice(0, 4)}`,
        secret: `cck_live_${rand.slice(0, 32)}`, createdAt: Date.now(), lastUsedAt: null,
        scopes: ['numbers:read', 'numbers:write', 'messages:read'],
      }
      setApiKeys((k) => [key, ...k])
      pushToast('Clé API créée', 'Copiez-la maintenant ��� elle ne sera plus affichée.')
      return key
    },
    [pushToast],
  )
  const revokeApiKey = useCallback(
    (id: string) => {
      setApiKeys((k) => k.filter((x) => x.id !== id))
      pushToast('Clé API révoquée')
    },
    [pushToast],
  )

  const createTicket = useCallback<Ctx['createTicket']>(
    (subject, category, priority, body) => {
      const t: SupportTicket = {
        id: nextId('tkt'), subject, category, status: 'open', priority,
        createdAt: Date.now(), lastReplyAt: Date.now(),
        messages: [{ from: 'user', body, at: Date.now() }],
      }
      setTickets((list) => [t, ...list])
      pushToast('Demande envoyée', 'Notre équipe vous répondra sous peu.')
    },
    [pushToast],
  )

  const value: Ctx = {
    user,
    isAdmin: isAdminEmail(user.email),
    balanceXof: state.balanceXof,
    activations: state.activations,
    transactions: state.transactions,
    loading,
    unreadCount,
    refreshState,
    quote,
    buyActivation,
    refreshActivation,
    cancelActivation,
    deposit,
    markRead,
    markAllRead,
    apiKeys,
    createApiKey,
    revokeApiKey,
    tickets,
    createTicket,
    toasts,
    pushToast,
  }

  return <NumbersContext.Provider value={value}>{children}</NumbersContext.Provider>
}

export function activationIsRead(readIds: Set<number>, id: number) {
  return readIds.has(id)
}
