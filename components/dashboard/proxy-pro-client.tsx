'use client'

import {
  Home,
  Smartphone,
  Wifi,
  Check,
  Clock,
  ShieldCheck,
  Rocket,
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

        {/* Bandeau lancement à venir */}
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-primary/30 bg-primary/10 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">Bientôt disponible</p>
              <p className="text-sm text-muted-foreground text-pretty">
                Nous finalisons la sélection de notre fournisseur de proxies. Les tarifs et
                l&apos;activation seront ouverts très prochainement.
              </p>
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
                  <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-hairline bg-background/60 px-3 py-1 text-sm font-medium text-muted-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    Tarif bientôt disponible
                  </p>

                  <button
                    type="button"
                    disabled
                    className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-hairline bg-card px-4 py-3 text-sm font-bold text-muted-foreground"
                  >
                    Bientôt disponible
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
