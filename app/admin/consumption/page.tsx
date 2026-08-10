'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Activity,
  ArrowLeft,
  RefreshCw,
  Clock,
  Zap,
  Users,
  Crown,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  KeyRound,
  Database,
  DollarSign,
  Clapperboard,
  Film,
  Languages,
} from 'lucide-react'

type Period = 'today' | 'yesterday' | '7d' | '30d' | 'all'

interface ConsumptionUser {
  userId: string
  email: string | null
  plan: string | null
  sessions: number
  points: number
  seconds: number
  lastActivity: string
}

type ToolName = 'photo_video' | 'motion' | 'translation'

interface ToolBreakdown {
  generations: number
  credits: number
  cost_usd: number
}

interface ToolUser {
  userId: string
  email: string | null
  plan: string | null
  generations: number
  credits: number
  cost_usd: number
  lastUsed: string
  byTool: Partial<Record<ToolName, ToolBreakdown>>
}

interface ToolsData {
  totals: { tool: ToolName; generations: number; credits: number; cost_usd: number }[]
  grandTotalCostUsd: number
  users: ToolUser[]
}

interface ConsumptionData {
  period: Period
  totals: { users: number; sessions: number; points: number; seconds: number }
  users: ConsumptionUser[]
  tools?: ToolsData
}

// Metadonnees d'affichage par outil (libelle + icone + couleur).
const TOOL_META: Record<ToolName, { label: string; Icon: typeof Film; color: string }> = {
  photo_video: { label: 'Studio Photo en Vidéo', Icon: Film, color: 'text-sky-400' },
  motion: { label: 'Motion', Icon: Clapperboard, color: 'text-purple-400' },
  translation: { label: 'Traduction Vidéo', Icon: Languages, color: 'text-emerald-400' },
}
const TOOL_ORDER: ToolName[] = ['photo_video', 'motion', 'translation']

function fmtUsd(n: number): string {
  return `$${(Math.round(n * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface ReconUser {
  email: string | null
  plan: string | null
  issued: number
  used: number
  wasted: number
  wastePct: number
}

interface ReconData {
  configured: boolean
  period: Period
  totals?: { issued: number; used: number; wasted: number; wastePct: number }
  wasted?: { email: string | null; plan: string | null; createdAt: string }[]
  users?: ReconUser[]
}

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: "Aujourd'hui" },
  { id: 'yesterday', label: 'Hier' },
  { id: '7d', label: '7 jours' },
  { id: '30d', label: '30 jours' },
  { id: 'all', label: 'Tout' },
]

function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min ${sec}s`
  return `${sec}s`
}

