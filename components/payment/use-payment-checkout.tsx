'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Loader2,
  ShieldCheck,
  X,
  Headphones,
  Lock,
  BadgeCheck,
  Search,
  Check,
  Smartphone,
  Bitcoin,
  ArrowRight,
} from 'lucide-react'
import { isInAppBrowser } from '@/lib/in-app-browser'
import { InAppBrowserNotice } from '@/components/in-app-browser-notice'
import { PAYMENT_COUNTRIES, type UICountry, type UICountryMethod } from '@/lib/geniuspay-countries'
import { getPlan } from '@/lib/plans'

// Drapeau rendu comme VRAIE image (flagcdn.com) et non emoji : les emojis
// drapeaux ne s'affichent pas sous Windows/Chrome (seul le code pays apparait).
// Le CDN sert un PNG par code ISO2 ; on garde une image transparente en repli.
function FlagIcon({ code, className = '' }: { code: string; className?: string }) {
  const cc = code.toLowerCase()
  return (
    <img
      src={`https://flagcdn.com/w40/${cc}.png`}
      srcSet={`https://flagcdn.com/w80/${cc}.png 2x`}
      width={24}
      height={18}
      loading="lazy"
      alt=""
      aria-hidden
      className={`inline-block shrink-0 rounded-[3px] object-cover shadow-sm ring-1 ring-white/10 ${className}`}
    />
  )
}

export type PaymentMethod = 'paydunya' | 'trybit' | 'nowpayments' | 'geniuspay'

interface StartOptions {
  phoneNumber?: string
  // Cle utilisee pour l'etat de chargement du bouton (defaut : productId).
  loaderKey?: string
}

interface Chooser {
  productId: string
  phoneNumber?: string
  loaderKey: string
}

const ENDPOINTS: Record<PaymentMethod, string> = {
  paydunya: '/api/payment/create',
  trybit: '/api/payment/trybit/create',
  nowpayments: '/api/payment/nowpayments/create',
  geniuspay: '/api/payment/geniuspay/create',
}

const DEFAULT_COUNTRY = PAYMENT_COUNTRIES[0] // Cote d'Ivoire (PayDunya)

