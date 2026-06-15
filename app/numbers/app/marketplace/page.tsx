'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { COUNTRIES, SERVICES, countryByCode, serviceBySlug } from '@/lib/numbers/catalog'
import { formatXOF, type QuoteResponse } from '@/lib/numbers/types'
import {
  Search,
  Check,
  X,
  Zap,
  ShieldCheck,
  Loader2,
  Wallet,
  ArrowRight,
} from 'lucide-react'

const card = 'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl'

export default function MarketplacePage() {
  const router = useRouter()
  const { balanceXof, buyActivation } = useNumbers()
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState<string>('US')
  const [service, setService] = useState<string | null>(null)
  const [quote, setQuoteState] = useState<QuoteResponse | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [buying, setBuying] = useState(false)
  const { quote: getQuote } = useNumbers()

  const selectedCountry = countryByCode(country)
  const selectedService = service ? serviceBySlug(service) : null

  const filteredServices = useMemo(() => {
    if (!query) return SERVICES
    const q = query.toLowerCase()
    return SERVICES.filter((s) => s.label.toLowerCase().includes(q) || s.slug.includes(q))
  }, [query])

  // Récupère un devis (fournisseur le moins cher) à chaque changement.
  useEffect(() => {
    if (!service) {
      setQuoteState(null)
      return
    }
    let cancelled = false
    setQuoteLoading(true)
    getQuote(country, service).then((q) => {
      if (!cancelled) {
        setQuoteState(q)
        setQuoteLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [country, service, getQuote])

  async function confirmBuy() {
    if (!service || !quote?.available) return
    setBuying(true)
    const res = await buyActivation(country, service)
    setBuying(false)
    if (res.ok) {
      setService(null)
      router.push('/numbers/app/numbers')
    }
  }

  const insufficient = quote?.available && quote.priceXof != null && balanceXof < quote.priceXof

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-white">Acheter un numéro</h1>
        <p className="text-sm text-white/50">
          Choisissez un pays et un service. ChapCam sélectionne automatiquement le fournisseur le moins cher parmi
          5sim, SMS-Man et SMSPool. Prix en FCFA, tout compris.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        {/* Pays */}
        <aside className={`${card} h-fit p-5`}>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">Pays</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="mb-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code} className="bg-[#0b1220]">
                {c.flag} {c.name} ({c.dial})
              </option>
            ))}
          </select>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm">
            <div className="flex items-center gap-2 text-white/60">
              <Wallet className="h-4 w-4 text-blue-400" />
              Solde
            </div>
            <p className="mt-1 text-lg font-semibold text-white">{formatXOF(balanceXof)}</p>
            <button
              onClick={() => router.push('/numbers/app/wallet')}
              className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
            >
              Recharger <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </aside>

        {/* Services */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un service (WhatsApp, Telegram, Google...)"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-blue-500"
            />
          </div>

          <p className="text-sm text-white/50">
            {filteredServices.length} services disponibles pour {selectedCountry?.flag} {selectedCountry?.name}
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredServices.map((s) => (
              <button
                key={s.slug}
                onClick={() => setService(s.slug)}
                className={`${card} flex items-center gap-3 p-4 text-left transition-colors hover:border-blue-500/50`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-sm font-bold text-blue-300">
                  {s.label.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{s.label}</p>
                  <p className="text-xs text-white/40">SMS de vérification</p>
                </div>
                <ArrowRight className="h-4 w-4 text-white/30" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal d'achat */}
      {selectedService && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => !buying && setService(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1220] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-white">Confirmer l&apos;achat</h2>
              <button onClick={() => !buying && setService(null)} className="text-white/40 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="text-2xl">{selectedCountry?.flag}</span>
              <div className="flex-1">
                <p className="font-medium text-white">{selectedService.label}</p>
                <p className="text-xs text-white/40">
                  {selectedCountry?.name} · {selectedCountry?.dial}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2 rounded-xl bg-white/[0.02] p-4 text-sm">
              {quoteLoading ? (
                <div className="flex items-center justify-center gap-2 py-4 text-white/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recherche du meilleur prix...
                </div>
              ) : quote?.available ? (
                <>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    {quote.providerCount} fournisseur(s) disponible(s)
                    <span className="ml-auto flex items-center gap-1 text-blue-400">
                      <Zap className="h-3.5 w-3.5" /> Auto — le moins cher
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2 text-lg font-semibold text-white">
                    <span>Total</span>
                    <span>{formatXOF(quote.priceXof ?? 0)}</span>
                  </div>
                  {insufficient && (
                    <p className="text-xs text-amber-400">
                      Solde insuffisant. Rechargez votre portefeuille pour continuer.
                    </p>
                  )}
                </>
              ) : (
                <p className="py-4 text-center text-sm text-white/50">
                  Aucun numéro disponible pour cette combinaison. Essayez un autre pays.
                </p>
              )}
            </div>

            {insufficient ? (
              <button
                onClick={() => router.push('/numbers/app/wallet')}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 font-medium text-white transition-colors hover:bg-blue-500"
              >
                <Wallet className="h-4 w-4" />
                Recharger le portefeuille
              </button>
            ) : (
              <button
                onClick={confirmBuy}
                disabled={!quote?.available || buying || quoteLoading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {buying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Achat en cours...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Confirmer {quote?.priceXof ? `· ${formatXOF(quote.priceXof)}` : ''}
                  </>
                )}
              </button>
            )}
            <p className="mt-2 text-center text-xs text-white/40">
              Débité du solde. Remboursé automatiquement si aucun SMS n&apos;est reçu.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
