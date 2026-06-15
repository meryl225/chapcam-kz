'use client'

import { useEffect, useState } from 'react'
import { useNumbers } from '@/components/numbers/numbers-provider'
import { FUNDING_METHODS } from '@/lib/numbers/data'
import { formatXOF } from '@/lib/numbers/types'
import { Wallet, Plus, X, ArrowDownLeft, ArrowUpRight, Smartphone, CreditCard, Coins, Loader2 } from 'lucide-react'

const card = 'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl'

const kindIcon: Record<string, typeof Smartphone> = {
  'Mobile Money': Smartphone,
  Card: CreditCard,
  Crypto: Coins,
}

const QUICK = [1000, 2500, 5000, 10000]

const TX_KIND_FR: Record<string, string> = {
  deposit: 'Dépôt',
  purchase: 'Achat',
  refund: 'Remboursement',
}

const KIND_LABEL: Record<string, string> = {
  'Mobile Money': 'Mobile Money',
  Card: 'Carte',
  Crypto: 'Crypto',
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function WalletPage() {
  const { balanceXof, transactions, pushToast, refreshState, isAdmin } = useNumbers()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(2500)
  const [loading, setLoading] = useState(false)

  const deposits = transactions.filter((t) => t.kind === 'deposit').reduce((s, t) => s + t.amountXof, 0)
  const spend = transactions.filter((t) => t.kind === 'purchase').reduce((s, t) => s + Math.abs(t.amountXof), 0)

  // Au retour de PayDunya (?topup=success), on rafraichit le solde : le credit
  // reel arrive via l'IPN, donc on relance quelques rafraichissements.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const topup = params.get('topup')
    if (!topup) return
    if (topup === 'success') {
      pushToast('Paiement reçu', 'Votre solde sera crédité dans quelques instants.')
      refreshState()
      const t1 = setTimeout(refreshState, 4000)
      const t2 = setTimeout(refreshState, 10000)
      window.history.replaceState({}, '', '/numbers/app/wallet')
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }
    if (topup === 'cancel') {
      pushToast('Recharge annulée', 'Aucun montant n’a été débité.')
      window.history.replaceState({}, '', '/numbers/app/wallet')
    }
  }, [pushToast, refreshState])

  async function confirm() {
    if (amount < 500 || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/numbers/wallet/topup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amountXof: amount }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success || !data.invoice_url) {
        pushToast('Recharge impossible', data?.error ?? 'Réessayez plus tard.')
        setLoading(false)
        return
      }
      // En iframe (preview), on ouvre PayDunya dans un nouvel onglet ;
      // sinon on redirige l'onglet courant vers la page de paiement.
      if (window.self !== window.top) {
        window.open(data.invoice_url, '_blank', 'noopener,noreferrer')
        setOpen(false)
        setLoading(false)
      } else {
        window.location.href = data.invoice_url
      }
    } catch {
      pushToast('Erreur réseau', 'Vérifiez votre connexion et réessayez.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Portefeuille</h1>
          <p className="text-sm text-white/50">Approvisionnez votre compte et consultez vos transactions</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" /> Ajouter des fonds
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-600/20 to-blue-500/5 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
            <Wallet className="h-5 w-5" />
          </span>
          <p className="mt-4 text-3xl font-semibold text-white">{formatXOF(balanceXof)}</p>
          <p className="text-sm text-white/50">Solde disponible</p>
        </div>
        <div className={`${card} p-5`}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <ArrowDownLeft className="h-5 w-5" />
          </span>
          <p className="mt-4 text-2xl font-semibold text-white">{formatXOF(deposits)}</p>
          <p className="text-sm text-white/50">Total déposé</p>
        </div>
        <div className={`${card} p-5`}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/70">
            <ArrowUpRight className="h-5 w-5" />
          </span>
          <p className="mt-4 text-2xl font-semibold text-white">{formatXOF(spend)}</p>
          <p className="text-sm text-white/50">Total dépensé</p>
        </div>
      </div>

      {/* Moyens de paiement */}
      <div className={`${card} p-5`}>
        <h2 className="mb-4 font-semibold text-white">Moyens de paiement acceptés</h2>
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
                  <p className="text-xs text-white/40">{KIND_LABEL[m.kind] ?? m.kind}</p>
                </div>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-white/40">
          Les recharges sont traitées en ligne et sécurisées via PayDunya (Mobile Money, carte bancaire).
          Votre solde est crédité automatiquement dès la confirmation du paiement.
        </p>
      </div>

      {/* Transactions */}
      <div className={`${card} overflow-hidden`}>
        <div className="border-b border-white/5 p-5">
          <h2 className="font-semibold text-white">Transactions</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Wallet className="h-8 w-8 text-white/20" />
            <p className="mt-2 text-sm text-white/50">Aucune transaction pour le moment</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-white/5">
                {[...transactions]
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((t) => {
                    const positive = t.kind !== 'purchase'
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
                              <p className="text-white">{TX_KIND_FR[t.kind] ?? t.kind}</p>
                              <p className="text-xs text-white/40">{t.method}</p>
                            </div>
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="hidden p-4 font-mono text-xs text-white/40 sm:table-cell">{t.reference}</td>
                        )}
                        <td className="p-4 text-right">
                          <p className={`font-medium ${positive ? 'text-emerald-400' : 'text-white'}`}>
                            {positive ? '+' : '−'}
                            {formatXOF(Math.abs(t.amountXof))}
                          </p>
                          <p className="text-xs text-white/40">{fmtDate(t.createdAt)}</p>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal ajout de fonds */}
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
              <h2 className="text-lg font-semibold text-white">Ajouter des fonds</h2>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-2 mt-4 block text-xs font-medium uppercase tracking-wider text-white/40">
              Montant (FCFA)
            </label>
            <div className="flex items-center rounded-lg border border-white/10 bg-white/5 px-3">
              <input
                type="number"
                min={500}
                step={500}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-transparent px-2 py-2.5 text-lg font-semibold text-white outline-none"
              />
              <span className="text-white/50">FCFA</span>
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
                  {q.toLocaleString('fr-FR')}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">
                <Smartphone className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Paiement sécurisé via PayDunya</p>
                <p className="text-xs text-white/40">Mobile Money (Orange, MTN, Moov, Wave) et carte bancaire</p>
              </div>
            </div>

            <button
              onClick={confirm}
              disabled={loading || amount < 500}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Redirection vers PayDunya...
                </>
              ) : (
                <>Payer {formatXOF(amount)} avec PayDunya</>
              )}
            </button>
            <p className="mt-2 text-center text-xs text-white/40">
              Vous serez redirigé vers PayDunya pour finaliser le paiement en toute sécurité.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
