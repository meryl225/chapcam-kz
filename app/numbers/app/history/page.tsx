'use client'

import { useMemo, useState } from 'react'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { countryByCode, serviceBySlug } from '@/lib/numbers/catalog'
import { formatXOF, type Activation } from '@/lib/numbers/types'
import { Search, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

const card = 'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl'

const orderStatusStyle: Record<Activation['status'], string> = {
  received: 'bg-emerald-500/15 text-emerald-400',
  waiting: 'bg-blue-500/15 text-blue-300',
  cancelled: 'bg-amber-500/15 text-amber-400',
  expired: 'bg-red-500/15 text-red-400',
}

const ORDER_STATUS_FR: Record<Activation['status'], string> = {
  received: 'Code reçu',
  waiting: 'En attente',
  cancelled: 'Annulée',
  expired: 'Expirée',
}

const TX_KIND_FR: Record<string, string> = {
  deposit: 'Dépôt',
  purchase: 'Achat',
  refund: 'Remboursement',
}

const TX_STATUS_FR: Record<string, string> = {
  completed: 'Terminée',
  pending: 'En attente',
  failed: 'Échouée',
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric' })
}

type Tab = 'orders' | 'transactions'

export default function HistoryPage() {
  const { activations, transactions, isAdmin } = useNumbers()
  const [tab, setTab] = useState<Tab>('orders')
  const [query, setQuery] = useState('')

  const filteredOrders = useMemo(
    () =>
      [...activations]
        .sort((a, b) => b.createdAt - a.createdAt)
        .filter((o) =>
          query ? `${o.phone} ${o.serviceLabel}`.toLowerCase().includes(query.toLowerCase()) : true,
        ),
    [activations, query],
  )

  const filteredTx = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.createdAt - a.createdAt)
        .filter((t) =>
          query ? `${t.method} ${t.reference ?? ''} ${t.kind}`.toLowerCase().includes(query.toLowerCase()) : true,
        ),
    [transactions, query],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Historique</h1>
          <p className="text-sm text-white/50">Vos activations et transactions du portefeuille</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(['orders', 'transactions'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? 'bg-blue-600 text-white' : 'border border-white/10 text-white/60 hover:text-white'
            }`}
          >
            {t === 'orders' ? 'Activations' : 'Transactions'}
          </button>
        ))}
        <div className="relative ml-auto max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher..."
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          {tab === 'orders' ? (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/5 text-xs uppercase tracking-wider text-white/40">
                <tr>
                  <th className="p-4 font-medium">Numéro</th>
                  <th className="p-4 font-medium">Service</th>
                  {isAdmin && <th className="p-4 font-medium">Fournisseur</th>}
                  <th className="p-4 font-medium">Montant</th>
                  <th className="p-4 font-medium">Statut</th>
                  <th className="p-4 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrders.map((o) => {
                  const c = countryByCode(o.countryCode)
                  const svc = serviceBySlug(o.serviceSlug)
                  return (
                    <tr key={o.id} className="text-white/70">
                      <td className="p-4">
                        <span className="flex items-center gap-2">
                          <span>{c?.flag}</span>
                          <span className="font-mono text-white">{o.phone}</span>
                        </span>
                      </td>
                      <td className="p-4">{svc?.label ?? o.serviceLabel}</td>
                      {isAdmin && <td className="p-4 capitalize">{o.provider}</td>}
                      <td className="p-4 text-white">{formatXOF(o.priceXof)}</td>
                      <td className="p-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${orderStatusStyle[o.status]}`}>
                          {ORDER_STATUS_FR[o.status]}
                        </span>
                      </td>
                      <td className="p-4 text-right text-white/40">{fmtDate(o.createdAt)}</td>
                    </tr>
                  )
                })}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="p-10 text-center text-white/40">
                      Aucune activation pour le moment
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/5 text-xs uppercase tracking-wider text-white/40">
                <tr>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Moyen</th>
                  {isAdmin && <th className="p-4 font-medium">Référence</th>}
                  <th className="p-4 font-medium">Montant</th>
                  <th className="p-4 font-medium">Statut</th>
                  <th className="p-4 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTx.map((t) => {
                  const positive = t.kind !== 'purchase'
                  return (
                    <tr key={t.id} className="text-white/70">
                      <td className="p-4">
                        <span className="flex items-center gap-2">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                              positive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-300'
                            }`}
                          >
                            {positive ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                          </span>
                          {TX_KIND_FR[t.kind] ?? t.kind}
                        </span>
                      </td>
                      <td className="p-4">{t.method}</td>
                      {isAdmin && <td className="p-4 font-mono text-xs text-white/50">{t.reference}</td>}
                      <td className={`p-4 font-medium ${positive ? 'text-emerald-400' : 'text-white'}`}>
                        {positive ? '+' : '−'}
                        {formatXOF(Math.abs(t.amountXof))}
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            t.status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : t.status === 'pending'
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-red-500/15 text-red-400'
                          }`}
                        >
                          {TX_STATUS_FR[t.status] ?? t.status}
                        </span>
                      </td>
                      <td className="p-4 text-right text-white/40">{fmtDate(t.createdAt)}</td>
                    </tr>
                  )
                })}
                {filteredTx.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="p-10 text-center text-white/40">
                      Aucune transaction pour le moment
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
