import { NextRequest, NextResponse } from 'next/server'
import { reconcilePendingPaydunya } from '@/lib/fulfillment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Eviter une execution trop longue : on plafonne le batch dans la fonction.
export const maxDuration = 60

// Cron de reconciliation PayDunya.
// Declenche par Vercel Cron (voir vercel.json) OU manuellement avec
// le header Authorization: Bearer <CRON_SECRET>.
// Credite les paiements completes mais non credites (client parti sans revenir)
// et annule les factures abandonnees (nettoie les doublons "en attente").
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const result = await reconcilePendingPaydunya({ maxAgeDays: 7, limit: 200 })
  console.log('[cron/reconcile-payments]', result)
  return NextResponse.json({ ok: true, ...result })
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
