'use client'

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import {
  SEED_OWNED,
  SEED_MESSAGES,
  SEED_API_KEYS,
  SIMULATED_SENDERS,
  genCode,
  type OwnedNumber,
  type SmsMessage,
  type ApiKey,
  type AvailableNumber,
} from '@/lib/numbers/data'

interface NumbersState {
  ownedNumbers: OwnedNumber[]
  messages: SmsMessage[]
  apiKeys: ApiKey[]
  buyNumber: (n: AvailableNumber, label?: string) => OwnedNumber
  releaseNumber: (id: string) => void
  toggleAutoRenew: (id: string) => void
  relabel: (id: string, label: string) => void
  markRead: (id: string) => void
  markAllRead: (numberId?: string) => void
  deleteMessage: (id: string) => void
  createApiKey: (name: string, scope: ApiKey['scope'], live: boolean) => ApiKey
  revokeApiKey: (id: string) => void
  unreadCount: number
}

const Ctx = createContext<NumbersState | null>(null)

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function NumbersProvider({ children }: { children: React.ReactNode }) {
  const [ownedNumbers, setOwnedNumbers] = useState<OwnedNumber[]>(SEED_OWNED)
  const [messages, setMessages] = useState<SmsMessage[]>(SEED_MESSAGES)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(SEED_API_KEYS)

  const buyNumber = useCallback<NumbersState['buyNumber']>((n, label) => {
    const now = Date.now()
    const owned: OwnedNumber = {
      id: uid('own'),
      number: n.number,
      countryCode: n.countryCode,
      region: n.region,
      providerId: n.providerId,
      type: n.type,
      capabilities: n.capabilities,
      status: 'active',
      label: label?.trim() || (n.type === 'temporary' ? 'Temporary number' : 'New number'),
      monthlyPrice: n.monthlyPrice,
      purchasedAt: new Date(now).toISOString(),
      renewsAt: new Date(now + 1000 * 60 * 60 * 24 * (n.type === 'temporary' ? 7 : 30)).toISOString(),
      autoRenew: n.type !== 'temporary',
    }
    setOwnedNumbers((prev) => [owned, ...prev])
    return owned
  }, [])

  const releaseNumber = useCallback((id: string) => {
    setOwnedNumbers((prev) => prev.filter((n) => n.id !== id))
    setMessages((prev) => prev.filter((m) => m.numberId !== id))
  }, [])

  const toggleAutoRenew = useCallback((id: string) => {
    setOwnedNumbers((prev) => prev.map((n) => (n.id === id ? { ...n, autoRenew: !n.autoRenew } : n)))
  }, [])

  const relabel = useCallback((id: string, label: string) => {
    setOwnedNumbers((prev) => prev.map((n) => (n.id === id ? { ...n, label } : n)))
  }, [])

  const markRead = useCallback((id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)))
  }, [])

  const markAllRead = useCallback((numberId?: string) => {
    setMessages((prev) =>
      prev.map((m) => (!numberId || m.numberId === numberId ? { ...m, read: true } : m)),
    )
  }, [])

  const deleteMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const createApiKey = useCallback<NumbersState['createApiKey']>((name, scope, live) => {
    const key: ApiKey = {
      id: uid('key'),
      name: name.trim() || 'Untitled key',
      token: `cck_${live ? 'live' : 'test'}_${Math.random().toString(36).slice(2, 12)}${Math.random()
        .toString(36)
        .slice(2, 12)}`,
      scope,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      live,
    }
    setApiKeys((prev) => [key, ...prev])
    return key
  }, [])

  const revokeApiKey = useCallback((id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id))
  }, [])

  // Simulate live inbound SMS to active numbers.
  useEffect(() => {
    if (ownedNumbers.length === 0) return
    const interval = setInterval(() => {
      setOwnedNumbers((currentOwned) => {
        const active = currentOwned.filter((n) => n.status !== 'released')
        if (active.length === 0) return currentOwned
        const target = active[Math.floor(Math.random() * active.length)]
        const tpl = SIMULATED_SENDERS[Math.floor(Math.random() * SIMULATED_SENDERS.length)]
        const code = genCode()
        setMessages((prev) => [
          {
            id: uid('msg'),
            numberId: target.id,
            sender: tpl.sender,
            body: tpl.body(code),
            receivedAt: new Date().toISOString(),
            read: false,
            kind: tpl.kind,
          },
          ...prev,
        ])
        return currentOwned
      })
    }, 22000)
    return () => clearInterval(interval)
  }, [ownedNumbers.length])

  const unreadCount = useMemo(() => messages.filter((m) => !m.read).length, [messages])

  const value = useMemo<NumbersState>(
    () => ({
      ownedNumbers,
      messages,
      apiKeys,
      buyNumber,
      releaseNumber,
      toggleAutoRenew,
      relabel,
      markRead,
      markAllRead,
      deleteMessage,
      createApiKey,
      revokeApiKey,
      unreadCount,
    }),
    [
      ownedNumbers,
      messages,
      apiKeys,
      buyNumber,
      releaseNumber,
      toggleAutoRenew,
      relabel,
      markRead,
      markAllRead,
      deleteMessage,
      createApiKey,
      revokeApiKey,
      unreadCount,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNumbers(): NumbersState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useNumbers must be used within NumbersProvider')
  return ctx
}
