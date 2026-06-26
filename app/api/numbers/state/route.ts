import { NextResponse } from 'next/server'
import { requireUserId, UnauthorizedError } from '@/lib/numbers/auth'
import { getBalance, listActivations, listTransactions } from '@/lib/numbers/db'
import { serializeActivation, serializeTx } from '@/lib/numbers/serialize'

export async function GET() {
  try {
    const userId = await requireUserId()
    const [balanceXof, activations, transactions] = await Promise.all([
      getBalance(userId),
      listActivations(userId),
      listTransactions(userId),
    ])
    return NextResponse.json({
      balanceXof,
      activations: activations.map(serializeActivation),
      transactions: transactions.map(serializeTx),
    })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.log('[v0] state route error:', (e as Error)?.message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
