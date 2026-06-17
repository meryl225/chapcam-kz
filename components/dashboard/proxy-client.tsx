'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Shield, Copy, Check, Loader2, Globe, Zap, RefreshCw } from 'lucide-react'
import { CountryFlag } from '@/components/numbers/country-flag'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Pays disponibles — liste facilement extensible (garder en phase avec l'API).
const COUNTRIES = [
  { code: 'FR', name: 'France' },
  { code: 'US', name: 'États-Unis' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'GB', name: 'Royaume-Uni' },
  { code: 'CA', name: 'Canada' },
] as const

type Credentials = {
  country: string
  host: string | null
  port: string | null
  username: string | null
  password: string | null
  quotaGb: number
  usedGb: number
  status: string
}

type Props = {
  planLabel: string
  quotaGb: number
  usedGb: number
}

export function ProxyClient({ planLabel, quotaGb, usedGb }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [creds, setCreds] = useState<Credentials | null>(null)
  const [error, setError] = useState<string | null>(null)

  const remainingGb = Math.max(0, quotaGb - usedGb)
  const usedPct = quotaGb > 0 ? Math.min(100, (usedGb / quotaGb) * 100) : 0

  async function activate(country: string) {
    setError(null)
    setLoading(country)
    setSelected(country)
    try {
      const res = await fetch('/api/proxy/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country }),
      })
      const data = await res.json()
      if (res.ok && data.credentials) {
        setCreds(data.credentials)
      } else {
        setError(data.error || 'Activation impossible. Réessayez.')
      }
    } catch {
      setError('Erreur de connexion. Réessayez.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl text-balance">
                Navigation Sécurisée
              </h1>
              <p className="text-sm text-muted-foreground">
                Naviguez avec une IP résidentielle d&apos;un autre pays
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-hairline bg-card px-4 py-3">
            <Globe className="h-5 w-5 text-primary" />
            <div className="leading-tight">
              <p className="text-xs text-muted-foreground">Quota restant</p>
              <p className="text-sm font-bold text-foreground">
                {remainingGb.toFixed(1)} / {quotaGb} Go
              </p>
            </div>
          </div>
        </div>

        {/* Choisir un pays */}
        <section className="mb-8 rounded-3xl border border-hairline bg-card/60 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-bold text-foreground">Choisir un pays</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {COUNTRIES.map((c) => {
              const isActive = selected === c.code
              const isLoading = loading === c.code
              return (
                <button
                  key={c.code}
                  onClick={() => activate(c.code)}
                  disabled={!!loading}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all disabled:opacity-60 ${
                    isActive
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                      : 'border-hairline bg-background hover:border-primary/50'
                  }`}
                >
                  <CountryFlag code={c.code} size={40} />
                  <span className="text-xs font-semibold text-foreground">{c.name}</span>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </button>
              )
            })}
          </div>
          {error && (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
            </p>
          )}
        </section>

        {/* Identifiants de connexion */}
        {creds && (
          <section className="mb-8 rounded-3xl border border-hairline bg-card/60 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2">
              <CountryFlag code={creds.country} size={24} />
              <h2 className="text-lg font-bold text-foreground">Vos identifiants de connexion</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <CredentialField label="Host" value={creds.host ?? ''} />
              <CredentialField label="Port" value={creds.port ?? ''} />
              <CredentialField label="Username" value={creds.username ?? ''} />
              <CredentialField label="Password" value={creds.password ?? ''} secret />
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Entrez ces identifiants dans votre navigateur ou votre système (voir le guide ci-dessous).
            </p>
          </section>
        )}

        {/* Guide d'installation */}
        <section className="mb-8 rounded-3xl border border-hairline bg-card/60 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-bold text-foreground">Guide d&apos;installation</h2>
          <Tabs defaultValue="browser">
            <TabsList className="mb-4 grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
              <TabsTrigger value="browser">Chrome / Firefox</TabsTrigger>
              <TabsTrigger value="windows">Windows</TabsTrigger>
              <TabsTrigger value="mac">Mac</TabsTrigger>
            </TabsList>

            <TabsContent value="browser">
              <Guide
                steps={[
                  'Installez l\'extension « FoxyProxy » depuis le store Chrome ou Firefox.',
                  'Ouvrez FoxyProxy puis cliquez sur « Add » pour ajouter un nouveau proxy.',
                  'Renseignez le Host et le Port affichés ci-dessus (type : HTTP).',
                  'Saisissez le Username et le Password dans les champs d\'authentification.',
                  'Activez le proxy depuis l\'icône FoxyProxy : votre IP est maintenant celle du pays choisi.',
                ]}
              />
            </TabsContent>

            <TabsContent value="windows">
              <Guide
                steps={[
                  'Ouvrez Paramètres > Réseau et Internet > Proxy.',
                  'Sous « Configuration manuelle du proxy », activez « Utiliser un serveur proxy ».',
                  'Entrez le Host et le Port indiqués ci-dessus, puis enregistrez.',
                  'Au premier site visité, Windows demande le Username et le Password : saisissez-les.',
                  'Pour désactiver, repassez « Utiliser un serveur proxy » sur Désactivé.',
                ]}
              />
            </TabsContent>

            <TabsContent value="mac">
              <Guide
                steps={[
                  'Ouvrez Préférences Système > Réseau.',
                  'Sélectionnez votre connexion (Wi-Fi/Ethernet) puis « Détails… » > « Proxies ».',
                  'Cochez « Proxy web (HTTP) » et « Proxy web sécurisé (HTTPS) ».',
                  'Entrez le Host, le Port, puis le Username et le Password.',
                  'Cliquez sur « OK » puis « Appliquer » : votre navigation passe par le pays choisi.',
                ]}
              />
            </TabsContent>
          </Tabs>
        </section>

        {/* Mon abonnement */}
        <section className="rounded-3xl border border-hairline bg-card/60 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-bold text-foreground">Mon abonnement</h2>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Forfait actuel</p>
              <p className="text-lg font-bold text-foreground">{planLabel}</p>
            </div>
            <Link
              href="/dashboard/plans"
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" />
              Recharger
            </Link>
          </div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Quota consommé</span>
            <span className="font-semibold text-foreground">
              {usedGb.toFixed(1)} / {quotaGb} Go
            </span>
          </div>
          <Progress value={usedPct} className="h-2.5 bg-secondary" />
        </section>
      </div>
    </div>
  )
}

function CredentialField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard indisponible : on ignore silencieusement
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-hairline bg-background px-3 py-2.5">
        <span className={`flex-1 truncate text-sm text-foreground ${secret ? 'font-mono' : ''}`}>
          {value}
        </span>
        <button
          onClick={copy}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={`Copier ${label}`}
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

function Guide({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
            {i + 1}
          </span>
          <div className="flex-1">
            <p className="text-sm text-foreground">{step}</p>
            {/* Emplacement pour une capture d'écran (à intégrer plus tard) */}
            <div className="mt-2 flex h-28 items-center justify-center rounded-xl border border-dashed border-hairline bg-background text-xs text-text-faint">
              Capture d&apos;écran à venir
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
