'use client'

import Image from 'next/image'
import {
  Home,
  Smartphone,
  Wifi,
  Check,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'
import type { ProxyProduct } from '@/lib/proxy/products'

const ICONS = {
  home: Home,
  sim: Smartphone,
  wifi: Wifi,
} as const

type Props = {
  products: ProxyProduct[]
}

export function ProxyProClient({ products }: Props) {
  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* En-tête */}
        <header className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">ChapCam Proxy Pro</h1>
              <p className="text-sm text-muted-foreground">
                Proxies résidentiels, ISP et mobiles — anonymat et fiabilité de niveau pro.
              </p>
            </div>
          </div>
        </header>

        {/* ChapSim — proxies disponibles maintenant */}
        <div className="mb-8 overflow-hidden rounded-3xl border border-[#7c3aed]/40 bg-[#0b0a1a]">
          <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_320px]">
            {/* Texte + CTA */}
            <div className="relative flex flex-col justify-center gap-4 p-6 sm:p-8">
              <div
                aria-hidden
                className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full opacity-60 blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.4), transparent 70%)' }}
              />
              <div className="relative">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7c3aed]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#a78bfa]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Disponible maintenant
                </span>
                <h2 className="mt-3 text-2xl font-bold text-white text-balance sm:text-3xl">
                  Proxies premium avec ChapSim
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60 text-pretty">
                  Proxies résidentiels, mobiles et IP statiques dans 180+ pays, avec SMS OTP et
                  numéros virtuels. Activation instantanée, sessions stables et fiables.
                </p>

                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {[
                    'Proxies résidentiels & mobiles',
                    'IP statiques dédiées',
                    'Activation instantanée',
                    'Sessions stables & sécurisées',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/85">
                      <Check className="h-4 w-4 shrink-0 text-[#a78bfa]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="https://chapsim.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#7c3aed] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#6d28d9]"
                >
                  Obtenir sur ChapSim
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </div>
            </div>

            {/* Aperçu de l'app */}
            <div className="relative flex items-end justify-center bg-gradient-to-b from-[#7c3aed]/20 to-transparent px-6 pt-6 sm:px-8">
              <a
                href="https://chapsim.app/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ouvrir ChapSim"
                className="block w-40 overflow-hidden rounded-t-3xl border-x border-t border-white/10 shadow-2xl shadow-[#7c3aed]/30 transition-transform duration-300 hover:-translate-y-1 sm:w-48"
              >
                <Image
                  src="/chapsim/proxy-app.jpg"
                  alt="Application ChapSim — page Proxy avec proxies résidentiels et mobiles"
                  width={480}
                  height={1040}
                  className="h-auto w-full"
                />
              </a>
            </div>
          </div>
        </div>

        {/* Offres (vitrine) */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const Icon = ICONS[p.icon]
            return (
              <article
                key={p.id}
                className={`flex flex-col rounded-3xl border bg-card/60 p-6 backdrop-blur-sm transition-colors ${
                  p.highlight ? 'border-primary/50' : 'border-hairline'
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <h2 className="text-lg font-bold leading-tight text-foreground text-balance">
                    {p.name}
                  </h2>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>

                <p className="mb-5 text-sm leading-relaxed text-muted-foreground text-pretty">
                  {p.tagline}
                </p>

                <ul className="mb-6 flex flex-col gap-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/90">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  <a
                    href="https://chapsim.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Obtenir sur ChapSim
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
