import { NextRequest, NextResponse } from 'next/server'
import { reconcilePendingPaydunya } from '@/lib/fulfillment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Tache de secours (toutes les 5 min via vercel.json).
// Verifie toutes les factures PayDunya "pending" recentes :
//   - credite automatiquement celles reellement payees (client deja parti),
//   - annule celles abandonnees.
// Garantit le credit meme si le client ferme le navigateur juste apres avoir paye.
export async function GET(request: NextRequest) {
  // Si un CRON_SECRET est defini, on exige le header d'autorisation Vercel Cron.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const result = await reconcilePendingPaydunya({ maxAgeDays: 3, limit: 100 })
  console.log('[cron/reconcile-payments]', JSON.stringify(result))
  return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() })
}
