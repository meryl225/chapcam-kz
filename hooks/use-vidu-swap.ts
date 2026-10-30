'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { LIVE_SWAP_GENERIC_ERROR } from '@/lib/live-swap-provider'
import { CameraSourceError, cameraErrorMessage, openSourceCamera } from '@/lib/camera-devices'

const CHAPCAM_LABEL = /chapcam/i

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

// Only these messages are shown verbatim; any other (SDK/provider) error becomes the generic one.
class UserFacingError extends Error {}

const ALIRTC_SDK_URL = 'https://g.alicdn.com/apsara-media-box/imp-web-rtc/7.1.9/aliyun-rtc-sdk.js'
const CONN_INIT_TIMEOUT_MS = 120_000
const OUTPUT_TIMEOUT_MS = 90_000
const REFERENCE_MAX_SIDE = 1024

export type ViduEditingType = 'subject_replacement' | 'style_transfer' | 'virtual_tryon' | 'background_replacement'

interface ViduSessionResponse {
  liveId: string
  connId: string
  renderUid: string
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

// Downscales the reference to a JPEG data URI so it stays well under Vidu's 4 MB cap.
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

export function useViduSwap() {
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
  const sessionRef = useRef<{ liveId: string; connId: string; renderUid: string; sessionId: string } | null>(null)
  const seqRef = useRef(1)
  // Set synchronously so a second click during the avatar/session fetch cannot start a parallel attempt.
  const startingRef = useRef(false)
  const editingTypeRef = useRef<ViduEditingType>('subject_replacement')
  const timersRef = useRef<number[]>([])
  const elapsedTimerRef = useRef<number | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  // Apercu brut de la webcam avant le swap. AliRTC reprend la camera pendant le swap.
  const previewStreamRef = useRef<MediaStream | null>(null)
  const previewTokenRef = useRef(0)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [outputFps, setOutputFps] = useState(0)
  const [outputResolution, setOutputResolution] = useState<string | null>(null)

  const stopLocalPreview = useCallback(() => {
    previewTokenRef.current += 1
    const stream = previewStreamRef.current
    previewStreamRef.current = null
    if (!stream) return
    if (localVideoRef.current?.srcObject === stream) localVideoRef.current.srcObject = null
    stopStream(stream)
    if (!engineRef.current) setIsPreviewing(false)
  }, [])

  const startLocalPreview = useCallback(async () => {
    if (previewStreamRef.current || startingRef.current || engineRef.current) return
    const token = ++previewTokenRef.current
    setPreviewError(null)
    try {
      const stream = await openSourceCamera({ width: 1280, height: 720 })
      if (token !== previewTokenRef.current || startingRef.current || engineRef.current) {
        stopStream(stream)
        return
      }
      previewStreamRef.current = stream
      const el = localVideoRef.current
      if (el) {
        el.srcObject = stream
        el.play().catch(() => {})
      }
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (previewStreamRef.current !== stream) return
        previewStreamRef.current = null
        setIsPreviewing(false)
        setPreviewError('La webcam a été déconnectée. Rebranche-la ou choisis une autre caméra dans Paramètres > Caméra.')
      })
      setIsPreviewing(true)
    } catch (err) {
      if (token !== previewTokenRef.current) return
      console.error('[live-swap] webcam preview failed', err)
      setPreviewError(cameraErrorMessage(err))
    }
  }, [])

  // FPS et resolution mesures sur les images reellement recues (jamais de valeur fixe).
  useEffect(() => {
    const video = remoteVideoRef.current as (HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number
      cancelVideoFrameCallback?: (id: number) => void
    }) | null
    if (!isConnected || !video) {
      setOutputFps(0)
      setOutputResolution(null)
      return
    }
    let frames = 0
    let handle = 0
    const onFrame = () => {
      frames += 1
      handle = video.requestVideoFrameCallback!(onFrame)
    }
    const hasRvfc = typeof video.requestVideoFrameCallback === 'function'
    if (hasRvfc) handle = video.requestVideoFrameCallback!(onFrame)
    let lastDecoded = video.getVideoPlaybackQuality?.().totalVideoFrames ?? 0
    const interval = window.setInterval(() => {
      if (!hasRvfc) {
        const decoded = video.getVideoPlaybackQuality?.().totalVideoFrames ?? 0
        frames = decoded - lastDecoded
        lastDecoded = decoded
      }
      setOutputFps(frames)
      setOutputResolution(video.videoHeight > 0 ? `${video.videoHeight}p` : null)
      frames = 0
    }, 1000)
    return () => {
      window.clearInterval(interval)
      if (hasRvfc) video.cancelVideoFrameCallback?.(handle)
    }
  }, [isConnected])

  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t))
    timersRef.current = []
    if (elapsedTimerRef.current) {
      window.clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }
  }

  const sendSignal = useCallback((type: number, payload: Record<string, unknown>) => {
    const socket = socketRef.current
    const session = sessionRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN || !session) return false
    socket.send(JSON.stringify({ type, live_id: session.liveId, conn_id: session.connId, seq_id: seqRef.current++, payload }))
    return true
  }, [])

  const teardown = useCallback(async (reason: string) => {
    clearTimers()
    const session = sessionRef.current
    sessionRef.current = null

    // Hangup first so Vidu stops billing immediately, then release local resources.
    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN && session) {
      socket.send(JSON.stringify({
        type: 5, live_id: session.liveId, conn_id: session.connId, seq_id: seqRef.current++,
        payload: { hangup: { hangup_reason: 'user_hangup' } },
      }))
    }
    socketRef.current = null
    if (socket) {
      console.info(`[live-swap] WS CLOSE requested by client reason=${reason} live_id=${session?.liveId ?? 'none'} readyState=${socket.readyState}`)
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
      const query = new URLSearchParams({ sessionId: session.sessionId, liveId: session.liveId })
      void fetch(`/api/vidu/session?${query}`, { method: 'DELETE', keepalive: true })
        .then((r) => r.json())
        .then((d) => console.info(`[live-swap][STEP] SESSION_STOPPED reason=${reason} billed=${d?.live?.billedSeconds ?? 'unknown'}s close_reason=${d?.live?.closeReason ?? 'unknown'}`))
        .catch(() => {})
    }

    setIsPreviewing(false)
    setIsConnected(false)
    setIsConnecting(false)
    setConnectionState(reason === 'manual' ? 'idle' : reason)
  }, [])

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
      editingType?: ViduEditingType
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
    editingTypeRef.current = editingType
    setError(null)
    setIsConnecting(true)
    setConnectionState('connecting')
    setElapsedSeconds(0)
    seqRef.current = 1

    const waitForConnInitAck = (socket: WebSocket, liveId: string, sinceCreate: () => number) =>
      new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('conn_init_ack timeout')), CONN_INIT_TIMEOUT_MS)
        timersRef.current.push(timeout)
        let acked = false
        let opened = false
        let notReadyRetries = 0
        let lastSignal = 'none'
        const init = () => sendSignal(1, { conn_init: { version: 1 } })
        socket.onopen = () => {
          opened = true
          console.info(`[live-swap] WS OPEN live_id=${liveId} after=${sinceCreate()}ms`)
          mark('WS_CONNECTED')
          init()
        }
        socket.onmessage = (event) => {
          let msg: any
          try { msg = JSON.parse(event.data) } catch { return }
          lastSignal = `type=${msg?.type} ${Object.keys(msg?.payload ?? {}).join(',')}`
          const ack = msg?.payload?.conn_init_ack
          if (msg?.type === 2 && ack) {
            if (ack.success) {
              if (!acked) { acked = true; window.clearTimeout(timeout); resolve() }
            } else if (ack.error_code === 'NOT_READY') {
              setConnectionState('warming_up')
              notReadyRetries += 1
              const retry = window.setTimeout(() => {
                if (!acked && socket.readyState === WebSocket.OPEN) init()
              }, 2000)
              timersRef.current.push(retry)
            } else {
              reject(new Error(`conn_init_ack ${ack.error_code ?? 'unknown'} ${ack.error_msg ?? ''}`.trim()))
            }
          }
          if (msg?.type === 14 && msg?.payload?.switch_prompt_ack && !msg.payload.switch_prompt_ack.success) {
            setError("Impossible de changer d'avatar. Veuillez réessayer.")
          }
          if (msg?.type === 6) {
            const reason = msg?.payload?.hangup?.hangup_reason ?? 'unknown'
            if (!acked) {
              reject(new Error(`hangup before ack: ${reason}`))
              return
            }
            if (socketRef.current !== socket) return
            console.error(`[live-swap] server hangup: ${reason}`)
            setError('Session Live Swap terminée.')
            void teardown('server_hangup')
          }
        }
        socket.onclose = (event) => {
          const current = socketRef.current === socket
          console.info(`[live-swap] WS CLOSE live_id=${liveId} code=${event.code} opened=${opened} acked=${acked} current=${current} after=${sinceCreate()}ms`)
          // A socket replaced or torn down by the client must not tear down the newer session.
          if (!current && acked) return
          if (!acked) {
            reject(new Error(`ws closed ${event.code}${event.reason ? ` ${event.reason}` : ''} opened=${opened} notReady=${notReadyRetries} last=${lastSignal}`))
          } else if (sessionRef.current) void teardown('closed')
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
    let createdLiveId: string | null = null
    try {
      await loadAliRtcSdk()
      step = 'avatar'
      const image = await imageToDataUri(avatarImageUrl)
      step = 'browser_support'
      const support = await window.AliRtcEngine!.isSupported()
      if (!support.support) throw new UserFacingError(`Navigateur non compatible (${support.reason ?? 'WebRTC'}).`)

      // Permission is requested before any billed session exists, then the tracks are released
      // so AliRTC can own the camera exactly as in the official demo.
      // AliRTC opens the default Windows camera, which can be the ChapCam virtual camera
      // (video loop). We resolve the physical webcam here and force its deviceId below.
      step = 'camera'
      stopLocalPreview()
      let probe: MediaStream
      try {
        probe = await openSourceCamera({ audio: true }).catch((err) => {
          if (err instanceof CameraSourceError) throw err
          return openSourceCamera()
        })
      } catch (err) {
        throw new UserFacingError(cameraErrorMessage(err))
      }
      const sourceTrack = probe.getVideoTracks()[0]
      const sourceDeviceId = sourceTrack?.getSettings().deviceId
      console.info(`[live-swap] source webcam="${sourceTrack?.label ?? '?'}" deviceId=${sourceDeviceId ?? '?'}`)
      stopStream(probe)

      step = 'session'
      const res = await fetch('/api/vidu/session', {
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
        throw new Error(`session HTTP ${res.status}${data?.code ? ` ${data.code}` : ''}${data?.detail ? ` - ${data.detail}` : ''}`)
      }
      const session = data as ViduSessionResponse
      sessionRef.current = { liveId: session.liveId, connId: session.connId, renderUid: session.renderUid, sessionId }
      const createdAt = performance.now()
      const sinceCreate = () => Math.round(performance.now() - createdAt)
      createdLiveId = session.liveId
      console.info(`[live-swap] SESSION CREATED live_id=${session.liveId} render_uid=${session.renderUid}`)
      mark('SESSION_CREATED', `live_id=${session.liveId}`)

      // Official S2-Editing order: create -> WS (through the relay, like the Quick Start proxy)
      // -> successful conn_init_ack (re-send every 2s on NOT_READY) -> init AliRTC -> joinChannel
      // -> preview + publish -> subscribe render_uid camera.
      // Exactly one socket per session: the single-use ticket makes a retry impossible by design,
      // and any failure tears the session down below.
      step = 'signaling'
      const socket = new WebSocket(`${session.relayUrl}?${new URLSearchParams({ ticket: session.ticket })}`)
      socketRef.current = socket
      console.info(`[live-swap] WS CONNECT via relay live_id=${session.liveId} url=${session.relayUrl}`)
      await waitForConnInitAck(socket, session.liveId, sinceCreate)
      console.info(`[live-swap] CONN_INIT_ACK live_id=${session.liveId} after=${sinceCreate()}ms`)
      mark('CONN_INIT_ACK / SESSION_READY')

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
      const rtc = session.rtc as ViduSessionResponse['rtc'] & { app_id?: string; channel_id?: string }
      console.info(`[live-swap] RTC JOIN app_id=${rtc.app_id ?? '?'} channel_id=${rtc.channel_id ?? '?'} user_id=${rtc.user_id} token_len=${rtc.token?.length ?? 0}`)
      mark('RTC_JOIN_REQUESTED')
      await engine.joinChannel(rtc.token, rtc.user_id)
      setConnectionState('rtc_joined')
      console.info(`[live-swap] RTC JOINED live_id=${session.liveId} after=${sinceCreate()}ms`)
      mark('RTC_JOIN_SUCCESS')

      step = 'rtc_publish'
      if (sourceDeviceId) await callOptional(engine, 'setCameraCapturerConfiguration', { deviceId: sourceDeviceId })
      if (localVideoRef.current) await callOptional(engine, 'setLocalViewConfig', localVideoRef.current, 1)
      await callOptional(engine, 'startPreview', 1)
      const rtcTrack = (localVideoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0]
      const rtcDeviceId = typeof engine.getCurrentCameraDeviceId === 'function' ? engine.getCurrentCameraDeviceId() : rtcTrack?.getSettings().deviceId
      console.info(`[live-swap] AliRTC camera="${rtcTrack?.label ?? '?'}" deviceId=${rtcDeviceId ?? '?'}`)
      if (CHAPCAM_LABEL.test(rtcTrack?.label ?? '') || (sourceDeviceId && rtcDeviceId && rtcDeviceId !== sourceDeviceId)) {
        throw new UserFacingError("Live Swap n'a pas pu utiliser ta webcam physique (la caméra virtuelle ChapCam a été sélectionnée). Choisis ta webcam dans Paramètres > Caméra, puis relance.")
      }
      setCameraEnabled(true)
      setIsPreviewing(true)
      await callOptional(engine, 'publishLocalVideoStream', true)
      try {
        await callOptional(engine, 'publishLocalAudioStream', true)
      } catch (audioErr) {
        console.warn('[live-swap] microphone publish failed, continuing with video only', audioErr)
      }
      console.info(`[live-swap] RTC PUBLISHED live_id=${session.liveId} after=${sinceCreate()}ms`)

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
      const report = new URLSearchParams({ sessionId, failedStep: step, detail: detail.slice(0, 300) })
      if (createdLiveId) report.set('liveId', createdLiveId)
      void fetch(`/api/vidu/session?${report}`, { method: 'DELETE', keepalive: true })
        .then((r) => r.json())
        .then((d) => console.info(`[live-swap][STEP] SESSION_STOPPED billed=${d?.live?.billedSeconds ?? 'unknown'}s close_reason=${d?.live?.closeReason ?? 'unknown'}`))
        .catch(() => {})

      const denied = err instanceof DOMException && err.name === 'NotAllowedError'
      const message = err instanceof UserFacingError ? err.message : `${LIVE_SWAP_GENERIC_ERROR} (code : ${step})`
      fail(denied ? "Acces a la camera refuse. Autorise-le dans ton navigateur." : message)
    } finally {
      startingRef.current = false
    }
  }, [fail, sendSignal, teardown, stopLocalPreview])

  // Success sends no ack by design, so the switch is sent exactly once.
  const updateAvatar = useCallback(async (avatarImageUrl: string) => {
    if (!sessionRef.current) return
    const image = await imageToDataUri(avatarImageUrl)
    sendSignal(13, { switch_prompt: { editing_type: editingTypeRef.current, prompts: [{ type: 'image', content: image }] } })
  }, [sendSignal])

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
      stopLocalPreview()
      void teardown('unmount')
    }
  }, [teardown, stopLocalPreview])

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
    previewError,
    startLocalPreview,
    stopLocalPreview,
    outputFps,
    outputResolution,
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
