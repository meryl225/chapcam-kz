'use client'

import { useMemo, useState } from 'react'
import { useNumbers } from '@/components/numbers/numbers-provider'
import {
  LISTINGS,
  COUNTRIES,
  PROVIDERS,
  countryByCode,
  providerById,
  formatUSD,
  type Listing,
  type NumberType,
  type Capability,
} from '@/lib/numbers/data'
import {
  Search,
  SlidersHorizontal,
  MessageSquareText,
  Phone as PhoneIcon,
  Image as ImageIcon,
  Check,
  X,
  Zap,
  ShieldCheck,
} from 'lucide-react'

const card = 'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl'

const TYPE_FR: Record<NumberType, string> = {
  temporary: 'Temporaire',
  'long-term': 'Longue durée',
}

const capIcon: Record<Capability, typeof MessageSquareText> = {
  sms: MessageSquareText,
  voice: PhoneIcon,
  mms: ImageIcon,
}

export default function MarketplacePage() {
  const { buyNumber } = useNumbers()
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState<string>('all')
  const [type, setType] = useState<NumberType | 'all'>('all')
  const [provider, setProvider] = useState<string>('all')
  const [maxPrice, setMaxPrice] = useState(20)
  const [selected, setSelected] = useState<Listing | null>(null)
  const [label, setLabel] = useState('')

  const filtered = useMemo(() => {
    return LISTINGS.filter((l) => {
      if (country !== 'all' && l.countryCode !== country) return false
      if (type !== 'all' && l.type !== type) return false
      if (provider !== 'all' && l.providerId !== provider) return false
      if (l.price > maxPrice) return false
      if (query) {
        const c = countryByCode(l.countryCode)
        const p = providerById(l.providerId)
        const hay = `${c?.name} ${c?.dial} ${p?.name}`.toLowerCase()
        if (!hay.includes(query.toLowerCase())) return false
      }
      return true
    })
  }, [country, type, provider, maxPrice, query])

  function confirmBuy() {
    if (!selected) return
    const ok = buyNumber(selected, label || `${countryByCode(selected.countryCode)?.name} number`)
    if (ok) {
      setSelected(null)
      setLabel('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-white">Acheter un numéro</h1>
        <p className="text-sm text-white/50">
          Parcourez plus de {LISTINGS.length} numéros dans {COUNTRIES.length} pays et {PROVIDERS.length} opérateurs.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        {/* Filters */}
        <aside className={`${card} h-fit p-5`}>
          <div className="mb-4 flex items-center gap-2 text-white">
            <SlidersHorizontal className="h-4 w-4 text-blue-400" />
            <span className="font-medium">Filtres</span>
          </div>

          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
            Pays
          </label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="mb-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          >
            <option value="all">Tous les pays</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code} className="bg-[#0b1220]">
                {c.flag} {c.name}
              </option>
            ))}
          </select>

          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
            Type
          </label>
          <div className="mb-4 flex gap-2">
            {(['all', 'temporary', 'long-term'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs transition-colors ${
                  type === t
                    ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                    : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                {t === 'all' ? 'Tous' : t === 'long-term' ? 'Longue durée' : 'Temporaire'}
              </button>
            ))}
          </div>

          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
            Opérateur
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="mb-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          >
            <option value="all">Tous les opérateurs</option>
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#0b1220]">
                {p.name}
              </option>
            ))}
          </select>

          <label className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-white/40">
            <span>Prix max</span>
            <span className="text-blue-400">{formatUSD(maxPrice)}</span>
          </label>
          <input
            type="range"
            min={1}
            max={20}
            step={0.5}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
        </aside>

        {/* Results */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par pays, indicatif ou opérateur..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-blue-500"
            />
          </div>

          <p className="text-sm text-white/50">{filtered.length} numéros disponibles</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((l) => {
              const c = countryByCode(l.countryCode)
              const p = providerById(l.providerId)
              return (
                <div key={l.id} className={`${card} flex flex-col p-5`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl leading-none">{c?.flag}</span>
                      <div>
                        <p className="font-medium text-white">{c?.name}</p>
                        <p className="text-xs text-white/40">
                          {c?.dial} · {p?.name}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        l.type === 'temporary'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-blue-500/15 text-blue-300'
                      }`}
                    >
                      {TYPE_FR[l.type]}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {l.capabilities.map((cap) => {
                      const Icon = capIcon[cap]
                      return (
                        <span
                          key={cap}
                          className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[11px] uppercase text-white/60"
                        >
                          <Icon className="h-3 w-3" />
                          {cap}
                        </span>
                      )
                    })}
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs text-white/50">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      {p?.reliability}% dispo
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-blue-400" />~{p?.avgDeliverySec}s
                    </span>
                  </div>

                  <div className="mt-4 flex items-end justify-between border-t border-white/5 pt-4">
                    <div>
                      <p className="text-lg font-semibold text-white">{formatUSD(l.price)}</p>
                      <p className="text-[11px] text-white/40">
                        {l.type === 'temporary' ? 'paiement unique' : 'par mois'}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelected(l)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
                    >
                      Acheter
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className={`${card} flex flex-col items-center justify-center py-16 text-center`}>
              <Search className="h-8 w-8 text-white/20" />
              <p className="mt-3 text-white/60">Aucun numéro ne correspond à vos filtres</p>
              <p className="text-sm text-white/40">Essayez d&apos;élargir votre fourchette de prix ou votre sélection de pays.</p>
            </div>
          )}
        </div>
      </div>

      {/* Buy modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1220] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-white">Confirmer l&apos;achat</h2>
              <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="text-2xl">{countryByCode(selected.countryCode)?.flag}</span>
              <div className="flex-1">
                <p className="font-medium text-white">{countryByCode(selected.countryCode)?.name}</p>
                <p className="text-xs text-white/40">
                  {providerById(selected.providerId)?.name} · {TYPE_FR[selected.type]}
                </p>
              </div>
              <p className="text-lg font-semibold text-white">{formatUSD(selected.price)}</p>
            </div>

            <label className="mb-1.5 mt-4 block text-xs font-medium uppercase tracking-wider text-white/40">
              Libellé (facultatif)
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex. Ligne professionnelle"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-blue-500"
            />

            <div className="mt-4 space-y-1.5 rounded-xl bg-white/[0.02] p-3 text-sm">
              <div className="flex justify-between text-white/60">
                <span>Numéro</span>
                <span>{formatUSD(selected.price)}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Frais de plateforme</span>
                <span>{formatUSD(0)}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-1.5 font-medium text-white">
                <span>Total</span>
                <span>{formatUSD(selected.price)}</span>
              </div>
            </div>

            <button
              onClick={confirmBuy}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 font-medium text-white transition-colors hover:bg-blue-500"
            >
              <Check className="h-4 w-4" />
              Confirmer et payer {formatUSD(selected.price)}
            </button>
            <p className="mt-2 text-center text-xs text-white/40">
              Débité instantanément du solde de votre portefeuille.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
