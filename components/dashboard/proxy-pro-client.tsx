'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Home,
  Smartphone,
  Wifi,
  Check,
  Copy,
  Loader2,
  Lock,
  Zap,
  ShieldCheck,
} from 'lucide-react'
import type { ProxyProductPriced, ProxyProductId } from '@/lib/proxy/products'

const ICONS = {
  home: Home,
  sim: Smartphone,
  wifi: Wifi,
} as const

type Credentials = {
  product: string
  host: string | null
  port: string | null
  username: string | null
  password: string | null
  quotaGb: number
  usedGb: number
  status: string
}

type Props = {
  products: ProxyProductPriced[]
  hasPlan: boolean
  planLabel: string
}

const fmt = new Intl.NumberFormat('fr-FR')

export function ProxyProClient({ products, hasPlan, planLabel }: Props) {
  const [loading, setLoading] = useState<ProxyProductId | null>(null)
  const [creds, setCreds] = useState<Record<string, Credentials>>({})
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function activate(product: ProxyProductId) {
    setError(null)
    setLoading(product)
    try {
      const res = await fetch('/api/proxy/activate-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? "Activation impossible")
        return
      }
      setCreds((c) => ({ ...c, [product]: data.credentials }))
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(null)
    }
  }

  function copy(key: string, value: string | null) {
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied((k) => (k === key ? null : k)), 1500)
  }

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
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-hairline bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" />
            {planLabel}
          </p>
        </header>

        {/* Bandeau aucun forfait */}
        {!hasPlan && (
          <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
                <Lock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="font-bold text-foreground">Aucun forfait actif</p>
                <p className="text-sm text-muted-foreground">
                  ChapCam Proxy Pro nécessite un forfait actif. Souscrivez pour activer une offre.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/plans"
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-primary/90"
            >
              <Zap className="h-4 w-4" />
              Voir les forfaits
            </Link>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Offres */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const Icon = ICONS[p.icon]
            const active = creds[p.id]
            const isLoading = loading === p.id
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
                  <p className="text-xs text-muted-foreground">À partir de</p>
                  <p className="mb-4 text-2xl font-bold text-foreground">
                    {fmt.format(p.priceXof)}
                    <span className="text-sm font-medium text-muted-foreground"> FCFA/{p.unit}</span>
                  </p>

                  {active ? (
                    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
                        <Check className="h-4 w-4" /> Offre activée
                      </p>
                      <div className="flex flex-col gap-2">
                        {(
                          [
                            ['Hôte', active.host, `${p.id}-host`],
                            ['Port', active.port, `${p.id}-port`],
                            ['Utilisateur', active.username, `${p.id}-user`],
                            ['Mot de passe', active.password, `${p.id}-pass`],
                          ] as const
                        ).map(([label, value, key]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between gap-2 rounded-lg bg-background/60 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                {label}
                              </p>
                              <p className="truncate font-mono text-xs text-foreground">{value}</p>
                            </div>
                            <button
                              onClick={() => copy(key, value)}
                              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                              aria-label={`Copier ${label}`}
                            >
                              {copied === key ? (
                                <Check className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => activate(p.id)}
                      disabled={!hasPlan || isLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-black transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Activation...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4" /> Activer
                        </>
                      )}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
