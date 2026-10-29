'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { LIVE_SWAP_GENERIC_ERROR } from '@/lib/live-swap-provider'

// Only these messages are shown verbatim; any other (SDK/provider) error becomes the generic one.
class UserFacingError extends Error {}

const ALIRTC_SDK_URL = 'https://g.alicdn.com/apsara-media-box/imp-web-rtc/7.1.9/aliyun-rtc-sdk.js'
const CONN_INIT_TIMEOUT_MS = 120_000
const OUTPUT_TIMEOUT_MS = 90_000
const REFERENCE_MAX_SIDE = 1024

export type LiveEditingType = 'subject_replacement' | 'style_transfer' | 'virtual_tryon' | 'background_replacement'

interface LiveSessionResponse {
  session: string
  renderId: string
  relayUrl: string
  ticket: string
  rtc: { token: string; user_id: string }
}

// AliRTC Web SDK is loaded from Alibaba's CDN and exposes a global engine.
type AliRtcEngineInstance = Record<string, any> & {
  on: (event: string, cb: (...args: any[]) => void) => void
  joinChannel: (authInfo: string, displayName: string) => Promise<void>
  destroy: () => void
}
declare global {
  interface Window {
    AliRtcEngine?: {
      isSupported: () => Promise<{ support: boolean; reason?: string }>
      setLogLevel: (level: number) => void
      getInstance: () => AliRtcEngineInstance
    }
  }
}

let sdkPromise: Promise<void> | null = null
function loadAliRtcSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SDK navigateur uniquement'))
  if (window.AliRtcEngine) return Promise.resolve()
  if (!sdkPromise) {
    sdkPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = ALIRTC_SDK_URL
      script.async = true
      script.onload = () => (window.AliRtcEngine ? resolve() : reject(new Error(LIVE_SWAP_GENERIC_ERROR)))
      script.onerror = () => {
        sdkPromise = null
        reject(new UserFacingError('Impossible de charger Live Swap. Vérifie ta connexion internet.'))
      }
      document.head.appendChild(script)
    })
  }
  return sdkPromise
}

// Downscales the reference to a JPEG data URI so it stays well under the engine's 4 MB cap.
async function imageToDataUri(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new UserFacingError("Impossible de charger l'image de l'avatar.")
  const bitmap = await createImageBitmap(await res.blob())
  const scale = Math.min(1, REFERENCE_MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.9)
}

function newConnId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function callOptional(engine: AliRtcEngineInstance, method: string, ...args: unknown[]) {
  if (typeof engine[method] === 'function') await engine[method](...args)
}

