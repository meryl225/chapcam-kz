import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAIL } from '@/lib/admin-auth'
import { adminStats, adminRecentActivations, adminRecentTransactions } from '@/lib/numbers/db'
import { formatXOF } from '@/lib/numbers/types'
import { Users, Wallet, ArrowDownLeft, ArrowUpRight, SignalHigh, ShieldAlert } from 'lucide-react'

export const dynamic = 'force-dynamic'

const card = 'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl'

const STATUS_FR: Record<string, string> = {
  waiting: 'En attente',
  received: 'Reçu',
  cancelled: 'Annulé',
  expired: 'Expiré',
}

const STATUS_COLOR: Record<string, string> = {
  waiting: 'bg-amber-500/15 text-amber-300',
  received: 'bg-emerald-500/15 text-emerald-300',
  cancelled: 'bg-white/10 text-white/50',
  expired: 'bg-rose-500/15 text-rose-300',
}

const TX_KIND_FR: Record<string, string> = {
  deposit: 'Dépôt',
  purchase: 'Achat',
  refund: 'Remboursement',
}

function shortId(id: string | null) {
  if (!id) return '—'
  return id.length > 10 ? `${id.slice(0, 8)}…` : id
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function NumbersAdminPage() {
  // Double protection : seul l'admin (fanny.guck@gmail.com) accède à cette page.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    redirect('/numbers/app')
  }

  const [stats, activations, transactions] = await Promise.all([
    adminStats(),
    adminRecentActivations(60),
    adminRecentTransactions(60),
  ])

  const statCards = [
    { label: 'Utilisateurs', value: String(stats.users), icon: Users, tone: 'text-blue-300 bg-blue-500/15' },
    { label: 'Solde total en circulation', value: formatXOF(stats.totalBalanceXof), icon: Wallet, tone: 'text-teal-300 bg-teal-500/15' },
    { label: 'Total rechargé', value: formatXOF(stats.depositsXof), icon: ArrowDownLeft, tone: 'text-emerald-300 bg-emerald-500/15' },
    { label: 'Total dépensé (achats)', value: formatXOF(stats.spendXof), icon: ArrowUpRight, tone: 'text-amber-300 bg-amber-500/15' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300">
          <ShieldAlert className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-white">Administration</h1>
          <p className="text-sm text-white/50">
            Vue d&apos;ensemble de ChapCam Numbers — réservé à {ADMIN_EMAIL}
          </p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className={`${card} p-5`}>
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.tone}`}>
              <s.icon className="h-5 w-5" />
            </span>
            <p className="mt-4 text-2xl font-semibold text-white">{s.value}</p>
            <p className="text-sm text-white/50">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`${card} p-5`}>
          <p className="text-2xl font-semibold text-white">{stats.activationsTotal}</p>
          <p className="text-sm text-white/50">Numéros achetés (total)</p>
        </div>
        <div className={`${card} p-5`}>
          <p className="text-2xl font-semibold text-emerald-300">{stats.activationsReceived}</p>
          <p className="text-sm text-white/50">SMS reçus</p>
        </div>
        <div className={`${card} p-5`}>
          <p className="text-2xl font-semibold text-white">{formatXOF(stats.refundsXof)}</p>
          <p className="text-sm text-white/50">Total remboursé</p>
        </div>
      </div>

      {/* Activations récentes */}
      <div className={`${card} overflow-hidden`}>
        <div className="flex items-center gap-2 border-b border-white/5 p-5">
          <SignalHigh className="h-4 w-4 text-blue-300" />
          <h2 className="font-semibold text-white">Activations récentes</h2>
        </div>
        {activations.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/50">Aucune activation.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-white/40">
                <tr className="border-b border-white/5">
                  <th className="p-4 font-medium">Service</th>
                  <th className="p-4 font-medium">Numéro</th>
                  <th className="hidden p-4 font-medium md:table-cell">Fournisseur</th>
                  <th className="hidden p-4 font-medium lg:table-cell">Utilisateur</th>
                  <th className="p-4 font-medium">Prix</th>
                  <th className="p-4 font-medium">Statut</th>
                  <th className="hidden p-4 font-medium sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/70">
                {activations.map((a) => (
                  <tr key={a.id}>
                    <td className="p-4 text-white">{a.service_label}</td>
                    <td className="p-4 font-mono text-xs">{a.phone_e164}</td>
                    <td className="hidden p-4 md:table-cell">{a.provider}</td>
                    <td className="hidden p-4 font-mono text-xs text-white/40 lg:table-cell">{shortId(a.user_id)}</td>
                    <td className="p-4">{formatXOF(Number(a.price_xof))}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[a.status] ?? 'bg-white/10 text-white/50'}`}>
                        {STATUS_FR[a.status] ?? a.status}
                      </span>
                    </td>
                    <td className="hidden p-4 text-xs text-white/40 sm:table-cell">{fmtDate(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transactions récentes */}
      <div className={`${card} overflow-hidden`}>
        <div className="flex items-center gap-2 border-b border-white/5 p-5">
          <Wallet className="h-4 w-4 text-blue-300" />
          <h2 className="font-semibold text-white">Transactions récentes</h2>
        </div>
        {transactions.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/50">Aucune transaction.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-white/40">
                <tr className="border-b border-white/5">
                  <th className="p-4 font-medium">Type</th>
                  <th className="hidden p-4 font-medium lg:table-cell">Utilisateur</th>
                  <th className="p-4 font-medium">Méthode</th>
                  <th className="hidden p-4 font-medium sm:table-cell">Référence</th>
                  <th className="p-4 font-medium">Montant</th>
                  <th className="hidden p-4 font-medium sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/70">
                {transactions.map((t) => {
                  const positive = t.kind !== 'purchase'
                  return (
                    <tr key={t.id}>
                      <td className="p-4 text-white">{TX_KIND_FR[t.kind] ?? t.kind}</td>
                      <td className="hidden p-4 font-mono text-xs text-white/40 lg:table-cell">{shortId(t.user_id)}</td>
                      <td className="p-4">{t.method}</td>
                      <td className="hidden p-4 font-mono text-xs text-white/40 sm:table-cell">{t.reference ?? '—'}</td>
                      <td className={`p-4 font-medium ${positive ? 'text-emerald-300' : 'text-white'}`}>
                        {positive ? '+' : '−'}
                        {formatXOF(Math.abs(Number(t.amount_xof)))}
                      </td>
                      <td className="hidden p-4 text-xs text-white/40 sm:table-cell">{fmtDate(t.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
