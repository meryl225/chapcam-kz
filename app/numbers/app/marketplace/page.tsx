'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { ServiceLogo } from '@/components/numbers/service-logo'
import { CountryFlag } from '@/components/numbers/country-flag'
import { CountrySelect } from '@/components/numbers/country-select'
import { SERVICES, RENTAL_PLANS, countryByCode, serviceBySlug } from '@/lib/numbers/catalog'
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
  TrendingUp,
} from 'lucide-react'

const card = 'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl'

export default function MarketplacePage() {
  const router = useRouter()
  const { balanceXof, buyActivation, quote: getQuote } = useNumbers()
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState<string>('US')
  const [service, setService] = useState<string | null>(null)
  const [plan, setPlan] = useState<string>('verification')
  // Devis par forfait : { [planKey]: QuoteResponse | null (en cours) }
  const [quotes, setQuotes] = useState<Record<string, QuoteResponse | null>>({})
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  const [buying, setBuying] = useState(false)

  const selectedCountry = countryByCode(country)
  const selectedService = service ? serviceBySlug(service) : null
  const quote = quotes[plan] ?? null

  const filteredServices = useMemo(() => {
    if (!query) return SERVICES
    const q = query.toLowerCase()
    return SERVICES.filter((s) => s.label.toLowerCase().includes(q) || s.slug.includes(q))
  }, [query])

  // À l'ouverture du modal (ou changement pays/service), on interroge la
  // disponibilité + le prix de CHAQUE forfait en parallèle. Les forfaits
  // indisponibles seront grisés. Le forfait actif retombe sur "verification".
  useEffect(() => {
    if (!service) {
      setQuotes({})
      return
    }
    let cancelled = false
    setLoadingQuotes(true)
    setQuotes({})
    setPlan('verification')
    Promise.all(
      RENTAL_PLANS.map((p) =>
        getQuote(country, service, p.key).then((q) => [p.key, q] as const),
      ),
    ).then((entries) => {
      if (cancelled) return
      setQuotes(Object.fromEntries(entries))
      setLoadingQuotes(false)
    })
    return () => {
      cancelled = true
    }
  }, [country, service, getQuote])

  async function confirmBuy() {
    if (!service || !quote?.available) return
    setBuying(true)
    const res = await buyActivation(country, service, plan)
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
          Choisissez un pays et un service. ChapCam vous garantit automatiquement le meilleur prix, en FCFA, tout
          compris.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        {/* Pays */}
        <aside className={`${card} h-fit p-5`}>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">Pays</label>
          <div className="mb-4">
            <CountrySelect value={country} onChange={setCountry} />
          </div>

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

          <p className="flex items-center gap-1.5 text-sm text-white/50">
            {filteredServices.length} services disponibles pour
            {selectedCountry && <CountryFlag code={selectedCountry.code} size={18} />}
            {selectedCountry?.name}
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredServices.map((s) => (
              <button
                key={s.slug}
                onClick={() => setService(s.slug)}
                className={`${card} flex items-center gap-3 p-4 text-left transition-colors hover:border-blue-500/50`}
              >
                <ServiceLogo logo={s.logo} label={s.label} variant={s.logoVariant} size={40} />
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
              <ServiceLogo logo={selectedService.logo} label={selectedService.label} variant={selectedService.logoVariant} size={44} />
              <div className="flex-1">
                <p className="font-medium text-white">{selectedService.label}</p>
                <p className="text-xs text-white/40">
                  {selectedCountry?.name} · {selectedCountry?.dial}
                </p>
              </div>
              {selectedCountry && <CountryFlag code={selectedCountry.code} size={28} />}
            </div>

            {/* Sélecteur de forfait affiché uniquement s'il existe plusieurs
                forfaits. Avec sms-man, seul le forfait "vérification" existe :
                on masque la sélection pour aller droit au but. */}
            {RENTAL_PLANS.length > 1 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">Forfait</p>
                <div className="grid grid-cols-2 gap-2">
                  {RENTAL_PLANS.map((p) => {
                    const q = quotes[p.key]
                    const pending = loadingQuotes && q === undefined
                    const unavailable = !pending && (!q || !q.available)
                    const active = plan === p.key
                    return (
                      <button
                        key={p.key}
                        disabled={unavailable || buying}
                        onClick={() => setPlan(p.key)}
                        className={`rounded-xl border p-3 text-left transition-colors ${
                          active
                            ? 'border-blue-500 bg-blue-500/10'
                            : unavailable
                              ? 'cursor-not-allowed border-white/5 bg-white/[0.01] opacity-40'
                              : 'border-white/10 hover:border-blue-500/50'
                        }`}
                      >
                        <p className="text-sm font-medium text-white">{p.short}</p>
                        <p className="mt-0.5 text-xs text-white/40">
                          {pending ? (
                            <span className="inline-flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" /> ...
                            </span>
                          ) : q?.available && q.priceXof != null ? (
                            formatXOF(q.priceXof)
                          ) : (
                            'Indisponible'
                          )}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2 rounded-xl bg-white/[0.02] p-4 text-sm">
              {loadingQuotes && quote === null ? (
                <div className="flex items-center justify-center gap-2 py-4 text-white/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recherche du meilleur prix...
                </div>
              ) : quote?.available ? (
                <>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    {quote.providerCount} numéro(s) disponible(s)
                    <span className="ml-auto flex items-center gap-1 text-blue-400">
                      <Zap className="h-3.5 w-3.5" /> Auto — le moins cher
                    </span>
                  </div>
                  {quote.successRate != null && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-white/50">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        Taux de réussite SMS estimé
                      </span>
                      <span className="font-semibold text-emerald-400">{quote.successRate}%</span>
                    </div>
                  )}
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
                  Forfait indisponible pour cette combinaison. Essayez un autre forfait ou un autre pays.
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
                disabled={!quote?.available || buying || loadingQuotes}
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
