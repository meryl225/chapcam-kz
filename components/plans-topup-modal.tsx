"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Check, Crown, Sparkles, X, Zap } from "lucide-react"
import { PLANS } from "@/lib/plans"
import { CURRENCIES, useCurrencySelection, formatConverted } from "@/lib/currency-convert"

const formatPrice = (price: number) => new Intl.NumberFormat("fr-FR").format(price)

export function PlansTopupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Convertisseur de devise indicatif (detection auto par pays + choix manuel).
  // Le debit reel reste toujours en FCFA (XOF).
  const { currency, currencyCode, setCurrencyCode, rates } = useCurrencySelection()

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="plans-topup-title">
      <button type="button" aria-label="Fermer les offres" className="absolute inset-0 cursor-default bg-[#071a42]/45 backdrop-blur-md" onClick={onClose} />
      <div className="relative max-h-[min(760px,calc(100vh-32px))] w-full max-w-6xl overflow-y-auto rounded-[28px] border border-white/80 bg-[#eef8ff]/95 p-5 shadow-[0_30px_100px_-30px_rgba(19,67,132,.65)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(14,165,233,.18),transparent_28%),radial-gradient(circle_at_90%_15%,rgba(124,58,237,.14),transparent_30%)]" />
        <div className="relative flex items-start justify-between gap-6">
          <div><span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/50 bg-white/65 px-3 py-1 text-[10px] font-bold uppercase tracking-[.16em] text-[#0788c4]"><Sparkles className="h-3.5 w-3.5" />ChapCam Pro</span><h2 id="plans-topup-title" className="mt-3 text-3xl font-black tracking-[-.05em] text-[#071a42] sm:text-4xl">Choisis ton niveau de création.</h2><p className="mt-2 max-w-2xl text-sm text-[#607493]">Débloque les outils IA, les minutes de création et les avantages premium adaptés à ton rythme.</p></div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#cfe2f2] bg-white/70 text-[#526986] transition hover:bg-white hover:text-[#071a42]"><X className="h-5 w-5" /></button>
        </div>
        <div className="relative mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <label htmlFor="topup-currency" className="text-xs font-semibold text-[#526986]">Afficher les prix en</label>
          <select
            id="topup-currency"
            value={currencyCode}
            onChange={(e) => setCurrencyCode(e.target.value)}
            className="cursor-pointer rounded-lg border border-[#cfe2f2] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#071a42] outline-none focus:border-cyan-400"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          {currency.code !== "XOF" && (
            <span className="text-[11px] text-[#71839e]">Conversion indicative · débit en FCFA (XOF)</span>
          )}
        </div>
        <div className="relative mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.filter((plan) => ["starter", "premium", "ultimate", "vipdebout"].includes(plan.id)).map((plan) => {
            const featured = plan.bestOffer || plan.highlight
            return <article key={plan.id} className={`relative overflow-hidden rounded-2xl border p-5 ${featured ? "border-[#658df2] bg-[#102b63] text-white shadow-[0_18px_45px_-18px_rgba(37,99,235,.65)]" : "border-[#d4e7f4] bg-white/85 text-[#071a42]"}`}>
              {plan.bestOffer && <span className="absolute right-3 top-3 rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-[#071a42]">Meilleure offre</span>}
              <div className="flex items-center gap-2"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${featured ? "bg-white/15 text-cyan-200" : "bg-[#e8f6ff] text-[#138fd5]"}`}>{plan.bestOffer ? <Crown className="h-4 w-4" /> : plan.id === "starter" ? <Zap className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}</span><div><h3 className="font-bold">{plan.name}</h3><p className={`text-[11px] ${featured ? "text-blue-100/70" : "text-[#71839e]"}`}>{plan.duration}</p></div></div>
              <div className="mt-5 flex items-end gap-2"><strong className="text-3xl tracking-[-.05em]">{formatPrice(plan.price)}</strong><span className={`mb-1 text-xs ${featured ? "text-blue-100/70" : "text-[#71839e]"}`}>FCFA</span></div>
              {formatConverted(plan.price, currency, rates) && (
                <p className={`mt-1 text-xs font-semibold ${featured ? "text-cyan-200" : "text-[#0788c4]"}`}>≈ {formatConverted(plan.price, currency, rates)}</p>
              )}
              <p className={`mt-1 text-xs ${featured ? "text-blue-100/70" : "text-[#71839e]"}`}>{plan.minutes} de création IA · {plan.photoVideoQuota} vidéos photo</p>
              <ul className={`mt-5 space-y-2 text-xs leading-5 ${featured ? "text-blue-50/85" : "text-[#536783]"}`}>{plan.features.slice(0, 4).map((feature) => <li key={feature} className="flex gap-2"><Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${featured ? "text-cyan-300" : "text-[#159fea]"}`} />{feature}</li>)}</ul>
              <Link href="/dashboard/plans" onClick={onClose} className={`mt-6 flex w-full items-center justify-center rounded-xl px-4 py-3 text-xs font-bold transition hover:-translate-y-0.5 ${featured ? "bg-gradient-to-r from-cyan-300 to-violet-400 text-[#071a42]" : "bg-[#e8f6ff] text-[#087bad] hover:bg-[#d9efff]"}`}>Choisir cette offre</Link>
            </article>
          })}
        </div>
        <p className="relative mt-5 text-center text-[11px] text-[#71839e]">Paiement sécurisé · Activation immédiate · Les offres complètes sont disponibles dans ton espace plans.</p>
      </div>
    </div>
  )
}
