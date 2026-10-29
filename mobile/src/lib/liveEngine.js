import { ChapcamRtc } from '../../modules/chapcam-rtc'

const READY_TIMEOUT_MS = 90_000
const FIRST_FRAME_TIMEOUT_MS = 90_000
const RENDER_OFFLINE_GRACE_MS = 8_000
const SOCKET_CLOSE_DELAY_MS = 300

export const LIVE_SWAP_GENERIC_ERROR = 'Live Swap est momentanément indisponible. Réessaie dans un instant.'

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
  if (body?.code === 'avatar_rejected') {
    return 'Cette photo a été refusée par le contrôle de contenu. Choisis une photo nette d\u2019un visage de face.'
  }
  if (status === 400 && body?.error) return body.error
  return LIVE_SWAP_GENERIC_ERROR
}

/**
 * One Chapcam Live Swap session: Chapcam session -> Chapcam relay -> native RTC.
 * Billing is driven by the caller from `onVisible`, which fires only once the first
 * transformed frame is actually drawn on screen.
 */
export function startLiveSession({ authedFetch, sessionId, imageBase64, frontCamera, onState, onVisible, onEnded }) {
  let closed = false
  let socket = null
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

  const send = (message) => {
    if (!socket || socket.readyState !== 1) return false
    socket.send(JSON.stringify(message))
    return true
  }

  const end = async (reason, userMessage) => {
    if (closed) return
    closed = true
    timers.forEach(clearTimeout)
    subscriptions.forEach((s) => s?.remove?.())

    // Hang up first so the remote session stops immediately, then free camera and microphone.
    if (socket) {
      send({ t: 'hangup' })
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
      const query = new URLSearchParams(session ? { session: session.handle } : { sessionId })
      if (reason === 'failed') {
        query.set('failedStep', step)
        if (userMessage?.detail) query.set('detail', String(userMessage.detail).slice(0, 280))
      }
      authedFetch(`/api/live/session?${query}`, { method: 'DELETE' }).catch(() => {})
    }
    log(`session ended reason=${reason} step=${step} visible=${visible}`)
    if (reason !== 'manual') onEnded?.({ reason, message: userMessage?.text ?? LIVE_SWAP_GENERIC_ERROR, wasVisible: visible })
  }

  const fail = (err) => {
    const text = err?.userFacing ? err.message : LIVE_SWAP_GENERIC_ERROR
    log(`failed at step=${step}`, err?.message ?? err)
    end('failed', { text, detail: err?.message })
  }

  const waitForReady = () =>
    new Promise((resolve, reject) => {
      let ready = false
      later(() => !ready && reject(new Error('ready timeout')), READY_TIMEOUT_MS)
      socket.onopen = () => log('signaling open')
      socket.onmessage = (event) => {
        let msg
        try { msg = JSON.parse(event.data) } catch { return }
        if (msg?.t === 'ready' && !ready) {
          ready = true
          resolve()
        } else if (msg?.t === 'warming') {
          onState?.('warming_up')
        } else if (msg?.t === 'error') {
          reject(new Error(`relay ${msg.code ?? 'error'}`))
        } else if (msg?.t === 'ended') {
          if (!ready) return reject(new Error('ended before ready'))
          end('remote_hangup', { text: 'La session Live Swap est terminée.' })
        }
      }
      socket.onerror = () => log('signaling error')
      socket.onclose = (event) => {
        log(`signaling closed code=${event.code}`)
        if (!ready) reject(new Error(`signaling closed ${event.code}`))
        else end('connection_lost', { text: 'Connexion Live Swap perdue. Vérifie ta connexion puis réessaie.' })
      }
    })

  const run = async () => {
    onState?.('connecting')
    const res = await authedFetch('/api/live/session', {
      method: 'POST',
      body: JSON.stringify({ sessionId, image: toDataUri(imageBase64), editingType: 'subject_replacement' }),
    })
    if (!res.ok || !res.body?.session) {
      const err = userError(httpErrorMessage(res.status, res.body))
      err.status = res.status
      throw err
    }
    if (closed) return
    session = { handle: res.body.session, renderUid: res.body.renderId }
    log('session created')

    step = 'signaling'
    socket = new WebSocket(`${res.body.relayUrl}?${new URLSearchParams({ ticket: res.body.ticket })}`)
    await waitForReady()
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
