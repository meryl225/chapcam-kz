'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Loader2, XCircle, Clock, Sparkles, Video } from 'lucide-react'

type Status = 'checking' | 'completed' | 'pending' | 'cancelled' | 'error'

const MAX_ATTEMPTS = 8 // ~16s de polling pour absorber le delai de l'IPN PayDunya

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const provider = searchParams.get('provider')
  // Paiement crypto Trybit : redirection statique sans token, on reconnait le
  // retour via ?provider=trybit et on interroge la route de statut crypto.
  const isTrybit = provider === 'trybit'
  // Paiement crypto NOWPayments : le provider ajoute NP_id (payment_id) a l'URL.
  const isNowPayments = provider === 'nowpayments'
  const isCrypto = isTrybit || isNowPayments
  const uuid = searchParams.get('uuid')
  const npId = searchParams.get('NP_id') || searchParams.get('payment_id')
  const [status, setStatus] = useState<Status>('checking')
  const [kind, setKind] = useState<'plan' | 'live' | null>(null)

  const check = useCallback(async () => {
    // Le crypto n'a pas de token dans l'URL : la route retrouve la derniere
    // facture de l'utilisateur connecte (ou via l'identifiant fourni).
    if (!isCrypto && !token) {
      setStatus('error')
      return true
    }
    try {
      let url: string
      if (isNowPayments) {
        url = `/api/payment/nowpayments/status${npId ? `?payment_id=${encodeURIComponent(npId)}` : ''}`
      } else if (isTrybit) {
        url = `/api/payment/trybit/status${uuid ? `?uuid=${encodeURIComponent(uuid)}` : ''}`
      } else {
        url = `/api/payment/status?token=${encodeURIComponent(token!)}`
      }
      const res = await fetch(url, { cache: 'no-store' })
      const data = await res.json()
      if (data.status === 'completed') {
        setKind(data.kind ?? null)
        setStatus('completed')
        return true
      }
      if (data.status === 'cancelled') {
        setStatus('cancelled')
        return true
      }
      return false
    } catch {
      return false
    }
  }, [token, isCrypto, isTrybit, isNowPayments, uuid, npId])

  useEffect(() => {
    if (!isCrypto && !token) {
      setStatus('error')
      return
    }
    let active = true
    let timer: ReturnType<typeof setTimeout>

    const run = async (attempt: number) => {
      const done = await check()
      if (!active) return
      if (done) return
      if (attempt >= MAX_ATTEMPTS) {
        setStatus('pending')
        return
      }
      timer = setTimeout(() => run(attempt + 1), 2000)
    }

    run(0)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [token, isCrypto, check])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-gray-800 bg-card p-8 text-center">
        {status === 'checking' && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-foreground">Verification du paiement...</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isNowPayments
                ? 'Nous confirmons votre transaction crypto aupres de NOWPayments. Patientez quelques secondes.'
                : isTrybit
                  ? 'Nous confirmons votre transaction crypto aupres de Trybit. Patientez quelques secondes.'
                  : 'Nous confirmons votre transaction aupres de PayDunya. Patientez quelques secondes.'}
            </p>
          </>
        )}

        {status === 'completed' && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              {kind === 'live' ? (
                <Video className="h-8 w-8 text-primary" />
              ) : (
                <CheckCircle className="h-8 w-8 text-primary" />
              )}
            </div>
            <h1 className="mb-2 text-2xl font-bold text-foreground">Paiement confirme</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {kind === 'live'
                ? 'Votre acces a ete credite. Rendez-vous sur votre tableau de bord.'
                : 'Vos points ont ete credites sur votre compte. Vous pouvez commencer a creer.'}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/dashboard"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-semibold text-black transition-colors hover:bg-primary/90"
              >
                <Sparkles className="h-4 w-4" />
                Aller au tableau de bord
              </Link>
            </div>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/15">
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-foreground">Paiement en cours de traitement</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Votre paiement n&apos;est pas encore confirme. Si vous avez bien paye, votre compte
              sera credite automatiquement sous peu.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => {
                  setStatus('checking')
                  void check()
                }}
                className="w-full rounded-2xl bg-primary py-3 font-semibold text-black transition-colors hover:bg-primary/90"
              >
                Verifier a nouveau
              </button>
              <Link
                href="/dashboard"
                className="w-full rounded-2xl border border-gray-700 py-3 font-semibold text-muted-foreground transition-colors hover:border-gray-500 hover:text-foreground"
              >
                Retour au tableau de bord
              </Link>
            </div>
          </>
        )}

        {status === 'cancelled' && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-foreground">Paiement annule</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              La transaction a ete annulee. Aucun montant n&apos;a ete debite.
            </p>
            <Link
              href="/dashboard/plans"
              className="mt-6 flex w-full items-center justify-center rounded-2xl bg-primary py-3 font-semibold text-black transition-colors hover:bg-primary/90"
            >
              Revenir aux formules
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-foreground">Lien invalide</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Impossible de verifier ce paiement. Si vous avez ete debite, contactez le support.
            </p>
            <Link
              href="/dashboard/plans"
              className="mt-6 flex w-full items-center justify-center rounded-2xl bg-primary py-3 font-semibold text-black transition-colors hover:bg-primary/90"
            >
              Revenir aux formules
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  )
}
