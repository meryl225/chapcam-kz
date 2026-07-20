'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Monitor,
  RefreshCw,
  Search,
  Loader2,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Ban,
  RotateCcw,
  ShieldCheck,
  Copy,
  Check,
  Send,
  Mail,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'

interface License {
  id: string
  email: string
  licenseKey: string
  activated: boolean
  status: string
  activatedAt: string | null
  createdAt: string | null
}

interface Stats {
  total: number
  active: number
  revoked: number
  activated: number
  suspectedSharing?: number
}

export default function AdminLicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [resending, setResending] = useState(false)
  const [resettingAll, setResettingAll] = useState(false)
  const [sendEmail, setSendEmail] = useState('')
  const [sendingOne, setSendingOne] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/licenses', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erreur de chargement.')
        return
      }
      setLicenses(data.licenses || [])
      setStats(data.stats || null)
    } catch {
      setError('Erreur de connexion.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const showToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const act = async (id: string, action: 'revoke' | 'reactivate' | 'reset') => {
    // Confirmation pour les actions sensibles (transfert de PC / revocation).
    if (action === 'reset' && !window.confirm(
      'Detacher cette licence de son PC actuel ?\nLe client pourra ensuite l\'activer sur un nouvel ordinateur.',
    )) {
      return
    }
    if (action === 'revoke' && !window.confirm(
      'Revoquer cette licence ? Le logiciel cessera de fonctionner pour ce client.',
    )) {
      return
    }
    setBusyId(id)
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('ok', 'Licence mise a jour.')
        await load()
      } else {
        showToast('err', data.error || 'Erreur.')
      }
    } catch {
      showToast('err', 'Erreur de connexion.')
    } finally {
      setBusyId(null)
    }
  }

  const resendDownload = async () => {
    const count = stats?.active ?? licenses.filter((l) => l.status === 'active').length
    if (
      !window.confirm(
        `Renvoyer la cle de licence + le nouveau lien de telechargement a ${count} client(s) avec licence active ?`,
      )
    ) {
      return
    }
    setResending(true)
    try {
      const res = await fetch('/api/admin/licenses/resend-download', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        showToast('ok', data.message || 'Emails envoyes.')
      } else {
        showToast('err', data.error || "Erreur lors de l'envoi.")
      }
    } catch {
      showToast('err', 'Erreur de connexion.')
    } finally {
      setResending(false)
    }
  }

  const resetAll = async () => {
    const count = stats?.activated ?? licenses.filter((l) => l.activated).length
    if (
      !window.confirm(
        `Detacher TOUTES les licences de leur PC (${count} activee(s)) ?\n\nChaque client pourra ensuite reactiver sa cle sur son ordinateur. Les licences revoquees ne sont pas touchees.`,
      )
    ) {
      return
    }
    setResettingAll(true)
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-all' }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('ok', `${data.detached ?? 0} licence(s) detachee(s).`)
        await load()
      } else {
        showToast('err', data.error || 'Erreur.')
      }
    } catch {
      showToast('err', 'Erreur de connexion.')
    } finally {
      setResettingAll(false)
    }
  }

  const sendOne = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = sendEmail.trim()
    if (!email) return
    setSendingOne(true)
    try {
      const res = await fetch('/api/admin/licenses/send-one', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('ok', data.message || 'Email envoye.')
        setSendEmail('')
        await load()
      } else {
        showToast('err', data.error || "Erreur lors de l'envoi.")
      }
    } catch {
      showToast('err', 'Erreur de connexion.')
    } finally {
      setSendingOne(false)
    }
  }

  const copyKey = async (id: string, key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      showToast('err', 'Copie impossible.')
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return licenses
    return licenses.filter(
      (l) => l.email?.toLowerCase().includes(q) || l.licenseKey?.toLowerCase().includes(q),
    )
  }, [licenses, search])

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/payments"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux paiements
        </Link>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00ff88]/15">
              <Monitor className="h-6 w-6 text-[#00ff88]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Licences ChapCam PC</h1>
              <p className="text-sm text-gray-400">
                Gerez les cles du logiciel desktop (achat unique a vie).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={resendDownload}
              disabled={resending || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00ff88] px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#00dd77] disabled:opacity-60"
              title="Renvoie a chaque client actif sa cle + le nouveau lien de telechargement"
            >
              {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {resending ? 'Envoi en cours...' : 'Renvoyer le lien a tous'}
            </button>
            <button
              onClick={resetAll}
              disabled={resettingAll || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-60"
              title="Detache toutes les licences de leur PC pour que chaque client puisse reactiver sa cle"
            >
              {resettingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              {resettingAll ? 'Detachement...' : 'Detacher tous les PC'}
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-[#111] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-[#00ff88] disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatCard icon={<KeyRound className="h-5 w-5" />} label="Total" value={stats.total} />
            <StatCard icon={<ShieldCheck className="h-5 w-5" />} label="Actives" value={stats.active} accent />
            <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Activees PC" value={stats.activated} />
            <StatCard
              icon={<AlertTriangle className="h-5 w-5" />}
              label="Partage suspecte"
              value={stats.suspectedSharing ?? 0}
              danger
            />
            <StatCard icon={<Ban className="h-5 w-5" />} label="Revoquees" value={stats.revoked} />
          </div>
        )}

        <form
          onSubmit={sendOne}
          className="mb-4 rounded-2xl border border-[#00d4ff]/30 bg-[#0a1722] p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#00d4ff]" />
            <h2 className="text-sm font-semibold text-white">
              Envoi manuel - email ChapCam PC (cle + liens Windows et MacBook)
            </h2>
          </div>
          <p className="mb-3 text-xs text-gray-400">
            Envoie a un client l&apos;email officiel ChapCam PC (50 000 FCFA) avec sa cle de licence
            et les liens de telechargement Windows ET MacBook. Si une licence active existe deja
            pour cet email, elle est reutilisee ; sinon une nouvelle cle est generee.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              value={sendEmail}
              onChange={(e) => setSendEmail(e.target.value)}
              placeholder="client@exemple.com"
              className="flex-1 rounded-xl border border-gray-700 bg-[#0a0a0a] px-4 py-3 text-white outline-none transition-colors focus:border-[#00d4ff]"
            />
            <button
              type="submit"
              disabled={sendingOne}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00d4ff] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#00bfe6] disabled:opacity-60"
            >
              {sendingOne ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sendingOne ? 'Envoi...' : 'Envoyer l\'email'}
            </button>
          </div>
        </form>

        <div className="mb-4 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par email ou cle..."
            className="w-full rounded-xl border border-gray-700 bg-[#0a0a0a] py-3 pl-10 pr-4 text-white outline-none transition-colors focus:border-[#00ff88]"
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-sm text-amber-300">
            {error}
            <p className="mt-2 text-amber-400/70">
              Verifiez que la table <code className="font-mono">pc_licenses</code> existe (script{' '}
              <code className="font-mono">supabase-pc-licenses.sql</code>).
            </p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-gray-800 bg-[#111] py-16 text-gray-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-[#111] py-16 text-center text-gray-400">
            Aucune licence pour le moment.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#111]">
            <div className="divide-y divide-gray-800">
              {filtered.map((l) => (
                <div key={l.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-mono text-sm font-semibold text-[#00ff88]">
                        {l.licenseKey}
                      </span>
                      <button
                        onClick={() => copyKey(l.id, l.licenseKey)}
                        className="text-gray-500 transition-colors hover:text-white"
                        title="Copier la cle"
                      >
                        {copiedId === l.id ? (
                          <Check className="h-3.5 w-3.5 text-[#00ff88]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-gray-300">{l.email}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Cree le {fmtDate(l.createdAt)}
                      {l.activated ? ` · Active le ${fmtDate(l.activatedAt)}` : ' · Pas encore activee'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        l.status === 'revoked'
                          ? 'bg-red-500/15 text-red-400'
                          : l.status === 'suspected_sharing'
                            ? 'bg-orange-500/15 text-orange-400'
                            : l.activated
                              ? 'bg-[#00ff88]/15 text-[#00ff88]'
                              : 'bg-gray-700/40 text-gray-300'
                      }`}
                    >
                      {l.status === 'revoked'
                        ? 'Revoquee'
                        : l.status === 'suspected_sharing'
                          ? 'Partage suspecte'
                          : l.activated
                            ? 'Activee'
                            : 'Active'}
                    </span>

                    {l.status === 'revoked' || l.status === 'suspected_sharing' ? (
                      <ActionBtn
                        onClick={() => act(l.id, 'reactivate')}
                        busy={busyId === l.id}
                        icon={<RotateCcw className="h-3.5 w-3.5" />}
                        label="Reactiver"
                      />
                    ) : (
                      <>
                        {l.activated && (
                          <ActionBtn
                            onClick={() => act(l.id, 'reset')}
                            busy={busyId === l.id}
                            icon={<RefreshCw className="h-3.5 w-3.5" />}
                            label="Changer de PC"
                          />
                        )}
                        <ActionBtn
                          onClick={() => act(l.id, 'revoke')}
                          busy={busyId === l.id}
                          icon={<Ban className="h-3.5 w-3.5" />}
                          label="Revoquer"
                          danger
                        />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border px-5 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'ok'
              ? 'border-[#00ff88]/40 bg-[#0a1f15] text-[#00ff88]'
              : 'border-red-500/40 bg-[#1f0a0a] text-red-400'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  accent,
  danger,
}: {
  icon: React.ReactNode
  label: string
  value: number
  accent?: boolean
  danger?: boolean
}) {
  const iconColor = danger ? 'text-orange-400' : accent ? 'text-[#00ff88]' : 'text-gray-400'
  return (
    <div
      className={`rounded-2xl border bg-[#111] p-4 ${
        danger && value > 0 ? 'border-orange-500/40' : 'border-gray-800'
      }`}
    >
      <div className={`mb-2 ${iconColor}`}>{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function ActionBtn({
  onClick,
  busy,
  icon,
  label,
  danger,
}: {
  onClick: () => void
  busy: boolean
  icon: React.ReactNode
  label: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        danger
          ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
          : 'border-gray-700 text-gray-300 hover:border-[#00ff88] hover:text-white'
      }`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </button>
  )
}
