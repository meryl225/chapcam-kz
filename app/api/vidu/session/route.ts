import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkLiveAccess, claimLiveSession, releaseLiveSession } from '@/lib/live-guard'
import { trackGPUUsage } from '@/lib/rate-limit'
import {
  VIDU_WS_URL,
  ViduApiError,
  createViduSession,
  getViduLive,
  isValidImageDataUri,
  isViduEditingType,
} from '@/lib/vidu'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SESSION_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ? user : null
}

// Cree une session Vidu S2-Editing. La cle API ne quitte jamais le serveur :
// le client ne recoit que les identifiants ephemeres (client_secret + token RTC).
export async function POST(request: Request) {
  const user = await requireUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifie. Connecte-toi pour utiliser le swap.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const sessionId = body?.sessionId
  const imageDataUri = body?.image
  const editingType = body?.editingType ?? 'subject_replacement'

  if (typeof sessionId !== 'string' || !SESSION_ID_PATTERN.test(sessionId)) {
    return NextResponse.json({ error: 'Session invalide.' }, { status: 400 })
  }
  if (!isValidImageDataUri(imageDataUri)) {
    return NextResponse.json({ error: 'Image de reference invalide ou trop lourde (max 4 Mo).' }, { status: 400 })
  }
  if (!isViduEditingType(editingType)) {
    return NextResponse.json({ error: 'Mode de transformation invalide.' }, { status: 400 })
  }

  const access = await checkLiveAccess(user.id)
  if (!access.allowed) {
    const msg =
      access.reason === 'insufficient_points'
        ? 'Points insuffisants. Recharge ton compte pour utiliser le swap.'
        : access.reason === 'expired'
          ? 'Ton abonnement a expire. Renouvelle pour continuer.'
          : 'Aucun abonnement actif. Souscris ou recharge pour utiliser le swap.'
    return NextResponse.json({ error: msg, code: access.reason }, { status: 402 })
  }

  if (!trackGPUUsage(user.id, 0).allowed) {
    return NextResponse.json({ error: 'Limite quotidienne de swap atteinte (2h). Reessaie demain.', code: 'daily_cap' }, { status: 429 })
  }

  const claim = await claimLiveSession(user.id, sessionId)
  if (!claim.ok) {
    return NextResponse.json(
      { error: 'Un swap est deja en cours sur ce compte (autre onglet ou appareil). Ferme-le puis reessaie dans une minute.', code: 'session_conflict' },
      { status: 409 },
    )
  }

  try {
    const session = await createViduSession(imageDataUri, editingType)
    console.log(`[Vidu] session created user=${user.id} live=${session.liveId} type=${editingType}`)
    return NextResponse.json({ ...session, wsUrl: VIDU_WS_URL })
  } catch (err) {
    await releaseLiveSession(user.id, sessionId)
    const status = err instanceof ViduApiError ? err.status : 500
    const msg =
      status === 401 || status === 403
        ? 'Service Vidu indisponible (cle API refusee).'
        : status === 402
          ? 'Credits Vidu epuises. Contacte le support.'
          : 'Impossible de demarrer la session Vidu. Reessaie dans un instant.'
    return NextResponse.json({ error: msg }, { status: status >= 500 ? 502 : status })
  }
}

// Fin de session : libere le verrou et renvoie la duree facturee par Vidu.
export async function DELETE(request: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Non authentifie.' }, { status: 401 })

  const url = new URL(request.url)
  const sessionId = url.searchParams.get('sessionId')
  const liveId = url.searchParams.get('liveId')

  if (sessionId && SESSION_ID_PATTERN.test(sessionId)) {
    await releaseLiveSession(user.id, sessionId)
  }
  const live = liveId ? await getViduLive(liveId).catch(() => null) : null
  if (live) {
    console.log(`[Vidu] session ended user=${user.id} live=${liveId} billed=${live.billedSeconds}s reason=${live.closeReason}`)
  }
  return NextResponse.json({ ok: true, live })
}
