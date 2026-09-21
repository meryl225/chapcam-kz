'use client'

import { useState } from 'react'
import { ArrowLeft, Check, LockKeyhole, ShieldCheck, Smartphone, WalletCards, X } from 'lucide-react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((response) => response.json())
import Link from 'next/link'
import Image from 'next/image'
import { usePaymentCheckout } from '@/components/payment/use-payment-checkout'
import { JETONS_OFFERS } from '@/lib/jetons-offers'

export default function JetonsPage() {
  const { startCheckout, pendingKey, error, modal } = usePaymentCheckout()
  const { data: jetons } = useSWR<{ balance: number }>('/api/jetons', fetcher, { refreshInterval: 15000 })
  const [selected, setSelected] = useState('jetons_500')

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070d1b] px-4 py-8 text-white sm:px-8 lg:px-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(28,68,109,.28),transparent_38%),radial-gradient(circle_at_20%_80%,rgba(9,124,107,.16),transparent_30%)]" />
      {modal}
      <div className="relative mx-auto max-w-6xl">
        <Link href="/dashboard" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Retour au dashboard</Link>

        <section className="mx-auto max-w-3xl rounded-[24px] border border-white/15 bg-[#151e31]/95 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7">
          <header className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-2xl ring-1 ring-cyan-300/60"><Image src="/images/jetons-logo.jpg" alt="Logo des Jetons ChapCam" width={48} height={48} className="h-full w-full object-cover" priority /></div>
              <div><h1 className="text-xl font-bold sm:text-2xl">Ajouter des Jetons</h1><p className="text-sm text-slate-400">Rechargez votre solde pour utiliser les outils ChapCam.</p></div>
            </div>
            <Link href="/dashboard" aria-label="Fermer" className="rounded-full bg-white/10 p-2 text-slate-300 transition hover:bg-white/20 hover:text-white"><X className="h-5 w-5" /></Link>
          </header>

          <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-[#0d1525] p-4">
            <Image src="/images/jetons-logo.jpg" alt="Jetons" width={44} height={44} className="h-11 w-11 rounded-xl object-cover" />
            <div><p className="text-xs text-slate-400">Votre solde actuel</p><p className="text-lg font-bold text-emerald-300">Jetons disponibles</p></div>
            <div className="ml-auto text-2xl font-black text-emerald-300">{jetons?.balance ?? 0}</div>
            <p className="hidden max-w-[170px] border-l border-white/10 pl-4 text-xs leading-5 text-slate-400 sm:block">Un seul solde pour tous les outils sauf Live Swap.</p>
          </div>

          <div className="mt-4 space-y-3">
            {JETONS_OFFERS.map((offer) => {
              const active = selected === offer.id
              const loading = pendingKey === offer.id
              return <div key={offer.id} className={`relative flex items-center gap-3 rounded-2xl border p-3 transition sm:gap-4 sm:p-4 ${active ? 'border-emerald-300 bg-emerald-400/10 shadow-[0_0_24px_rgba(52,211,153,.18)]' : 'border-white/10 bg-white/[.03] hover:border-cyan-300/40'}`}>
                {offer.featured && <span className="absolute -top-3 left-6 rounded-full bg-emerald-300 px-3 py-1 text-[10px] font-black text-emerald-950">Le plus choisi</span>}
                <button type="button" onClick={() => setSelected(offer.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left sm:gap-4">
                  <Image src="/images/jetons-logo.jpg" alt="" width={48} height={48} className="h-11 w-11 shrink-0 rounded-xl object-cover sm:h-12 sm:w-12" />
                  <span className="min-w-0"><strong className="block text-base sm:text-lg">{offer.jetons.toLocaleString('fr-FR')} Jetons</strong><small className="text-xs text-slate-400">Solde ajouté immédiatement après paiement</small></span>
                </button>
                <span className="hidden border-l border-white/10 pl-4 text-sm font-bold sm:block">{offer.price.toLocaleString('fr-FR')} FCFA</span>
                <button type="button" disabled={!!pendingKey} onClick={() => startCheckout(offer.id, { loaderKey: offer.id })} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition sm:min-w-24 ${active ? 'bg-emerald-300 text-emerald-950 hover:bg-emerald-200' : 'bg-white/10 text-white hover:bg-white/20'} disabled:opacity-50`}>{loading ? '...' : 'Acheter'}</button>
                {active && <Check className="hidden h-5 w-5 text-emerald-300 sm:block" />}
              </div>
            })}
          </div>

          {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 border-t border-white/10 pt-5 text-xs text-slate-400"><span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-4 w-4 text-emerald-300" /> Paiement sécurisé</span><span className="inline-flex items-center gap-1.5"><Smartphone className="h-4 w-4" /> Mobile Money</span><span className="inline-flex items-center gap-1.5"><WalletCards className="h-4 w-4" /> Carte</span><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-300" /> 100% sécurisé</span></div>
        </section>
      </div>
    </main>
  )
}
