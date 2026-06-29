'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { CountrySelect } from '@/components/numbers/country-select'
import { CountryFlag } from '@/components/numbers/country-flag'
import { formatXOF } from '@/lib/numbers/types'
import {
  Search, Loader2, Wallet, ArrowRight, Phone, MessageSquareText, Check,
  Infinity as InfinityIcon, Trash2, Send, ChevronLeft, PhoneCall,
} from 'lucide-react'

const card = 'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl'

export type Subscription = {
  id: number
  phone_e164: string
  country_code: string
  capabilities: string[]
  monthly_price_xof: number
  status: 'active' | 'past_due' | 'cancelled' | 'expired'
  auto_renew: boolean
  label: string | null
  current_period_end: string
}

type Message = {
  id: number
  subscription_id: number
  direction: 'inbound' | 'outbound'
  phone_self: string
  phone_peer: string
  body: string
  read: boolean
  created_at: string
}

type AvailableNumber = {
  phoneNumber: string
  countryCode: string
  features: string[]
  region: string | null
  monthlyPriceXof: number
}

type View = 'buy' | 'mine' | 'chat'

const STATUS_LABEL: Record<Subscription['status'], { text: string; cls: string }> = {
  active: { text: 'Actif', cls: 'bg-emerald-500/15 text-emerald-400' },
  past_due: { text: 'Paiement en retard', cls: 'bg-amber-500/15 text-amber-400' },
  cancelled: { text: 'Résilié', cls: 'bg-white/10 text-white/50' },
  expired: { text: 'Expiré', cls: 'bg-rose-500/15 text-rose-400' },
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

export function DurableApp() {
  const router = useRouter()
  const { balanceXof, pushToast, refreshState } = useNumbers()

  const [view, setView] = useState<View>('mine')
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loadingSubs, setLoadingSubs] = useState(true)

  // --- Achat ---
  const [country, setCountry] = useState('US')
  const [searching, setSearching] = useState(false)
  const [available, setAvailable] = useState<AvailableNumber[]>([])
  const [searched, setSearched] = useState(false)
  const [subscribing, setSubscribing] = useState<string | null>(null)

  // --- Messagerie ---
  const [activeSub, setActiveSub] = useState<Subscription | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [activePeer, setActivePeer] = useState<string | null>(null)
  const [composeTo, setComposeTo] = useState('')
  const [composeText, setComposeText] = useState('')
  const [sending, setSending] = useState(false)

  const loadSubs = useCallback(async () => {
    try {
      const res = await fetch('/api/numbers/durable', { cache: 'no-store' })
      const data = await res.json()
      setSubscriptions(data.subscriptions ?? [])
    } catch {
      // garde l'état précédent
    } finally {
      setLoadingSubs(false)
    }
  }, [])

  useEffect(() => {
    loadSubs()
  }, [loadSubs])

  // ----------------------------- Achat -----------------------------
  async function search() {
    setSearching(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/numbers/durable/search?country=${country}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        pushToast('Recherche impossible', data?.error ?? 'Réessayez plus tard.')
        setAvailable([])
      } else {
        setAvailable(data.numbers ?? [])
      }
    } catch {
      pushToast('Erreur réseau', 'Vérifiez votre connexion.')
    } finally {
      setSearching(false)
    }
  }

  async function subscribe(n: AvailableNumber) {
    if (balanceXof < n.monthlyPriceXof) {
      pushToast('Solde insuffisant', 'Rechargez votre portefeuille pour vous abonner.')
      router.push('/numbers/app/wallet')
      return
    }
    setSubscribing(n.phoneNumber)
    try {
      const res = await fetch('/api/numbers/durable/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phoneNumber: n.phoneNumber, country: n.countryCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        pushToast('Souscription impossible', data?.error ?? 'Réessayez plus tard.')
        return
      }
      pushToast('Numéro activé', `${n.phoneNumber} est à vous, abonnement mensuel actif.`)
      await Promise.all([loadSubs(), refreshState()])
      setAvailable((list) => list.filter((x) => x.phoneNumber !== n.phoneNumber))
      setView('mine')
    } catch {
      pushToast('Erreur réseau', 'Vérifiez votre connexion.')
    } finally {
      setSubscribing(null)
    }
  }

  // -------------------------- Abonnements --------------------------
  async function cancel(sub: Subscription) {
    if (!confirm(`Résilier le numéro ${sub.phone_e164} ? Vous le perdrez définitivement.`)) return
    try {
      const res = await fetch(`/api/numbers/durable/${sub.id}`, { method: 'DELETE' })
      if (!res.ok) {
        pushToast('Résiliation impossible', 'Réessayez plus tard.')
        return
      }
      pushToast('Numéro résilié', `${sub.phone_e164} a été libéré.`)
      await loadSubs()
    } catch {
      pushToast('Erreur réseau')
    }
  }

  async function toggleRenew(sub: Subscription) {
    try {
      const res = await fetch(`/api/numbers/durable/${sub.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ autoRenew: !sub.auto_renew }),
      })
      if (!res.ok) return
      await loadSubs()
    } catch {
      // silencieux
    }
  }

  // ---------------------------- Messagerie ----------------------------
  const openChat = useCallback(async (sub: Subscription) => {
    setActiveSub(sub)
    setActivePeer(null)
    setComposeTo('')
    setComposeText('')
    setView('chat')
    try {
      const res = await fetch(`/api/numbers/durable/${sub.id}/messages`, { cache: 'no-store' })
      const data = await res.json()
      setMessages(data.messages ?? [])
    } catch {
      setMessages([])
    }
  }, [])

  // Sondage des SMS entrants quand une conversation est ouverte.
  const activeSubId = activeSub?.id
  useEffect(() => {
    if (view !== 'chat' || !activeSubId) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/numbers/durable/${activeSubId}/messages`, { cache: 'no-store' })
        const data = await res.json()
        setMessages(data.messages ?? [])
      } catch {
        // silencieux
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [view, activeSubId])

  // Threads regroupés par correspondant.
  const threads = useMemo(() => {
    const map = new Map<string, { peer: string; last: Message; unread: number }>()
    for (const m of messages) {
      const existing = map.get(m.phone_peer)
      const unread = (existing?.unread ?? 0) + (m.direction === 'inbound' && !m.read ? 1 : 0)
      if (!existing || new Date(m.created_at) >= new Date(existing.last.created_at)) {
        map.set(m.phone_peer, { peer: m.phone_peer, last: m, unread })
      } else {
        map.set(m.phone_peer, { ...existing, unread })
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime(),
    )
  }, [messages])

  const threadMessages = useMemo(
    () => (activePeer ? messages.filter((m) => m.phone_peer === activePeer) : []),
    [messages, activePeer],
  )

  async function markThreadRead(peer: string) {
    if (!activeSub) return
    try {
      await fetch(`/api/numbers/durable/${activeSub.id}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ peer }),
      })
      setMessages((list) =>
        list.map((m) => (m.phone_peer === peer && m.direction === 'inbound' ? { ...m, read: true } : m)),
      )
    } catch {
      // silencieux
    }
  }

  async function sendSms() {
    if (!activeSub) return
    const to = (activePeer || composeTo).trim()
    const text = composeText.trim()
    if (!to || !text) return
    setSending(true)
    try {
      const res = await fetch(`/api/numbers/durable/${activeSub.id}/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to, text }),
      })
      const data = await res.json()
      if (!res.ok) {
        pushToast('Envoi impossible', data?.error ?? 'Réessayez.')
        return
      }
      setMessages((list) => [...list, data.message])
      setComposeText('')
      if (!activePeer) {
        setActivePeer(to)
        setComposeTo('')
      }
    } catch {
      pushToast('Erreur réseau')
    } finally {
      setSending(false)
    }
  }

  const activeCount = subscriptions.filter((s) => s.status === 'active' || s.status === 'past_due').length

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-white">
          <InfinityIcon className="h-5 w-5 text-[#60a5fa]" /> Numéro illimité
        </h1>
        <p className="text-sm text-white/50">
          Un vrai numéro à vous, par abonnement mensuel. SMS et appels illimités, conservé tant que l&apos;abonnement
          est actif.
        </p>
      </div>

      {/* Onglets */}
      <div className="flex flex-wrap items-center gap-2">
        <TabButton active={view === 'mine'} onClick={() => setView('mine')} icon={Phone}>
          Mes numéros{activeCount > 0 ? ` (${activeCount})` : ''}
        </TabButton>
        <TabButton active={view === 'buy'} onClick={() => setView('buy')} icon={InfinityIcon}>
          Obtenir un numéro
        </TabButton>
        {activeSub && (
          <TabButton active={view === 'chat'} onClick={() => setView('chat')} icon={MessageSquareText}>
            Messagerie
          </TabButton>
        )}
        <div className="ml-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
          <Wallet className="h-4 w-4 text-blue-400" />
          <span className="font-semibold text-white">{formatXOF(balanceXof)}</span>
        </div>
      </div>

      {/* ---------------- Vue : Mes numéros ---------------- */}
      {view === 'mine' && (
        <div className="space-y-4">
          {loadingSubs ? (
            <div className="flex items-center justify-center gap-2 py-16 text-white/50">
              <Loader2 className="h-5 w-5 animate-spin" /> Chargement...
            </div>
          ) : subscriptions.length === 0 ? (
            <div className={`${card} flex flex-col items-center gap-3 p-10 text-center`}>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2563EB]/15">
                <InfinityIcon className="h-6 w-6 text-[#60a5fa]" />
              </span>
              <p className="text-white">Vous n&apos;avez pas encore de numéro illimité.</p>
              <p className="max-w-sm text-sm text-white/50">
                Obtenez un numéro durable pour envoyer/recevoir SMS et appels en illimité, comme une vraie ligne.
              </p>
              <button
                onClick={() => setView('buy')}
                className="mt-2 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-500"
              >
                Obtenir un numéro <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {subscriptions.map((sub) => {
                const st = STATUS_LABEL[sub.status]
                const live = sub.status === 'active' || sub.status === 'past_due'
                return (
                  <div key={sub.id} className={`${card} p-5`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <CountryFlag code={sub.country_code} size={28} />
                        <div>
                          <p className="font-mono text-lg font-semibold text-white">{sub.phone_e164}</p>
                          {sub.label && <p className="text-xs text-white/50">{sub.label}</p>}
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.cls}`}>{st.text}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50">
                      <span>{formatXOF(sub.monthly_price_xof)}/mois</span>
                      <span>·</span>
                      <span>
                        {sub.status === 'cancelled' || sub.status === 'expired'
                          ? `Terminé le ${fmtDate(sub.current_period_end)}`
                          : `Renouvellement le ${fmtDate(sub.current_period_end)}`}
                      </span>
                    </div>

                    {sub.status === 'past_due' && (
                      <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                        Solde insuffisant au renouvellement. Rechargez pour conserver ce numéro.
                      </p>
                    )}

                    {live && (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => openChat(sub)}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
                        >
                          <MessageSquareText className="h-4 w-4" /> Messages
                        </button>
                        <button
                          onClick={() => pushToast('Appels bientôt disponibles', 'La fonction appel arrive très vite.')}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5"
                        >
                          <PhoneCall className="h-4 w-4" /> Appeler
                        </button>
                        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-white/60">
                          <span>Renouv. auto</span>
                          <button
                            onClick={() => toggleRenew(sub)}
                            className={`relative h-5 w-9 rounded-full transition-colors ${sub.auto_renew ? 'bg-blue-600' : 'bg-white/15'}`}
                            aria-label="Basculer le renouvellement automatique"
                          >
                            <span
                              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${sub.auto_renew ? 'left-[18px]' : 'left-0.5'}`}
                            />
                          </button>
                        </label>
                        <button
                          onClick={() => cancel(sub)}
                          className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-4 w-4" /> Résilier
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------- Vue : Obtenir un numéro ---------------- */}
      {view === 'buy' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <aside className={`${card} h-fit p-5`}>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">Pays</label>
            <div className="mb-4">
              <CountrySelect value={country} onChange={setCountry} />
            </div>
            <button
              onClick={search}
              disabled={searching}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Rechercher
            </button>
            <p className="mt-3 text-xs text-white/40">
              Numéros capables de SMS et d&apos;appels. Facturation mensuelle via votre portefeuille.
            </p>
          </aside>

          <div className="space-y-3">
            {searching ? (
              <div className="flex items-center justify-center gap-2 py-16 text-white/50">
                <Loader2 className="h-5 w-5 animate-spin" /> Recherche de numéros disponibles...
              </div>
            ) : !searched ? (
              <div className={`${card} p-10 text-center text-sm text-white/50`}>
                Choisissez un pays puis lancez la recherche pour voir les numéros disponibles.
              </div>
            ) : available.length === 0 ? (
              <div className={`${card} p-10 text-center text-sm text-white/50`}>
                Aucun numéro disponible pour ce pays actuellement. Essayez un autre pays.
              </div>
            ) : (
              available.map((n) => {
                const insufficient = balanceXof < n.monthlyPriceXof
                return (
                  <div key={n.phoneNumber} className={`${card} flex items-center gap-4 p-4`}>
                    <CountryFlag code={n.countryCode} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-lg font-semibold text-white">{n.phoneNumber}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-white/40">
                        {n.region ? <span>{n.region}</span> : null}
                        <span className="uppercase">{n.features.join(' · ')}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">{formatXOF(n.monthlyPriceXof)}</p>
                      <p className="text-[11px] text-white/40">par mois</p>
                    </div>
                    <button
                      onClick={() => subscribe(n)}
                      disabled={subscribing !== null}
                      className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                        insufficient
                          ? 'border border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                          : 'bg-blue-600 text-white hover:bg-blue-500'
                      }`}
                    >
                      {subscribing === n.phoneNumber ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : insufficient ? (
                        <>
                          <Wallet className="h-4 w-4" /> Recharger
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" /> S&apos;abonner
                        </>
                      )}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ---------------- Vue : Messagerie ---------------- */}
      {view === 'chat' && activeSub && (
        <div className={`${card} grid grid-cols-1 overflow-hidden md:grid-cols-[300px_1fr]`} style={{ minHeight: 480 }}>
          {/* Liste des conversations */}
          <div className={`border-white/10 md:border-r ${activePeer ? 'hidden md:block' : 'block'}`}>
            <div className="flex items-center justify-between gap-2 border-b border-white/10 p-4">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-semibold text-white">{activeSub.phone_e164}</p>
                <p className="text-xs text-white/40">Vos conversations</p>
              </div>
              <button
                onClick={() => {
                  setActivePeer(null)
                  setComposeTo('')
                  setComposeText('')
                }}
                title="Nouveau message"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-500"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {threads.length === 0 ? (
                <p className="p-4 text-sm text-white/40">Aucune conversation. Envoyez un premier SMS.</p>
              ) : (
                threads.map((t) => (
                  <button
                    key={t.peer}
                    onClick={() => {
                      setActivePeer(t.peer)
                      if (t.unread > 0) markThreadRead(t.peer)
                    }}
                    className={`flex w-full items-center gap-3 border-b border-white/5 p-3 text-left transition-colors hover:bg-white/5 ${
                      activePeer === t.peer ? 'bg-white/5' : ''
                    }`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                      {t.peer.slice(-2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm text-white">{t.peer}</p>
                      <p className="truncate text-xs text-white/40">{t.last.body || '—'}</p>
                    </div>
                    {t.unread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2563EB] px-1.5 text-[11px] font-bold text-white">
                        {t.unread}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Fil de discussion */}
          <div className={`flex flex-col ${activePeer ? 'flex' : 'hidden md:flex'}`}>
            {activePeer ? (
              <>
                <div className="flex items-center gap-2 border-b border-white/10 p-4">
                  <button
                    onClick={() => setActivePeer(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/5 md:hidden"
                  >
                    <ChevronLeft className="h-5 w-5 text-white" />
                  </button>
                  <span className="font-mono text-sm font-semibold text-white">{activePeer}</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-4" style={{ maxHeight: 320 }}>
                  {threadMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                          m.direction === 'outbound'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p className="mt-1 text-[10px] opacity-60">
                          {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col p-4">
                <label className="mb-1.5 text-xs font-medium uppercase tracking-wider text-white/40">
                  Destinataire
                </label>
                <input
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="+1 555 000 0000"
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-blue-500"
                />
                <p className="mt-2 text-xs text-white/40">
                  Saisissez un numéro au format international, puis écrivez votre message ci-dessous.
                </p>
              </div>
            )}

            {/* Zone de saisie */}
            <div className="border-t border-white/10 p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={composeText}
                  onChange={(e) => setComposeText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                      e.preventDefault()
                      sendSms()
                    }
                  }}
                  rows={1}
                  placeholder="Votre message..."
                  className="max-h-32 flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
                <button
                  onClick={sendSms}
                  disabled={sending || !composeText.trim() || (!activePeer && !composeTo.trim())}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:opacity-40"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-[#2563EB]/15 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  )
}
