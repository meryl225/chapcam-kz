import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureLiveAccess, computeState, isGpuConfigured } from '@/lib/live-access'
import { LIVE_OFFERS } from '@/lib/live-offers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET : etat d'acces Live de l'utilisateur connecte.
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie.' }, { status: 401 })
    }

    const admin = createAdminClient()
    const row = await ensureLiveAccess(admin, user.id)
    const state = computeState(row)

    return NextResponse.json({
      ...state,
      gpuConfigured: isGpuConfigured(),
      offer: LIVE_OFFERS[0],
    })
  } catch (err: any) {
    console.error('[live/access] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