export function useLiveSwap() {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionState, setConnectionState] = useState<string>('idle')
  const [error, setError] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [connectionQuality] = useState<string | null>(null)
  const [qualityFactor] = useState<string | null>(null)
  const [queuePosition] = useState<{ position: number; queueSize: number } | null>(null)
  const [activeResolution] = useState<'720p' | '1080p'>('720p')

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  const engineRef = useRef<AliRtcEngineInstance | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const sessionRef = useRef<{ handle: string; renderUid: string; sessionId: string } | null>(null)
  // Set synchronously so a second click during the avatar/session fetch cannot start a parallel attempt.
  const startingRef = useRef(false)
  const timersRef = useRef<number[]>([])
  const elapsedTimerRef = useRef<number | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t))
    timersRef.current = []
    if (elapsedTimerRef.current) {
      window.clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }
  }

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN || !sessionRef.current) return false
    socket.send(JSON.stringify(message))
    return true
  }, [])

  const teardown = useCallback(async (reason: string) => {
    clearTimers()
    const session = sessionRef.current

    // Hang up first so the remote session stops immediately, then release local resources.
    sendMessage({ t: 'hangup' })
    sessionRef.current = null
    const socket = socketRef.current
    socketRef.current = null
    if (socket) {
      console.info(`[live-swap] WS CLOSE requested by client reason=${reason} readyState=${socket.readyState}`)
      window.setTimeout(() => { try { socket.close() } catch {} }, 300)
    }

    const engine = engineRef.current
    engineRef.current = null
    if (engine) {
      try {
        await callOptional(engine, 'stopPreview')
        await callOptional(engine, 'leaveChannel')
      } catch {}
      try { engine.destroy() } catch {}
    }

    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null

    if (session) {
      const query = new URLSearchParams({ session: session.handle })
      void fetch(`/api/live/session?${query}`, { method: 'DELETE', keepalive: true }).catch(() => {})
      console.info(`[live-swap][STEP] SESSION_STOPPED reason=${reason}`)
    }

    setIsPreviewing(false)
    setIsConnected(false)
    setIsConnecting(false)
    setConnectionState(reason === 'manual' ? 'idle' : reason)
  }, [sendMessage])

  const disconnect = useCallback((reason = 'manual') => {
    void teardown(reason)
  }, [teardown])

  const fail = useCallback((message: string) => {
    setError(message)
    void teardown('failed')
  }, [teardown])

  const connect = useCallback(async (
    avatarImageUrl: string,
    options?: {
      sessionId?: string
      editingType?: LiveEditingType
      sourceStream?: MediaStream
      onNoOutput?: (sessionId: string | null) => void
      [key: string]: unknown
    },
  ) => {
    if (startingRef.current || engineRef.current || socketRef.current) {
      console.warn('[live-swap] connect ignored: an attempt is already running')
      return
    }
    if (options?.sourceStream) {
      setError("Live Swap fonctionne uniquement avec la caméra en direct pour l'instant.")
      return
    }
    startingRef.current = true
    const sessionId = options?.sessionId ?? newConnId()
    const editingType = options?.editingType ?? 'subject_replacement'
    setError(null)
    setIsConnecting(true)
    setConnectionState('connecting')
    setElapsedSeconds(0)

    // The relay drives the remote handshake and only reports Chapcam events: ready, warming, error, ended.
    const waitForReady = (socket: WebSocket, sinceCreate: () => number) =>
      new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('ready timeout')), CONN_INIT_TIMEOUT_MS)
        timersRef.current.push(timeout)
        let ready = false
        let opened = false
        socket.onopen = () => {
          opened = true
          console.info(`[live-swap] WS OPEN after=${sinceCreate()}ms`)
          mark('WS_CONNECTED')
        }
        socket.onmessage = (event) => {
          let msg: any
          try { msg = JSON.parse(event.data) } catch { return }
          if (msg?.t === 'ready' && !ready) {
            ready = true
            window.clearTimeout(timeout)
            resolve()
          } else if (msg?.t === 'warming') {
            setConnectionState('warming_up')
          } else if (msg?.t === 'error') {
            reject(new Error(`relay ${msg.code ?? 'error'}`))
          } else if (msg?.t === 'avatar_failed') {
            setError("Impossible de changer d'avatar. Veuillez réessayer.")
          } else if (msg?.t === 'ended') {
            if (!ready) return reject(new Error('ended before ready'))
            if (socketRef.current !== socket) return
            setError('Session Live Swap terminée.')
            void teardown('server_hangup')
          }
        }
        socket.onclose = (event) => {
          const current = socketRef.current === socket
          console.info(`[live-swap] WS CLOSE code=${event.code} opened=${opened} ready=${ready} current=${current} after=${sinceCreate()}ms`)
          // A socket replaced or torn down by the client must not tear down the newer session.
          if (!current && ready) return
          if (!ready) reject(new Error(`ws closed ${event.code} opened=${opened}`))
          else if (sessionRef.current) void teardown('closed')
        }
      })

    const testStart = performance.now()
    let lastStep = 'NONE'
    const mark = (name: string, extra = '') => {
      lastStep = name
      console.info(`[live-swap][STEP] ${name} t=${Math.round(performance.now() - testStart)}ms ${extra}`.trim())
    }
    // Each stage gets a code so a failure shows (and logs) exactly where it broke.
    let step = 'sdk'
    let createdHandle: string | null = null
    try {
      await loadAliRtcSdk()
      step = 'avatar'
      const image = await imageToDataUri(avatarImageUrl)
      step = 'browser_support'
      const support = await window.AliRtcEngine!.isSupported()
      if (!support.support) throw new UserFacingError(`Navigateur non compatible (${support.reason ?? 'WebRTC'}).`)

      // Permission is requested before any billed session exists, then the tracks are released
      // so AliRTC can own the camera exactly as in the official demo.
      step = 'camera'
      const probe = await navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .catch(() => navigator.mediaDevices.getUserMedia({ video: true }))
      probe.getTracks().forEach((track) => track.stop())

      step = 'session'
      const res = await fetch('/api/live/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, image, editingType }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data) {
        if (data?.code === 'avatar_rejected') {
          throw new UserFacingError(
            typeof data.error === 'string'
              ? data.error
              : "Cette photo d'avatar a été refusée par le contrôle de contenu. Choisis un autre avatar, de préférence une photo nette d'un visage de face, puis réessaie.",
          )
        }
        if (data?.error && data.error !== LIVE_SWAP_GENERIC_ERROR) throw new UserFacingError(data.error)
        throw new Error(`session HTTP ${res.status}${data?.code ? ` ${data.code}` : ''}`)
      }
      const session = data as LiveSessionResponse
      sessionRef.current = { handle: session.session, renderUid: session.renderId, sessionId }
      const createdAt = performance.now()
      const sinceCreate = () => Math.round(performance.now() - createdAt)
      createdHandle = session.session
      mark('SESSION_CREATED')

      // Order: create -> relay socket -> ready -> RTC init -> join -> preview + publish -> subscribe render.
      // Exactly one socket per session: the single-use ticket makes a retry impossible by design,
      // and any failure tears the session down below.
      step = 'signaling'
      const socket = new WebSocket(`${session.relayUrl}?${new URLSearchParams({ ticket: session.ticket })}`)
      socketRef.current = socket
      await waitForReady(socket, sinceCreate)
      mark('SESSION_READY', `after=${sinceCreate()}ms`)

      step = 'rtc_init'
      mark('RTC_ENGINE_START')
      window.AliRtcEngine!.setLogLevel(0)
      const engine = window.AliRtcEngine!.getInstance()
      engineRef.current = engine
      mark('RTC_ENGINE_READY')
      engine.on('remoteTrackAvailableNotify', (userId: string, audioTrack: number, videoTrack: number) => {
        if (userId === sessionRef.current?.renderUid && videoTrack > 0) {
          mark('REMOTE_STREAM_PUBLISHED', `user=${userId} video=${videoTrack} audio=${audioTrack}`)
        }
      })
      engine.on('videoSubscribeStateChanged', (userId: string, oldState: number, newState: number, _interval: number, channelId: string) => {
        const isRender = userId === sessionRef.current?.renderUid
        console.info(`[live-swap] RTC videoSubscribeStateChanged user=${userId} ${oldState}->${newState} channel=${channelId} render=${isRender}`)
        if (newState !== 3 || !isRender) return
        mark('REMOTE_STREAM_SUBSCRIBED', `user=${userId}`)
        if (!remoteVideoRef.current) {
          console.error('[live-swap] remote stream subscribed but the Chapcam video element is not mounted')
          return
        }
        void callOptional(engine, 'setRemoteViewConfig', remoteVideoRef.current, userId, 1)
        remoteVideoRef.current.play().catch(() => {})
        mark('REMOTE_VIDEO_ATTACHED')
        timersRef.current.forEach((t) => window.clearTimeout(t))
        timersRef.current = []
        setIsConnecting(false)
        setIsConnected(true)
        setConnectionState('connected')
        if (!elapsedTimerRef.current) {
          elapsedTimerRef.current = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
        }
      })
      // The render worker can drop and rejoin within a few seconds (network blips),
      // so only fail if it stays offline.
      let renderOfflineTimer: number | null = null
      engine.on('remoteUserOnLineNotify', (userId: string) => {
        if (userId !== sessionRef.current?.renderUid || renderOfflineTimer === null) return
        console.info('[live-swap] render worker back online')
        window.clearTimeout(renderOfflineTimer)
        renderOfflineTimer = null
      })
      engine.on('remoteUserOffLineNotify', (userId: string, reason?: number) => {
        if (userId !== sessionRef.current?.renderUid) return
        console.warn(`[live-swap] render worker offline reason=${reason ?? 'unknown'}`)
        if (renderOfflineTimer !== null) return
        renderOfflineTimer = window.setTimeout(() => {
          renderOfflineTimer = null
          fail('Live Swap a été interrompu. Veuillez réessayer.')
        }, 8000)
      })
      engine.on('bye', () => fail('Connexion Live Swap perdue. Veuillez réessayer.'))
      engine.on('authInfoExpired', () => fail('Session Live Swap expirée. Veuillez réessayer.'))

      await callOptional(engine, 'setChannelProfile', 'communication')
      await callOptional(engine, 'setDefaultPublishLocalAudioStream', true)
      await callOptional(engine, 'setDefaultPublishLocalVideoStream', true)
      await callOptional(engine, 'setDefaultSubscribeAllRemoteAudioStreams', true)
      await callOptional(engine, 'setDefaultSubscribeAllRemoteVideoStreams', true)
      mark('RTC_SDK_READY')
      step = 'rtc_join'
      mark('RTC_JOIN_REQUESTED')
      await engine.joinChannel(session.rtc.token, session.rtc.user_id)
      setConnectionState('rtc_joined')
      mark('RTC_JOIN_SUCCESS', `after=${sinceCreate()}ms`)

      step = 'rtc_publish'
      if (localVideoRef.current) await callOptional(engine, 'setLocalViewConfig', localVideoRef.current, 1)
      await callOptional(engine, 'startPreview', 1)
      setCameraEnabled(true)
      setIsPreviewing(true)
      await callOptional(engine, 'publishLocalVideoStream', true)
      try {
        await callOptional(engine, 'publishLocalAudioStream', true)
      } catch (audioErr) {
        console.warn('[live-swap] microphone publish failed, continuing with video only', audioErr)
      }
      mark('RTC_PUBLISHED', `after=${sinceCreate()}ms`)

      const noOutput = window.setTimeout(() => {
        if (!elapsedTimerRef.current) {
          options?.onNoOutput?.(sessionId)
          fail("Live Swap n'a produit aucune image. Veuillez réessayer.")
        }
      }, OUTPUT_TIMEOUT_MS)
      timersRef.current.push(noOutput)
    } catch (err) {
      const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
      console.error(`[live-swap] connect failed at step=${step}`, err)
      console.error(`[live-swap][STEP] FAILED last_success=${lastStep} failed_code=${step} error="${detail}"`)
      // teardown() releases a created session; this only covers failures before creation.
      if (!createdHandle) {
        const report = new URLSearchParams({ sessionId, failedStep: step, detail: detail.slice(0, 300) })
        void fetch(`/api/live/session?${report}`, { method: 'DELETE', keepalive: true }).catch(() => {})
      }

      const denied = err instanceof DOMException && err.name === 'NotAllowedError'
      const message = err instanceof UserFacingError ? err.message : `${LIVE_SWAP_GENERIC_ERROR} (code : ${step})`
      fail(denied ? "Acces a la camera refuse. Autorise-le dans ton navigateur." : message)
    } finally {
      startingRef.current = false
    }
  }, [fail, teardown])

  // Success sends no ack by design, so the switch is sent exactly once.
  const updateAvatar = useCallback(async (avatarImageUrl: string) => {
    if (!sessionRef.current) return
    const image = await imageToDataUri(avatarImageUrl)
    sendMessage({ t: 'avatar', image })
  }, [sendMessage])

  const setLivePrompt = useCallback(async (_prompt: string, _enhance = true) => {}, [])

  const toggleCamera = useCallback(async () => {
    const engine = engineRef.current
    if (!engine) return
    const next = !cameraEnabled
    await callOptional(engine, 'muteLocalCamera', !next, 1)
    setCameraEnabled(next)
  }, [cameraEnabled])

  const startRecording = useCallback(() => {
    const video = remoteVideoRef.current as (HTMLVideoElement & { captureStream?: () => MediaStream }) | null
    const stream = (video?.srcObject as MediaStream | null) ?? video?.captureStream?.() ?? null
    if (!stream || typeof MediaRecorder === 'undefined') return
    chunksRef.current = []
    const recorder = new MediaRecorder(stream)
    recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      setRecordedUrl(URL.createObjectURL(new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' })))
      setIsRecording(false)
    }
    recorder.start(1000)
    recorderRef.current = recorder
    setIsRecording(true)
  }, [])

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
  }, [])

  const clearRecording = useCallback(() => {
    setRecordedUrl((url) => { if (url) URL.revokeObjectURL(url); return null })
  }, [])

  useEffect(() => {
    const onUnload = () => { void teardown('unload') }
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      void teardown('unmount')
    }
  }, [teardown])

  return {
    isConnected,
    isConnecting,
    connectionState,
    error,
    localVideoRef,
    remoteVideoRef,
    connect,
    disconnect,
    updateAvatar,
    setLivePrompt,
    cameraEnabled,
    isPreviewing,
    toggleCamera,
    isRecording,
    recordedUrl,
    startRecording,
    stopRecording,
    clearRecording,
    elapsedSeconds,
    connectionQuality,
    qualityFactor,
    queuePosition,
    activeResolution,
  }
}
