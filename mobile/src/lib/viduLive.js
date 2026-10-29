import { ChapcamRtc } from '../../modules/chapcam-rtc'

const CONN_INIT_TIMEOUT_MS = 90_000
const CONN_INIT_RETRY_MS = 2_000
const FIRST_FRAME_TIMEOUT_MS = 90_000
const RENDER_OFFLINE_GRACE_MS = 8_000
const SOCKET_CLOSE_DELAY_MS = 300

export const LIVE_SWAP_GENERIC_ERROR = 'Live Swap est momentanément indisponible. Réessaie dans un instant.'

// Internal diagnostics only: provider names and raw errors never reach the UI.
const log = (...args) => console.log('[live-swap]', ...args)

const userError = (message) => Object.assign(new Error(message), { userFacing: true })

function toDataUri(base64) {
  const mime = base64.startsWith('iVBOR') ? 'image/png' : base64.startsWith('UklGR') ? 'image/webp' : 'image/jpeg'
  return `data:${mime};base64,${base64}`
}

function httpErrorMessage(status, body) {
  if (status === 401) return 'Session expirée. Reconnecte-toi.'
  if (status === 402) return body?.error || 'Forfait inactif ou minutes insuffisantes. Ouvre « Forfaits » pour t\u2019abonner.'
  if (status === 409) return 'Un Live Swap est déjà en cours sur ce compte. Ferme-le puis réessaie dans une minute.'
  if (status === 429) return body?.error || 'Limite quotidienne atteinte. Réessaie demain.'
  if (status === 400 && body?.error && !String(body.error).toLowerCase().includes('vidu')) return body.error
  if (typeof body?.detail === 'string' && body.detail.includes('AuditSubmitIllegal')) {
    return 'Cette photo a été refusée par le contrôle de contenu. Choisis une photo nette d\u2019un visage de face.'
  }
  return LIVE_SWAP_GENERIC_ERROR
}

/**
 * One Chapcam Live Swap session: backend session -> relay signaling -> native RTC.
 * Billing is driven by the caller from `onVisible`, which fires only once the first
 * transformed frame is actually drawn on screen.
 */