function fmtRelative(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminConsumptionPage() {
  const [period, setPeriod] = useState<Period>('today')
  const [data, setData] = useState<ConsumptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  // Reconciliation : chiffre releve manuellement dans le dashboard Decart.
  const [decartInput, setDecartInput] = useState('')
  // Reconciliation automatique : tokens Decart emis vs sessions facturees.
  const [recon, setRecon] = useState<ReconData | null>(null)

  const load = useCallback(async (p: Period) => {
    setRefreshing(true)
    try {
      // Consommation + reconciliation automatique en parallele.
      const [consRes, reconRes] = await Promise.all([
        fetch(`/api/admin/consumption?period=${p}`, { cache: 'no-store' }),
        fetch(`/api/admin/reconciliation?period=${p}`, { cache: 'no-store' }),
      ])
      if (!consRes.ok) throw new Error(`HTTP ${consRes.status}`)
      const json = (await consRes.json()) as ConsumptionData
      setData(json)
      if (reconRes.ok) setRecon((await reconRes.json()) as ReconData)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Erreur chargement consommation:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load(period)
  }, [period, load])

  // Protection stricte cote client (l'API verifie aussi cote serveur).
  useEffect(() => {
    const checkAccess = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || user.email !== 'fanny.guck@gmail.com') {
        window.location.href = '/dashboard'
      }
    }
    checkAccess()
  }, [])

  const totals = data?.totals
  const users = data?.users ?? []
  const tools = data?.tools

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin/stats"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux statistiques
        </Link>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00ff88]/15">
              <Activity className="h-6 w-6 text-[#00ff88]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Suivi de consommation</h1>
              <p className="text-sm text-gray-400">
                Points et temps de swap consommes par compte
              </p>
            </div>
          </div>
          <button
            onClick={() => load(period)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-gray-700 bg-[#111] px-4 py-2.5 text-sm font-medium text-gray-200 transition-colors hover:border-gray-500 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Rafraichir
          </button>
        </div>

        {/* Filtres de periode */}
        <div className="mb-6 flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                period === p.id
                  ? 'bg-[#00ff88] text-black'
                  : 'border border-gray-700 bg-[#111] text-gray-300 hover:border-gray-500'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Cartes de totaux */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-800 bg-[#111] p-5">
            <div className="flex items-center gap-2 text-gray-400">
              <Zap className="h-4 w-4 text-[#00ff88]" />
              <span className="text-sm">Points consommes</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-white">
              {(totals?.points ?? 0).toLocaleString('fr-FR')}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-[#111] p-5">
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="h-4 w-4 text-orange-400" />
              <span className="text-sm">Temps total</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-orange-400">
              {fmtDuration(totals?.seconds ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-[#111] p-5">
            <div className="flex items-center gap-2 text-gray-400">
              <Users className="h-4 w-4 text-purple-400" />
              <span className="text-sm">Comptes actifs</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-purple-400">
              {(totals?.users ?? 0).toLocaleString('fr-FR')}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-[#111] p-5">
            <div className="flex items-center gap-2 text-gray-400">
              <Activity className="h-4 w-4 text-sky-400" />
              <span className="text-sm">Sessions</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-sky-400">
              {(totals?.sessions ?? 0).toLocaleString('fr-FR')}
            </p>
          </div>
        </div>

        {/* Reconciliation Decart : points factures (ChapCam) vs usage GPU (Decart) */}
        {(() => {
          const billed = totals?.points ?? 0
          const decart = Number(decartInput.replace(/[^\d]/g, ''))
          const hasInput = decartInput.trim() !== '' && decart > 0 && billed > 0
          const gap = hasInput ? decart - billed : 0
          const ratio = hasInput ? decart / billed : 0
          const gapPct = hasInput ? (gap / billed) * 100 : 0

          // Seuils : Decart > ChapCam est NORMAL (chauffe GPU + HD non factures).
          // - ratio <= 1.7  : ecart faible, tout va bien
          // - 1.7 < ratio <= 2.2 : ecart eleve mais explicable (beaucoup de HD / reconnexions)
          // - ratio > 2.2   : anormal -> a investiguer (fuite, abus, bug de facturation)
          // - ratio < 1     : Decart < facture -> incoherent (tu factures plus que le GPU)
          let level: 'ok' | 'warn' | 'danger' | 'weird' = 'ok'
          if (hasInput) {
            if (ratio < 1) level = 'weird'
            else if (ratio > 2.2) level = 'danger'
            else if (ratio > 1.7) level = 'warn'
            else level = 'ok'
          }

          const styles = {
            ok: { border: 'border-[#00ff88]/40', bg: 'bg-[#00ff88]/10', text: 'text-[#00ff88]', Icon: CheckCircle2 },
            warn: { border: 'border-orange-400/40', bg: 'bg-orange-400/10', text: 'text-orange-300', Icon: AlertTriangle },
            danger: { border: 'border-red-500/50', bg: 'bg-red-500/10', text: 'text-red-400', Icon: ShieldAlert },
            weird: { border: 'border-yellow-400/40', bg: 'bg-yellow-400/10', text: 'text-yellow-300', Icon: AlertTriangle },
          }[level]
          const StatusIcon = styles.Icon

          const verdict = {
            ok: "Ecart normal. La difference s'explique par la chauffe GPU et le HD non factures. Rien d'anormal.",
            warn: "Ecart eleve mais plausible (beaucoup de sessions HD/VIP ou de reconnexions). A surveiller.",
            danger: "Ecart anormalement eleve. A investiguer : sessions HD massives, reconnexions en boucle, ou fuite/abus possible.",
            weird: "Decart facture MOINS que toi : tu factures plus de points que le temps GPU reel. Verifie ta regle de facturation.",
          }[level]

          return (
            <div className="mb-8 rounded-2xl border border-gray-800 bg-[#111] p-5">
              <div className="mb-4 flex items-center gap-2">
                <Scale className="h-5 w-5 text-[#00ff88]" />
                <h2 className="font-semibold text-white">Reconciliation avec Decart</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
                {/* Facture ChapCam (auto) */}
                <div className="rounded-xl border border-gray-800 bg-[#0a0a0a] p-4">
                  <p className="text-xs text-gray-500">Points factures (ChapCam)</p>
                  <p className="mt-1 text-2xl font-bold text-[#00ff88]">
                    {billed.toLocaleString('fr-FR')}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {PERIODS.find((p) => p.id === period)?.label} - temps utile facture
                  </p>
                </div>

                {/* Saisie Decart */}
                <div className="rounded-xl border border-gray-800 bg-[#0a0a0a] p-4">
                  <label htmlFor="decart" className="text-xs text-gray-500">
                    Usage releve sur Decart
                  </label>
                  <input
                    id="decart"
                    type="text"
                    inputMode="numeric"
                    value={decartInput}
                    onChange={(e) => setDecartInput(e.target.value)}
                    placeholder="ex: 29694"
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-[#111] px-3 py-2 text-2xl font-bold text-white outline-none focus:border-[#00ff88]"
                  />
                  <p className="mt-1 text-xs text-gray-600">a saisir manuellement (dashboard Decart)</p>
                </div>
              </div>

              {hasInput && (
                <div className={`mt-4 rounded-xl border ${styles.border} ${styles.bg} p-4`}>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div className={`flex items-center gap-2 font-semibold ${styles.text}`}>
                      <StatusIcon className="h-5 w-5" />
                      Ratio Decart / facture : {ratio.toFixed(2)}x
                    </div>
                    <div className="text-sm text-gray-300">
                      Ecart : <span className="font-semibold">+{gap.toLocaleString('fr-FR')}</span> pts
                      ({gapPct >= 0 ? '+' : ''}
                      {gapPct.toFixed(0)}%)
                    </div>
                  </div>
                  <p className={`mt-2 text-sm ${styles.text}`}>{verdict}</p>
                </div>
              )}
              {!hasInput && (
                <p className="mt-4 text-sm text-gray-500">
                  Saisis le chiffre affiche par Decart pour comparer automatiquement et detecter
                  tout ecart anormal.
                </p>
              )}
            </div>
          )
        })()}

        {/* Reconciliation automatique : tokens Decart emis vs sessions facturees */}
        {(() => {
          if (!recon) return null

          // Table de logs pas encore creee : guider vers le script SQL.
          if (!recon.configured) {
            return (
              <div className="mb-8 rounded-2xl border border-gray-800 bg-[#111] p-5">
                <div className="mb-3 flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-[#00ff88]" />
                  <h2 className="font-semibold text-white">Reconciliation automatique des tokens</h2>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-4">
                  <Database className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />
                  <div className="text-sm text-yellow-200">
                    <p className="font-semibold">Journal des tokens non active.</p>
                    <p className="mt-1 text-yellow-200/80">
                      Execute le script{' '}
                      <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs">
                        scripts/decart-token-logs.sql
                      </code>{' '}
                      dans le SQL Editor de Supabase pour enregistrer chaque token Decart emis et
                      activer la detection automatique de gaspillage.
                    </p>
                  </div>
                </div>
              </div>
            )
          }

          const t = recon.totals!
          const pct = t.wastePct
          // Seuils de gaspillage (tokens emis sans session facturee) :
          // <= 15% normal (annulations avant stream), 15-35% a surveiller, > 35% anormal.
          let level: 'ok' | 'warn' | 'danger' = 'ok'
          if (pct > 35) level = 'danger'
          else if (pct > 15) level = 'warn'

          const styles = {
            ok: { border: 'border-[#00ff88]/40', bg: 'bg-[#00ff88]/10', text: 'text-[#00ff88]', Icon: CheckCircle2 },
            warn: { border: 'border-orange-400/40', bg: 'bg-orange-400/10', text: 'text-orange-300', Icon: AlertTriangle },
            danger: { border: 'border-red-500/50', bg: 'bg-red-500/10', text: 'text-red-400', Icon: ShieldAlert },
          }[level]
          const StatusIcon = styles.Icon
          const verdict = {
            ok: "Gaspillage faible. La plupart des tokens emis donnent lieu a une session facturee. Aucune fuite detectee.",
            warn: "Gaspillage moyen. Beaucoup de tokens emis sans session derriere (annulations ou reconnexions). A surveiller.",
            danger: "Gaspillage eleve : de nombreux tokens sont emis sans session facturee. A investiguer (abus, script, ou fuite de tokens).",
          }[level]

          return (
            <div className="mb-8 rounded-2xl border border-gray-800 bg-[#111] p-5">
              <div className="mb-4 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-[#00ff88]" />
                <h2 className="font-semibold text-white">Reconciliation automatique des tokens</h2>
                <span className="text-xs text-gray-500">tokens Decart emis vs sessions facturees</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-gray-800 bg-[#0a0a0a] p-4">
                  <p className="text-xs text-gray-500">Tokens emis</p>
                  <p className="mt-1 text-2xl font-bold text-white">{t.issued.toLocaleString('fr-FR')}</p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-[#0a0a0a] p-4">
                  <p className="text-xs text-gray-500">Avec session facturee</p>
                  <p className="mt-1 text-2xl font-bold text-[#00ff88]">{t.used.toLocaleString('fr-FR')}</p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-[#0a0a0a] p-4">
                  <p className="text-xs text-gray-500">Sans session (gaspilles)</p>
                  <p className={`mt-1 text-2xl font-bold ${t.wasted > 0 ? styles.text : 'text-[#00ff88]'}`}>
                    {t.wasted.toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>

              {t.issued > 0 && (
                <div className={`mt-4 rounded-xl border ${styles.border} ${styles.bg} p-4`}>
                  <div className={`flex items-center gap-2 font-semibold ${styles.text}`}>
                    <StatusIcon className="h-5 w-5" />
                    Taux de gaspillage : {pct.toFixed(0)}%
                  </div>
                  <p className={`mt-2 text-sm ${styles.text}`}>{verdict}</p>
                </div>
              )}
              {t.issued === 0 && (
                <p className="mt-4 text-sm text-gray-500">
                  Aucun token emis sur cette periode.
                </p>
              )}

              {/* Comptes avec le plus de tokens gaspilles */}
              {recon.users && recon.users.filter((u) => u.wasted > 0).length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium text-gray-400">
                    Comptes a surveiller (tokens sans session)
                  </p>
                  <div className="space-y-1.5">
                    {recon.users
                      .filter((u) => u.wasted > 0)
                      .slice(0, 8)
                      .map((u, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0a0a0a] px-3 py-2 text-sm"
                        >
                          <span className="truncate text-gray-200">{u.email || 'Inconnu'}</span>
                          <span className="ml-3 shrink-0 text-gray-400">
                            <span className={u.wastePct > 50 ? 'font-semibold text-red-400' : ''}>
                              {u.wasted}
                            </span>
                            <span className="text-gray-600"> / {u.issued} tokens</span>
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* Tableau des consommateurs */}
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#111]">
          <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
            <h2 className="font-semibold text-white">
              Classement des comptes
              <span className="ml-2 text-sm font-normal text-gray-500">
                (top {users.length})
              </span>
            </h2>
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                MAJ {lastUpdated.toLocaleTimeString('fr-FR')}
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-400">Chargement...</div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              Aucune consommation sur cette periode.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="px-5 py-3 font-medium">#</th>
                    <th className="px-5 py-3 font-medium">Compte</th>
                    <th className="px-5 py-3 font-medium">Forfait</th>
                    <th className="px-5 py-3 text-right font-medium">Points</th>
                    <th className="px-5 py-3 text-right font-medium">Temps</th>
                    <th className="px-5 py-3 text-right font-medium">Sessions</th>
                    <th className="px-5 py-3 text-right font-medium">Derniere activite</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr
                      key={u.userId}
                      className="border-b border-gray-800/60 transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3">
                        {i < 3 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#00ff88]">
                            <Crown className="h-3.5 w-3.5" />
                            {i + 1}
                          </span>
                        ) : (
                          <span className="text-gray-500">{i + 1}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="block font-medium text-white">
                          {u.email || 'Email inconnu'}
                        </span>
                        <span className="block font-mono text-xs text-gray-600">
                          {u.userId.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs capitalize text-gray-300">
                          {u.plan || 'free'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-[#00ff88]">
                        {u.points.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-5 py-3 text-right text-orange-300">
                        {fmtDuration(u.seconds)}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-300">{u.sessions}</td>
                      <td className="px-5 py-3 text-right text-gray-500">
                        {fmtRelative(u.lastActivity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ============ Outils IA : Photo en Video / Motion / Traduction ============ */}
        <div className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-[#00ff88]" />
            <h2 className="text-lg font-semibold text-white">Outils IA</h2>
            <span className="text-xs text-gray-500">
              Studio Photo en Vidéo, Motion et Traduction — consommation par compte
            </span>
          </div>

          {/* Cartes de totaux par outil + coût fournisseur estimé */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#00ff88]/30 bg-[#00ff88]/5 p-5">
              <div className="flex items-center gap-2 text-gray-400">
                <DollarSign className="h-4 w-4 text-[#00ff88]" />
                <span className="text-sm">Coût fournisseur (estimé)</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-[#00ff88]">
                {fmtUsd(tools?.grandTotalCostUsd ?? 0)}
              </p>
              <p className="mt-1 text-xs text-gray-600">HeyGen + fal.ai, hors Live Swap</p>
            </div>
            {TOOL_ORDER.map((t) => {
              const meta = TOOL_META[t]
              const row = tools?.totals.find((x) => x.tool === t)
              const ToolIcon = meta.Icon
              return (
                <div key={t} className="rounded-2xl border border-gray-800 bg-[#111] p-5">
                  <div className="flex items-center gap-2 text-gray-400">
                    <ToolIcon className={`h-4 w-4 ${meta.color}`} />
                    <span className="text-sm">{meta.label}</span>
                  </div>
                  <p className={`mt-2 text-3xl font-bold ${meta.color}`}>
                    {(row?.generations ?? 0).toLocaleString('fr-FR')}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {(row?.credits ?? 0).toLocaleString('fr-FR')} crédits · {fmtUsd(row?.cost_usd ?? 0)}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Tableau par compte */}
          <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#111]">
            <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
              <h3 className="font-semibold text-white">
                Consommation par compte
                <span className="ml-2 text-sm font-normal text-gray-500">
                  (top {tools?.users.length ?? 0})
                </span>
              </h3>
            </div>

            {loading ? (
              <div className="p-10 text-center text-gray-400">Chargement...</div>
            ) : !tools || tools.users.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                Aucune génération d&apos;outil sur cette période.
                <span className="mt-1 block text-xs text-gray-600">
                  Le suivi démarre à partir de son activation (les générations passées restent sur HeyGen/fal).
                </span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="px-5 py-3 font-medium">#</th>
                      <th className="px-5 py-3 font-medium">Compte</th>
                      <th className="px-5 py-3 font-medium">Forfait</th>
                      <th className="px-5 py-3 text-right font-medium">Photo</th>
                      <th className="px-5 py-3 text-right font-medium">Motion</th>
                      <th className="px-5 py-3 text-right font-medium">Traduction</th>
                      <th className="px-5 py-3 text-right font-medium">Crédits</th>
                      <th className="px-5 py-3 text-right font-medium">Coût estimé</th>
                      <th className="px-5 py-3 text-right font-medium">Dernière activité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tools.users.map((u, i) => (
                      <tr
                        key={u.userId}
                        className="border-b border-gray-800/60 transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-3">
                          {i < 3 ? (
                            <span className="inline-flex items-center gap-1 font-bold text-[#00ff88]">
                              <Crown className="h-3.5 w-3.5" />
                              {i + 1}
                            </span>
                          ) : (
                            <span className="text-gray-500">{i + 1}</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className="block font-medium text-white">
                            {u.email || 'Email inconnu'}
                          </span>
                          <span className="block font-mono text-xs text-gray-600">
                            {u.userId.slice(0, 8)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs capitalize text-gray-300">
                            {u.plan || 'free'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-sky-300">
                          {u.byTool.photo_video?.generations ?? 0}
                        </td>
                        <td className="px-5 py-3 text-right text-purple-300">
                          {u.byTool.motion?.generations ?? 0}
                        </td>
                        <td className="px-5 py-3 text-right text-emerald-300">
                          {u.byTool.translation?.generations ?? 0}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-300">
                          {u.credits.toLocaleString('fr-FR')}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-[#00ff88]">
                          {fmtUsd(u.cost_usd)}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-500">
                          {fmtRelative(u.lastUsed)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-gray-600">
            Les coûts sont des estimations basées sur les tarifs fournisseur (ajustables dans
            <code className="mx-1 rounded bg-black/40 px-1.5 py-0.5 font-mono">lib/tool-costs.ts</code>)
            et servent au rapprochement de facture, pas à la facturation des utilisateurs.
          </p>
        </div>
      </div>
    </div>
  )
}
