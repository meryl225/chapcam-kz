import { NextRequest, NextResponse } from 'next/server'
import { reconcilePendingPaydunya } from '@/lib/fulfillment'
import { reconcilePendingGeniusPay } from '@/lib/geniuspay'
import { reconcileWaitingActivations } from '@/lib/numbers/reconcile'
import { reconcileProcessingPhotoVideos, reconcileProcessingOtherVideos } from '@/lib/heygen-reconcile'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Tache de secours (toutes les 5 min via vercel.json). Trois roles :
//   1) Paiements PayDunya "pending" : credite ceux reellement payes, annule les
//      abandonnes — garantit le credit meme si le client a ferme le navigateur.
//   2) Paiements GeniusPay "pending" (carte / mobile money) : reconfirme le
//      statut aupres de GeniusPay et credite ceux reellement payes dont le
//      webhook/retour ne nous est jamais parvenu (idempotent, pas de doublon).
//   3) Activations "waiting" : recupere les SMS arrives et, surtout, rembourse
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
  const geniuspay = await reconcilePendingGeniusPay().catch((e) => {
    console.log('[cron/reconcile-payments] geniuspay error:', (e as Error)?.message)
    return null
  })
  const activations = await reconcileWaitingActivations(200).catch((e) => {
    console.log('[cron/reconcile-payments] activations error:', (e as Error)?.message)
    return null
  })
  // Rattrape les videos HeyGen deja facturees mais restees "en cours" (onglet
  // ferme + webhook manque) pour les utilisateurs qui ne reviennent pas : evite
  // qu'ils relancent une generation payante pour rien.
  const photoVideos = await reconcileProcessingPhotoVideos(40).catch((e) => {
    console.log('[cron/reconcile-payments] photo-video error:', (e as Error)?.message)
    return null
  })
  // Meme filet de securite pour Traduction / Genjutsu / Motion : finalise les
  // videos terminees restees "en cours" pour les utilisateurs qui ne reviennent
  // pas, afin qu'elles apparaissent dans « Mes creations » sans action de leur part.
  const otherVideos = await reconcileProcessingOtherVideos(30).catch((e) => {
    console.log('[cron/reconcile-payments] other-videos error:', (e as Error)?.message)
    return null
  })
  console.log('[cron/reconcile-payments]', JSON.stringify({ payments, geniuspay, activations, photoVideos, otherVideos }))
  return NextResponse.json({ ok: true, payments, geniuspay, activations, photoVideos, otherVideos, at: new Date().toISOString() })
}
