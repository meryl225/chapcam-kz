import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { RevenueCatUnavailableError, syncRevenueCatCustomer } from '@/lib/revenuecat'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

// Appelee par l'app iOS apres un achat ou une restauration. Le serveur relit
// lui-meme les achats confirmes chez RevenueCat pour l'utilisateur authentifie :
// le contenu de la requete n'est jamais utilise pour crediter.
export async function POST(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })

  const body = await request.json().catch(() => null)
  const source = body?.source === 'restore' ? 'revenuecat_restore' : 'revenuecat_purchase'

  try {
    const result = await syncRevenueCatCustomer(user.id, { email: user.email, source })
    return NextResponse.json(result, { headers: NO_STORE })
  } catch (err) {
    console.error('[mobile/iap/revenuecat/sync] Synchronisation impossible:', (err as Error).message)
    const status = err instanceof RevenueCatUnavailableError ? 503 : 500
    return NextResponse.json({ error: 'Vérification des achats indisponible' }, { status, headers: NO_STORE })
  }
}
