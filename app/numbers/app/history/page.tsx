'use client'

import { useMemo, useState } from 'react'
import { useNumbers } from '@/components/numbers/numbers-provider'
import {
  countryByCode,
  providerById,
  formatUSD,
  formatDate,
  type OrderStatus,
} from '@/lib/numbers/data'
import { Search, Download, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

const card = 'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl'

const orderStatusStyle: Record<OrderStatus, string> = {
  completed: 'bg-emerald-500/15 text-emerald-400',
  active: 'bg-blue-500/15 text-blue-300',
  refunded: 'bg-amber-500/15 text-amber-400',
  failed: 'bg-red-500/15 text-red-400',
}

type Tab = 'orders' | 'transactions'

export default function HistoryPage() {
  const { orders, transactions } = useNumbers()
  const [tab, setTab] = useState<Tab>('orders')
  const [query, setQuery] = useState('')

  const filteredOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => b.createdAt - a.createdAt)
        .filter((o) =>
          query ? `${o.e164} ${o.numberLabel}`.toLowerCase().includes(query.toLowerCase()) : true,
        ),
    [orders, query],
  )

  const filteredTx = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.createdAt - a.createdAt)
        .filter((t) =>
          query ? `${t.method} ${t.reference} ${t.kind}`.toLowerCase().includes(query.toLowerCase()) : true,
        ),
    [transactions, query],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">History</h1>
          <p className="text-sm text-white/50">Your orders and wallet transactions</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/5">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="flex items-center gap-2">
        {(['orders', 'transactions'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-blue-600 text-white' : 'border border-white/10 text-white/60 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
        <div className="relative ml-auto max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
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
                  <th className="p-4 font-medium">Number</th>
                  <th className="p-4 font-medium">Label</th>
                  <th className="p-4 font-medium">Provider</th>
                  <th className="p-4 font-medium">Amount</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrders.map((o) => {
                  const c = countryByCode(o.countryCode)
                  const p = providerById(o.providerId)
                  return (
                    <tr key={o.id} className="text-white/70">
                      <td className="p-4">
                        <span className="flex items-center gap-2">
                          <span>{c?.flag}</span>
                          <span className="font-mono text-white">{o.e164}</span>
                        </span>
                      </td>
                      <td className="p-4">{o.numberLabel}</td>
                      <td className="p-4">{p?.name}</td>
                      <td className="p-4 text-white">{formatUSD(o.amount)}</td>
                      <td className="p-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${orderStatusStyle[o.status]}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-4 text-right text-white/40">{formatDate(o.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/5 text-xs uppercase tracking-wider text-white/40">
                <tr>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Method</th>
                  <th className="p-4 font-medium">Reference</th>
                  <th className="p-4 font-medium">Amount</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTx.map((t) => {
                  const positive = t.amount >= 0
                  return (
                    <tr key={t.id} className="text-white/70">
                      <td className="p-4">
                        <span className="flex items-center gap-2 capitalize">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                              positive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-300'
                            }`}
                          >
                            {positive ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                          </span>
                          {t.kind}
                        </span>
                      </td>
                      <td className="p-4">{t.method}</td>
                      <td className="p-4 font-mono text-xs text-white/50">{t.reference}</td>
                      <td className={`p-4 font-medium ${positive ? 'text-emerald-400' : 'text-white'}`}>
                        {positive ? '+' : '−'}
                        {formatUSD(Math.abs(t.amount))}
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            t.status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : t.status === 'pending'
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-red-500/15 text-red-400'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="p-4 text-right text-white/40">{formatDate(t.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
