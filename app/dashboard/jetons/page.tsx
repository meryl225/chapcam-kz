'use client'

import { useState } from 'react'
import { ArrowLeft, Check, CreditCard, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { usePaymentCheckout } from '@/components/payment/use-payment-checkout'
import { JETONS_OFFERS } from '@/lib/jetons-offers'

export default function JetonsPage() {
  const { startCheckout, pendingKey, error, modal } = usePaymentCheckout()
  const [selected, setSelected] = useState('jetons_500')

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8 lg:px-12">
      {modal}
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour au dashboard
        </Link>

        <section className="relative overflow-hidden rounded-[28px] border border-emerald-400/25 bg-gradient-to-br from-[#071b1b] via-background to-[#11192d] p-6 shadow-2xl shadow-emerald-950/30 sm:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative flex flex-col items-center text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl ring-2 ring-emerald-300/50 shadow-xl shadow-emerald-950/50">
              <Image src="/images/jetons-logo.jpg" alt="Logo des Jetons ChapCam" width={80} height={80} className="h-full w-full object-cover" priority />
            </div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300"><Sparkles className="h-3.5 w-3.5" /> Recharge ChapCam</p>
            <h1 className="max-w-2xl text-balance text-3xl font-black tracking-tight sm:text-5xl">Rechargez vos Jetons</h1>
            <p className="mt-4 max-w-xl text-pretty leading-6 text-muted-foreground">Un seul solde pour tous vos outils ChapCam, sauf Live Swap. Paiement sécurisé et crédit automatique après confirmation.</p>
          </div>
        </section>

        {error && <div className="mx-auto mt-6 max-w-xl rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-center text-sm text-red-300">{error}</div>}

        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-emerald-300">1 000 FCFA = 100 Jetons</p><h2 className="mt-1 text-2xl font-bold">Choisissez votre recharge</h2></div><span className="hidden text-sm text-muted-foreground sm:block">Prix en FCFA</span></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {JETONS_OFFERS.map((offer) => {
              const active = selected === offer.id
              const loading = pendingKey === offer.id
              return <button key={offer.id} type="button" onClick={() => setSelected(offer.id)} className={`relative flex min-h-48 flex-col rounded-2xl border p-5 text-left transition ${active ? 'border-emerald-300 bg-emerald-400/10 shadow-lg shadow-emerald-950/30' : 'border-white/10 bg-white/[0.03] hover:border-emerald-400/40'}`}>
                {offer.featured && <span className="absolute -top-3 left-4 rounded-full bg-emerald-300 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-950">Le plus choisi</span>}
                <div className="flex items-center justify-between"><span className="text-3xl font-black">{offer.jetons.toLocaleString('fr-FR')}</span>{active && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-300 text-emerald-950"><Check className="h-4 w-4" /></span>}</div>
                <span className="mt-1 text-sm font-semibold text-emerald-300">Jetons</span><span className="mt-auto pt-6 text-xl font-bold">{offer.price.toLocaleString('fr-FR')} <span className="text-sm font-medium text-muted-foreground">FCFA</span></span>
                <span className="mt-3 text-xs text-muted-foreground">Recharge immédiate après paiement</span>
              </button>
            })}
          </div>
          <button type="button" disabled={!!pendingKey} onClick={() => startCheckout(selected, { loaderKey: selected })} className="mx-auto mt-8 flex w-full max-w-md items-center justify-center gap-3 rounded-2xl bg-emerald-400 px-6 py-4 font-bold text-emerald-950 shadow-xl shadow-emerald-950/30 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"><CreditCard className="h-5 w-5" /> {pendingKey ? 'Préparation du paiement…' : 'Continuer vers le paiement'}</button>
        </section>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Paiement sécurisé</span><span>Mobile Money, carte et crypto disponibles</span></div>
      </div>
    </main>
  )
}
