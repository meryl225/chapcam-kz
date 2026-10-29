import 'server-only'
import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { LIVE_SWAP_GENERIC_ERROR } from '@/lib/live-swap-provider'
import { createClient } from '@/lib/supabase/server'
import { checkLiveAccess, claimLiveSession, releaseLiveSession } from '@/lib/live-guard'
import { trackGPUUsage } from '@/lib/rate-limit'
import {
  LiveEngineError,
  createUpstreamSession,
  getUpstreamLive,
  isLiveEditingType,
  isValidImageDataUri,
} from './upstream'
import {
  LIVE_RELAY_URL,
  createLegacyRelayTicket,
  createRelayTicket,
  createSessionHandle,
  openSessionHandle,
} from './tokens'

const SESSION_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/
const AVATAR_REJECTED_ERROR =
  "Cette photo d'avatar a été refusée par le contrôle de contenu. Choisis un autre avatar, de préférence une photo nette d'un visage de face, puis réessaie."

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ? user : null
}

function describeError(err: unknown): string {
  if (!(err instanceof Error)) return String(err).slice(0, 300)
  const cause = err.cause as { code?: string; message?: string } | undefined
  const causeText = cause ? ` | cause: ${cause.code ?? cause.message ?? String(cause)}` : ''
  return `${err.name}: ${err.message}${causeText}`.slice(0, 300)
}

// legacy=true keeps the response shape expected by mobile builds already installed on devices.
export async function startLiveSession(request: Request, { legacy }: { legacy: boolean }) {
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
  if (!isLiveEditingType(editingType)) {
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
    const session = await createUpstreamSession(imageDataUri, editingType)
    const connId = randomUUID()
    console.log(`[live] session created user=${user.id} upstream=${session.liveId} type=${editingType} legacy=${legacy}`)
    const rtc = { token: session.rtcToken, user_id: session.rtcUserId }

    if (legacy) {
      return NextResponse.json({
        liveId: session.liveId,
        renderUid: session.renderUid,
        rtc,
        connId,
        relayUrl: LIVE_RELAY_URL,
        ticket: createLegacyRelayTicket({ liveId: session.liveId, connId, clientSecret: session.clientSecret, userId: user.id }),
      })
    }

    return NextResponse.json({
      session: createSessionHandle(sessionId, session.liveId, user.id),
      renderId: session.renderUid,
      rtc,
      relayUrl: LIVE_RELAY_URL,
      ticket: createRelayTicket({
        liveId: session.liveId,
        connId,
        clientSecret: session.clientSecret,
        userId: user.id,
        editingType,
      }),
    })
  } catch (err) {
    await releaseLiveSession(user.id, sessionId)
    const status = err instanceof LiveEngineError ? err.status : 500
    console.error(`[live] session creation failed user=${user.id} status=${status} detail=${describeError(err)}`)
    if (err instanceof LiveEngineError && err.contentRejected) {
      return NextResponse.json({ error: AVATAR_REJECTED_ERROR, code: 'avatar_rejected' }, { status: 502 })
    }
    return NextResponse.json({ error: LIVE_SWAP_GENERIC_ERROR, code: 'live_unavailable' }, { status: 502 })
  }
}

export async function endLiveSession(request: Request) {
  const user = await requireUser()
  if (!user) return NextResponse.json({ error: 'Non authentifie.' }, { status: 401 })

  const url = new URL(request.url)
  const handle = url.searchParams.get('session')
  const opened = handle ? openSessionHandle(handle, user.id) : null
  // Legacy clients send their own sessionId/liveId.
  const sessionId = opened?.sid ?? url.searchParams.get('sessionId')
  const liveId = opened?.lid ?? url.searchParams.get('liveId')

  if (sessionId && SESSION_ID_PATTERN.test(sessionId)) {
    await releaseLiveSession(user.id, sessionId)
  }
  const failedStep = url.searchParams.get('failedStep')
  if (failedStep && /^[a-z_]{2,32}$/.test(failedStep)) {
    const detail = (url.searchParams.get('detail') ?? '').replace(/[^\w .:/()-]/g, '').slice(0, 300)
    console.error(`[live] client start failed user=${user.id} step=${failedStep} detail=${detail}`)
  }
  if (liveId) {
    const live = await getUpstreamLive(liveId).catch(() => null)
    if (live) {
      console.log(`[live] session ended user=${user.id} upstream=${liveId} billed=${live.billedSeconds}s reason=${live.closeReason}`)
    }
  }
  return NextResponse.json({ ok: true })
}