// Hook partage de paiement ChapCam. Presente un ecran "Finalisez votre paiement"
// (pays -> methode -> recap) puis redirige vers la page du prestataire :
//   - CI / BJ / TG  -> PayDunya
//   - autres pays   -> GeniusPay
//   - cryptomonnaie -> NOWPayments
// Gere aussi les navigateurs in-app.
export function usePaymentCheckout() {
  const [chooser, setChooser] = useState<Chooser | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [pendingMethod, setPendingMethod] = useState<PaymentMethod | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inAppUrl, setInAppUrl] = useState<string | null>(null)

  // Selection pays / methode.
  const [countryCode, setCountryCode] = useState<string>(DEFAULT_COUNTRY.code)
  const [methodId, setMethodId] = useState<string>(DEFAULT_COUNTRY.methods[0].id)
  const [countryOpen, setCountryOpen] = useState(false)
  const [query, setQuery] = useState('')

  const country = useMemo<UICountry>(
    () => PAYMENT_COUNTRIES.find((c) => c.code === countryCode) || DEFAULT_COUNTRY,
    [countryCode],
  )
  const method = useMemo<UICountryMethod | null>(
    () => country.methods.find((m) => m.id === methodId) || country.methods[0] || null,
    [country, methodId],
  )
  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return PAYMENT_COUNTRIES
    return PAYMENT_COUNTRIES.filter((c) => c.name.toLowerCase().includes(q))
  }, [query])

  // Formule d'abonnement (pour le recapitulatif de droite). null => autre produit
  // (packs de credits, etc.) : on masque le recap et le montant.
  const plan = useMemo(() => (chooser ? getPlan(chooser.productId) : undefined), [chooser])

  const selectCountry = useCallback((c: UICountry) => {
    setCountryCode(c.code)
    setMethodId(c.methods[0]?.id || '')
    setCountryOpen(false)
    setQuery('')
  }, [])

  const startCheckout = useCallback((productId: string, opts?: StartOptions) => {
    setError(null)
    // Reinitialise la selection a chaque ouverture.
    setCountryCode(DEFAULT_COUNTRY.code)
    setMethodId(DEFAULT_COUNTRY.methods[0].id)
    setCountryOpen(false)
    setQuery('')
    setChooser({
      productId,
      phoneNumber: opts?.phoneNumber,
      loaderKey: opts?.loaderKey || productId,
    })
  }, [])

  const close = useCallback(() => {
    if (pendingKey) return // on ne ferme pas pendant une redirection en cours
    setChooser(null)
    setError(null)
    setCountryOpen(false)
  }, [pendingKey])

  const pay = useCallback(
    async (payMethod: PaymentMethod, extra?: { country?: string; method?: string }) => {
      if (!chooser) return
      setError(null)
      setPendingKey(chooser.loaderKey)
      setPendingMethod(payMethod)
      try {
        const res = await fetch(ENDPOINTS[payMethod], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: chooser.productId,
            phoneNumber: chooser.phoneNumber,
            ...(extra?.country ? { country: extra.country } : {}),
            ...(extra?.method ? { method: extra.method } : {}),
          }),
        })
        const data = await res.json().catch(() => null)
        if (res.ok && data?.success && data?.invoice_url) {
          if (isInAppBrowser()) {
            setInAppUrl(data.invoice_url)
            setPendingKey(null)
            setPendingMethod(null)
            return
          }
          window.location.href = data.invoice_url
          return
        }
        setError(data?.error || 'Impossible de demarrer le paiement. Reessayez.')
      } catch {
        setError('Erreur de connexion. Reessayez.')
      } finally {
        setPendingKey(null)
        setPendingMethod(null)
      }
    },
    [chooser],
  )

  // Soumission de l'etape pays + methode -> bon prestataire.
  // CI / BJ / TG : le Mobile Money reste sur PayDunya, mais la carte bancaire
  // (Visa / Mastercard) est routee vers GeniusPay. Les autres pays passent
  // toujours entierement par GeniusPay.
  const submit = useCallback(() => {
    if (!method) return
    if (country.provider === 'paydunya' && method.kind !== 'card') {
      pay('paydunya')
    } else {
      pay('geniuspay', { country: country.code, method: method.id })
    }
  }, [country, method, pay])

  const busy = !!pendingKey
  const priceLabel = plan ? `${plan.price.toLocaleString('fr-FR')} FCFA` : null

  const modal: ReactNode = (
    <>
      {inAppUrl && <InAppBrowserNotice url={inAppUrl} onClose={() => setInAppUrl(null)} />}
      {chooser && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md duration-300 animate-in fade-in-0 sm:items-center">
          <div className="relative my-auto w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0b13] text-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.95)] duration-300 animate-in zoom-in-95 fade-in-0">
            {/* Halo violet decoratif */}
            <div className="pointer-events-none absolute -top-32 left-1/4 h-72 w-96 -translate-x-1/2 rounded-full bg-[#7c5cff]/25 blur-[100px]" />
            <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/5" />

            <button
              onClick={close}
              disabled={busy}
              className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 backdrop-blur transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative max-h-[92vh] overflow-y-auto p-6 sm:p-8">
              {/* En-tete */}
              <div className="mb-8">
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c5cff]/25 to-[#5b3df5]/10 text-[#a78bfa] ring-1 ring-inset ring-[#7c5cff]/25">
                  <ShieldCheck className="h-6 w-6" />
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-white text-balance">
                  Finalisez votre paiement
                </h2>
                <p className="mt-1 text-sm text-white/45">
                  Paiement sécurisé et activation automatique après confirmation.
                </p>
              </div>

              {error && (
                <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className={`grid gap-8 ${plan ? 'lg:grid-cols-[1fr_320px]' : ''}`}>
                {/* ===== Colonne gauche : etapes ===== */}
                <div>
                  {/* Etape 1 : pays */}
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7c5cff] text-xs font-bold text-white">
                      1
                    </span>
                    <span className="text-base font-semibold text-white">Pays de paiement</span>
                  </div>

                  <div className="relative mb-8">
                    <button
                      onClick={() => setCountryOpen((o) => !o)}
                      disabled={busy}
                      className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-left transition-colors hover:border-white/20 disabled:opacity-60"
                    >
                      <FlagIcon code={country.code} className="h-[21px] w-7" />
                      <span className="flex-1 text-base font-medium text-white">{country.name}</span>
                      <ChevronDown
                        className={`h-5 w-5 text-white/40 transition-transform ${countryOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {countryOpen && (
                      <>
                        <button
                          className="fixed inset-0 z-10 cursor-default"
                          aria-hidden
                          tabIndex={-1}
                          onClick={() => setCountryOpen(false)}
                        />
                        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#12141f] shadow-2xl">
                          <div className="relative border-b border-white/5 p-2">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                            <input
                              type="text"
                              autoFocus
                              value={query}
                              onChange={(e) => setQuery(e.target.value)}
                              placeholder="Rechercher un pays…"
                              className="w-full rounded-xl bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#7c5cff]/50"
                            />
                          </div>
                          <div className="max-h-64 overflow-y-auto py-1">
                            {filteredCountries.map((c) => (
                              <button
                                key={c.code}
                                onClick={() => selectCountry(c)}
                                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5 ${
                                  c.code === countryCode ? 'bg-[#7c5cff]/10' : ''
                                }`}
                              >
                                <FlagIcon code={c.code} className="h-[18px] w-6" />
                                <span className="flex-1 text-sm font-medium text-white">{c.name}</span>
                                {c.code === countryCode && <Check className="h-4 w-4 text-[#a78bfa]" />}
                              </button>
                            ))}
                            {filteredCountries.length === 0 && (
                              <p className="py-6 text-center text-sm text-white/40">Aucun pays trouvé.</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Etape 2 : methode */}
                  <div className="mb-1 flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7c5cff] text-xs font-bold text-white">
                      2
                    </span>
                    <span className="text-base font-semibold text-white">Moyen de paiement</span>
                  </div>
                  <p className="mb-4 pl-[34px] text-sm text-white/40">
                    Sélectionnez votre méthode de paiement
                  </p>

                  <div className="flex flex-col gap-3">
                    {country.methods.map((m, i) => {
                      const selected = method?.id === m.id
                      const Icon = Smartphone
                      return (
                        <button
                          key={m.id}
                          onClick={() => setMethodId(m.id)}
                          disabled={busy}
                          className={`group flex items-center gap-4 rounded-2xl border p-4 text-left transition-all disabled:opacity-60 ${
                            selected
                              ? 'border-[#7c5cff]/70 bg-[#7c5cff]/[0.08] shadow-[0_8px_30px_-12px_rgba(124,92,255,0.5)]'
                              : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                          }`}
                        >
                          {m.kind === 'card' ? (
                            <span className="flex shrink-0 items-center gap-1.5">
                              <span className="flex h-11 w-12 items-center justify-center rounded-xl bg-white px-2">
                                <img
                                  src="/images/visa-logo.svg"
                                  alt="Visa"
                                  className="max-h-4 w-full object-contain"
                                />
                              </span>
                              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-2">
                                <img
                                  src="/images/mastercard-logo.svg"
                                  alt="Mastercard"
                                  className="max-h-full max-w-full object-contain"
                                />
                              </span>
                            </span>
                          ) : (
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f59e0b]/20 to-[#d97706]/10 text-[#fbbf24] ring-1 ring-inset ring-[#f59e0b]/20">
                              <Icon className="h-5 w-5" />
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-[15px] font-semibold text-white">{m.label}</span>
                              {i === 0 && (
                                <span className="rounded-md bg-[#7c5cff]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#c4b5fd]">
                                  Recommandé
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-white/40">
                              {m.sublabel || (m.kind === 'card' ? 'Paiement par carte bancaire' : 'Paiement rapide et sécurisé')}
                            </span>
                          </span>
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              selected ? 'border-[#a78bfa] bg-[#a78bfa] text-[#0a0b13]' : 'border-white/25'
                            }`}
                          >
                            {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Autres moyens : cryptomonnaie */}
                  <p className="mb-3 mt-6 text-sm font-semibold text-white/70">Autres moyens de paiement</p>
                  <button
                    onClick={() => pay('nowpayments')}
                    disabled={busy}
                    className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all hover:border-[#f7931a]/50 disabled:opacity-60"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f7931a]/20 to-[#26a17b]/15 text-[#f7931a] ring-1 ring-inset ring-[#f7931a]/20">
                      {pendingMethod === 'nowpayments' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bitcoin className="h-5 w-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-white">Payer en cryptomonnaie</span>
                      <span className="mt-0.5 block text-xs text-white/40">
                        Bitcoin, USDT, ETH et plus de 200 cryptos acceptées
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-[#f7931a]" />
                  </button>
                </div>

                {/* ===== Colonne droite : recapitulatif (formules uniquement) ===== */}
                {plan && (
                  <aside className="lg:pt-1">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                      <h3 className="text-base font-semibold text-white">Récapitulatif de la commande</h3>

                      <div className="mt-5 space-y-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-white/45">Plan sélectionné</span>
                          <span className="font-medium text-white">{plan.name} {plan.duration}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-white/45">Montant</span>
                          <span className="font-semibold text-white">{priceLabel}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-white/45">Frais de transaction</span>
                          <span className="font-medium text-emerald-400">Gratuit</span>
                        </div>
                      </div>

                      <div className="my-4 border-t border-dashed border-white/10" />

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-white/70">Total à payer</span>
                        <span className="text-xl font-bold text-[#a78bfa]">{priceLabel}</span>
                      </div>

                      <ul className="mt-5 space-y-2.5">
                        {plan.features.slice(0, 4).map((f) => (
                          <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#a78bfa]" />
                            <span className="text-pretty">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </aside>
                )}
              </div>

              {/* CTA principal */}
              <button
                onClick={submit}
                disabled={busy || !method}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7c5cff] to-[#5b3df5] px-6 py-4 text-base font-bold text-white shadow-lg shadow-[#7c5cff]/30 transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingMethod && pendingMethod !== 'nowpayments' ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Redirection…
                  </>
                ) : (
                  <>
                    {priceLabel ? `Continuer le paiement — ${priceLabel}` : 'Continuer le paiement'}
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
              <p className="mt-3 flex items-center justify-center gap-2 text-xs text-white/40">
                <Lock className="h-3.5 w-3.5" />
                Paiement sécurisé
                <span className="text-white/20">•</span>
                Activation automatique
              </p>

              {/* Gages de confiance - footer 3 colonnes */}
              <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                {[
                  { icon: Lock, color: 'text-[#a78bfa]', title: 'Données cryptées', sub: 'SSL 256 bits' },
                  { icon: ShieldCheck, color: 'text-emerald-400', title: 'Conformité PCI DSS', sub: 'Paiements sécurisés' },
                  { icon: Headphones, color: 'text-[#60a5fa]', title: 'Support 24/7', sub: 'Nous sommes là pour vous' },
                ].map((item) => (
                  <div key={item.title} className="flex flex-col items-center gap-1.5 text-center">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                    <span className="text-[11px] font-semibold leading-tight text-white/85 text-pretty">{item.title}</span>
                    <span className="text-[10px] leading-tight text-white/35 text-pretty">{item.sub}</span>
                  </div>
                ))}
              </div>

              {/* Barre plateforme verifiee */}
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/50">
                    <BadgeCheck className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] leading-tight text-white/45 text-pretty">
                    Vos données sont protégées par un chiffrement de niveau bancaire.
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-[#3b82f6]" />
                  <span className="flex flex-col leading-tight">
                    <span className="text-[11px] font-semibold text-white">chapcam.com</span>
                    <span className="text-[10px] text-emerald-400">Plateforme vérifiée</span>
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )

  return { startCheckout, pendingKey, error, setError, modal }
}
