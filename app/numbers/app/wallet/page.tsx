'use client'

import { useState } from 'react'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { FUNDING_METHODS, formatUSD, formatDate } from '@/lib/numbers/data'
import { Wallet, Plus, X, Check, ArrowDownLeft, ArrowUpRight, Smartphone, CreditCard, Coins } from 'lucide-react'

const card = 'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl'

const kindIcon: Record<string, typeof Smartphone> = {
  'Mobile Money': Smartphone,
  Card: CreditCard,
  Crypto: Coins,
}

const QUICK = [10, 25, 50, 100]

export default function WalletPage() {
  const { balance, transactions, deposit } = useNumbers()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(25)
  const [method, setMethod] = useState(FUNDING_METHODS[0].name)

  const deposits = transactions.filter((t) => t.kind === 'deposit').reduce((s, t) => s + t.amount, 0)
  const spend = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)

  function confirm() {
    if (amount <= 0) return
    deposit(amount, method)
    setOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Wallet</h1>
          <p className="text-sm text-white/50">Fund your account and review transactions</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" /> Add funds
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-600/20 to-blue-500/5 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
            <Wallet className="h-5 w-5" />
          </span>
          <p className="mt-4 text-3xl font-semibold text-white">{formatUSD(balance)}</p>
          <p className="text-sm text-white/50">Available balance</p>
        </div>
        <div className={`${card} p-5`}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <ArrowDownLeft className="h-5 w-5" />
          </span>
          <p className="mt-4 text-2xl font-semibold text-white">{formatUSD(deposits)}</p>
          <p className="text-sm text-white/50">Total deposited</p>
        </div>
        <div className={`${card} p-5`}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/70">
            <ArrowUpRight className="h-5 w-5" />
          </span>
          <p className="mt-4 text-2xl font-semibold text-white">{formatUSD(spend)}</p>
          <p className="text-sm text-white/50">Total spent</p>
        </div>
      </div>

      {/* Funding methods */}
      <div className={`${card} p-5`}>
        <h2 className="mb-4 font-semibold text-white">Supported funding methods</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FUNDING_METHODS.map((m) => {
            const Icon = kindIcon[m.kind] ?? CreditCard
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ background: `hsl(${m.hue} 70% 50% / 0.15)`, color: `hsl(${m.hue} 80% 65%)` }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{m.name}</p>
                  <p className="text-xs text-white/40">{m.kind}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Transactions */}
      <div className={`${card} overflow-hidden`}>
        <div className="border-b border-white/5 p-5">
          <h2 className="font-semibold text-white">Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-white/5">
              {[...transactions]
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((t) => {
                  const positive = t.amount >= 0
                  return (
                    <tr key={t.id} className="text-white/70">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                              positive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-300'
                            }`}
                          >
                            {positive ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                          </span>
                          <div>
                            <p className="capitalize text-white">{t.kind}</p>
                            <p className="text-xs text-white/40">{t.method}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden p-4 font-mono text-xs text-white/40 sm:table-cell">{t.reference}</td>
                      <td className="p-4 text-right">
                        <p className={`font-medium ${positive ? 'text-emerald-400' : 'text-white'}`}>
                          {positive ? '+' : '−'}
                          {formatUSD(Math.abs(t.amount))}
                        </p>
                        <p className="text-xs text-white/40">{formatDate(t.createdAt)}</p>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add funds modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1220] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-white">Add funds</h2>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-2 mt-4 block text-xs font-medium uppercase tracking-wider text-white/40">
              Amount (USD)
            </label>
            <div className="flex items-center rounded-lg border border-white/10 bg-white/5 px-3">
              <span className="text-white/50">$</span>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-transparent px-2 py-2.5 text-lg font-semibold text-white outline-none"
              />
            </div>
            <div className="mt-2 flex gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => setAmount(q)}
                  className={`flex-1 rounded-lg border py-1.5 text-sm transition-colors ${
                    amount === q
                      ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                      : 'border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  ${q}
                </button>
              ))}
            </div>

            <label className="mb-2 mt-4 block text-xs font-medium uppercase tracking-wider text-white/40">
              Payment method
            </label>
            <div className="grid max-h-44 grid-cols-1 gap-2 overflow-y-auto">
              {FUNDING_METHODS.map((m) => {
                const Icon = kindIcon[m.kind] ?? CreditCard
                return (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.name)}
                    className={`flex items-center gap-3 rounded-lg border p-2.5 text-left transition-colors ${
                      method === m.name ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ background: `hsl(${m.hue} 70% 50% / 0.15)`, color: `hsl(${m.hue} 80% 65%)` }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{m.name}</p>
                      <p className="text-xs text-white/40">{m.kind}</p>
                    </div>
                    {method === m.name && <Check className="h-4 w-4 text-blue-400" />}
                  </button>
                )
              })}
            </div>

            <button
              onClick={confirm}
              className="mt-5 w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition-colors hover:bg-blue-500"
            >
              Add {formatUSD(amount)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