export function startViduLive({ authedFetch, sessionId, imageBase64, frontCamera, onState, onVisible, onEnded }) {
  let closed = false
  let socket = null
  let seq = 1
  let session = null
  let visible = false
  let step = 'session'
  const timers = []
  const subscriptions = []

  const later = (fn, ms) => {
    const t = setTimeout(fn, ms)
    timers.push(t)
    return t
  }

  const send = (type, payload) => {
    if (!socket || socket.readyState !== 1 || !session) return false
    socket.send(JSON.stringify({ type, live_id: session.liveId, conn_id: session.connId, seq_id: seq++, payload }))
    return true
  }

  const end = async (reason, userMessage) => {
    if (closed) return
    closed = true
    timers.forEach(clearTimeout)
    subscriptions.forEach((s) => s?.remove?.())

    // Hang up first so the remote session stops immediately, then free camera and microphone.
    if (socket) {
      send(5, { hangup: { hangup_reason: 'user_hangup' } })
      const s = socket
      setTimeout(() => {
        try { s.close() } catch {}
      }, SOCKET_CLOSE_DELAY_MS)
    }
    socket = null
    try {
      await ChapcamRtc.leave()
    } catch (err) {
      log('rtc leave failed', err?.message)
    }

    if (session || reason === 'failed') {
      const query = new URLSearchParams({ sessionId })
      if (session) query.set('liveId', session.liveId)
      if (reason === 'failed') {
        query.set('failedStep', step)
        if (userMessage?.detail) query.set('detail', String(userMessage.detail).slice(0, 280))
      }
      authedFetch(`/api/vidu/session?${query}`, { method: 'DELETE' }).catch(() => {})
    }
    log(`session ended reason=${reason} step=${step} visible=${visible}`)
    if (reason !== 'manual') onEnded?.({ reason, message: userMessage?.text ?? LIVE_SWAP_GENERIC_ERROR, wasVisible: visible })
  }

  const fail = (err) => {
    const text = err?.userFacing ? err.message : LIVE_SWAP_GENERIC_ERROR
    log(`failed at step=${step}`, err?.message ?? err)
    end('failed', { text, detail: err?.message })
  }

  const waitForConnInitAck = () =>
    new Promise((resolve, reject) => {
      let acked = false
      later(() => !acked && reject(new Error('conn_init_ack timeout')), CONN_INIT_TIMEOUT_MS)
      const init = () => send(1, { conn_init: { version: 1 } })
      socket.onopen = () => {
        log('signaling open')
        init()
      }
      socket.onmessage = (event) => {
        let msg
        try { msg = JSON.parse(event.data) } catch { return }
        const ack = msg?.payload?.conn_init_ack
        if (msg?.type === 2 && ack) {
          if (ack.success) {
            if (!acked) {
              acked = true
              resolve()
            }
          } else if (ack.error_code === 'NOT_READY') {
            onState?.('warming_up')
            later(() => !acked && !closed && init(), CONN_INIT_RETRY_MS)
          } else {
            reject(new Error(`conn_init_ack ${ack.error_code ?? 'unknown'}`))
          }
        }
        if (msg?.type === 6) {
          const reason = msg?.payload?.hangup?.hangup_reason ?? 'unknown'
          if (!acked) return reject(new Error(`remote hangup before ack: ${reason}`))
          log(`remote hangup ${reason}`)
          end('remote_hangup', { text: 'La session Live Swap est terminée.' })
        }
      }
      socket.onerror = () => log('signaling error')
      socket.onclose = (event) => {
        log(`signaling closed code=${event.code}`)
        if (!acked) reject(new Error(`signaling closed ${event.code}`))
        else end('connection_lost', { text: 'Connexion Live Swap perdue. Vérifie ta connexion puis réessaie.' })
      }
    })

  const run = async () => {
    onState?.('connecting')
    const res = await authedFetch('/api/vidu/session', {
      method: 'POST',
      body: JSON.stringify({ sessionId, image: toDataUri(imageBase64), editingType: 'subject_replacement' }),
    })
    if (!res.ok || !res.body?.liveId) {
      const err = userError(httpErrorMessage(res.status, res.body))
      err.status = res.status
      throw err
    }
    if (closed) return
    session = { liveId: res.body.liveId, connId: res.body.connId, renderUid: res.body.renderUid }
    log(`session created live=${session.liveId}`)

    step = 'signaling'
    socket = new WebSocket(`${res.body.relayUrl}?${new URLSearchParams({ ticket: res.body.ticket })}`)
    await waitForConnInitAck()
    if (closed) return

    step = 'rtc_join'
    onState?.('connected')
    let offlineTimer = null
    subscriptions.push(
      ChapcamRtc.addListener((event) => {
        if (closed) return
        switch (event?.type) {
          case 'firstFrame':
            if (!visible) {
              visible = true
              step = 'live'
              onVisible?.()
            }
            break
          case 'renderOffline':
            if (offlineTimer) return
            offlineTimer = later(() => end('render_offline', { text: 'Live Swap a été interrompu. Réessaie.' }), RENDER_OFFLINE_GRACE_MS)
            break
          case 'renderOnline':
            clearTimeout(offlineTimer)
            offlineTimer = null
            break
          case 'bye':
            end('bye', { text: 'Connexion Live Swap perdue. Réessaie.' })
            break
          case 'connection':
            log(`rtc connection status=${event.status} reason=${event.reason}`)
            break
          default:
            break
        }
      }),
    )

    later(() => !visible && end('no_output', { text: 'Live Swap n\u2019a produit aucune image. Vérifie ta connexion puis réessaie.' }), FIRST_FRAME_TIMEOUT_MS)

    await ChapcamRtc.join({
      token: res.body.rtc.token,
      renderUid: session.renderUid,
      displayName: res.body.rtc.user_id,
      frontCamera,
      playRemoteAudio: false,
    })
    log('rtc joined')
  }

  run().catch((err) => !closed && fail(err))

  return {
    disconnect: () => end('manual'),
    switchCamera: () => ChapcamRtc.switchCamera().catch(() => {}),
    isVisible: () => visible,
  }
}
