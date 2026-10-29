import { NextResponse } from 'next/server'
import { LIVE_SWAP_GENERIC_ERROR } from '@/lib/live-swap-provider'
import { createClient } from '@/lib/supabase/server'
import { checkLiveAccess, claimLiveSession, releaseLiveSession } from '@/lib/live-guard'
import { trackGPUUsage } from '@/lib/rate-limit'
import { randomUUID } from 'node:crypto'
import { VIDU_RELAY_URL, createRelayTicket } from '@/lib/vidu-relay'
import {
  ViduApiError,
  createViduSession,
  getViduLive,
  isValidImageDataUri,
  isViduEditingType,
} from '@/lib/vidu'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SESSION_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/
const AVATAR_REJECTED_ERROR =
  "Cette photo d'avatar a été refusée par le contrôle de contenu. Choisis un autre avatar, de préférence une photo nette d'un visage de face, puis réessaie."

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ? user : null
}

// Cree une session Vidu S2-Editing. La cle API ne quitte jamais le serveur :
// le client ne recoit que le token RTC et un ticket chiffre pour le relais (client_secret inclus, illisible).
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
    const connId = randomUUID()
    const ticket = createRelayTicket({ liveId: session.liveId, connId, clientSecret: session.clientSecret, userId: user.id })
    // client_secret stays sealed inside the ticket; only the relay can open it.
    return NextResponse.json({
      liveId: session.liveId,
      renderUid: session.renderUid,
      rtc: session.rtc,
      connId,
      relayUrl: VIDU_RELAY_URL,
      ticket,
    })
  } catch (err) {
    await releaseLiveSession(user.id, sessionId)
    const status = err instanceof ViduApiError ? err.status : 500
    const detail = describeError(err)
    console.error(`[Vidu] session creation failed user=${user.id} status=${status} detail=${detail}`, err)
    // The provider name and raw message never reach the client.
    if (detail.includes('AuditSubmitIllegal')) {
      return NextResponse.json(
        { error: AVATAR_REJECTED_ERROR, code: 'avatar_rejected', detail: 'AuditSubmitIllegal' },
        { status: 502 },
      )
    }
    return NextResponse.json({ error: LIVE_SWAP_GENERIC_ERROR, code: `live_${status}` }, { status: 502 })
  }
}

// Message technique sans secret (la cle Vidu n'apparait jamais dans ces messages).
function describeError(err: unknown): string {
  if (!(err instanceof Error)) return String(err).slice(0, 300)
  const cause = err.cause as { code?: string; message?: string } | undefined
  const causeText = cause ? ` | cause: ${cause.code ?? cause.message ?? String(cause)}` : ''
  return `${err.name}: ${err.message}${causeText}`.slice(0, 300)
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
  const failedStep = url.searchParams.get('failedStep')
  if (failedStep && /^[a-z_]{2,32}$/.test(failedStep)) {
    const detail = (url.searchParams.get('detail') ?? '').replace(/[^\w .:/()-]/g, '').slice(0, 300)
    console.error(`[Vidu] client start failed user=${user.id} step=${failedStep} detail=${detail}`)
  }
  const live = liveId ? await getViduLive(liveId).catch(() => null) : null
  if (live) {
    console.log(`[Vidu] session ended user=${user.id} live=${liveId} billed=${live.billedSeconds}s reason=${live.closeReason}`)
  }
  return NextResponse.json({ ok: true, live })
}
