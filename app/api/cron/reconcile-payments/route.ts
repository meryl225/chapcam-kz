import { NextRequest, NextResponse } from 'next/server'
import { reconcilePendingPaydunya } from '@/lib/fulfillment'
import { reconcileWaitingActivations } from '@/lib/numbers/reconcile'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Tache de secours (toutes les 5 min via vercel.json). Deux roles :
//   1) Paiements PayDunya "pending" : credite ceux reellement payes, annule les
//      abandonnes — garantit le credit meme si le client a ferme le navigateur.
//   2) Activations "waiting" : recupere les SMS arrives et, surtout, rembourse
//      AUTOMATIQUEMENT (idempotent) les numeros sans SMS / expires / rembourses
//      par le fournisseur, meme si le client n'a pas garde la page ouverte.
export async function GET(request: NextRequest) {
  // Si un CRON_SECRET est defini, on exige le header d'autorisation Vercel Cron.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const payments = await reconcilePendingPaydunya({ maxAgeDays: 3, limit: 100 })
  const activations = await reconcileWaitingActivations(200).catch((e) => {
    console.log('[cron/reconcile-payments] activations error:', (e as Error)?.message)
    return null
  })
  console.log('[cron/reconcile-payments]', JSON.stringify({ payments, activations }))
  return NextResponse.json({ ok: true, payments, activations, at: new Date().toISOString() })
}
