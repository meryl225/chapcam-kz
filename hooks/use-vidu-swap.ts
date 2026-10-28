'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { LIVE_SWAP_GENERIC_ERROR } from '@/lib/live-swap-provider'

// Only these messages are shown verbatim; any other (SDK/provider) error becomes the generic one.
class UserFacingError extends Error {}

const ALIRTC_SDK_URL = 'https://g.alicdn.com/apsara-media-box/imp-web-rtc/7.1.9/aliyun-rtc-sdk.js'
const CONN_INIT_TIMEOUT_MS = 120_000
const OUTPUT_TIMEOUT_MS = 90_000
const REFERENCE_MAX_SIDE = 1024

export type ViduEditingType = 'subject_replacement' | 'style_transfer' | 'virtual_tryon' | 'background_replacement'

interface ViduSessionResponse {
  liveId: string
  clientSecret: string
  renderUid: string
  wsUrl: string
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
  const editingTypeRef = useRef<ViduEditingType>('subject_replacement')
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
    if (socket) window.setTimeout(() => { try { socket.close() } catch {} }, 300)

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
      void fetch(`/api/vidu/session?${query}`, { method: 'DELETE', keepalive: true }).catch(() => {})
    }

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
    if (engineRef.current || socketRef.current) return
    if (options?.sourceStream) {
      setError("Live Swap fonctionne uniquement avec la caméra en direct pour l'instant.")
      return
    }
    const sessionId = options?.sessionId ?? newConnId()
    const editingType = options?.editingType ?? 'subject_replacement'
    editingTypeRef.current = editingType
    setError(null)
    setIsConnecting(true)
    setConnectionState('connecting')
    setElapsedSeconds(0)
    seqRef.current = 1

    try {
      const [image] = await Promise.all([imageToDataUri(avatarImageUrl), loadAliRtcSdk()])
      const support = await window.AliRtcEngine!.isSupported()
      if (!support.support) throw new UserFacingError(`Navigateur non compatible (${support.reason ?? 'WebRTC'}).`)

      const res = await fetch('/api/vidu/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, image, editingType }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data) throw new UserFacingError(data?.error || LIVE_SWAP_GENERIC_ERROR)
      const session = data as ViduSessionResponse
      const connId = newConnId()
      sessionRef.current = { liveId: session.liveId, connId, renderUid: session.renderUid, sessionId }

      // 1. Signalling: only the ephemeral client_secret is used, never the API key.
      const query = new URLSearchParams({ live_id: session.liveId, conn_id: connId, client_secret: session.clientSecret })
      const socket = new WebSocket(`${session.wsUrl}?${query}`)
      socketRef.current = socket

      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error(LIVE_SWAP_GENERIC_ERROR)), CONN_INIT_TIMEOUT_MS)
        timersRef.current.push(timeout)
        let acked = false
        const init = () => sendSignal(1, { conn_init: { version: 1 } })
        socket.onopen = init
        socket.onmessage = (event) => {
          let msg: any
          try { msg = JSON.parse(event.data) } catch { return }
          const ack = msg?.payload?.conn_init_ack
          if (msg?.type === 2 && ack) {
            if (ack.success) {
              if (!acked) { acked = true; window.clearTimeout(timeout); resolve() }
            } else if (ack.error_code === 'NOT_READY') {
              setConnectionState('warming_up')
            } else {
              reject(new Error(LIVE_SWAP_GENERIC_ERROR))
            }
          }
          if (msg?.type === 14 && msg?.payload?.switch_prompt_ack && !msg.payload.switch_prompt_ack.success) {
            setError("Impossible de changer d'avatar. Veuillez réessayer.")
          }
          if (msg?.type === 6) {
            setError('Session Live Swap terminée.')
            void teardown('server_hangup')
          }
        }
        socket.onclose = () => {
          if (!acked) reject(new Error(LIVE_SWAP_GENERIC_ERROR))
          else if (sessionRef.current) void teardown('closed')
        }
      })

      // 2. Media: publish the camera and render only the edited stream (render_uid).
      const engine = window.AliRtcEngine!.getInstance()
      engineRef.current = engine
      engine.on('videoSubscribeStateChanged', (userId: string, _old: number, newState: number) => {
        if (newState !== 3 || userId !== sessionRef.current?.renderUid || !remoteVideoRef.current) return
        void callOptional(engine, 'setRemoteViewConfig', remoteVideoRef.current, userId, 1)
        remoteVideoRef.current.play().catch(() => {})
        timersRef.current.forEach((t) => window.clearTimeout(t))
        timersRef.current = []
        setIsConnecting(false)
        setIsConnected(true)
        setConnectionState('connected')
        if (!elapsedTimerRef.current) {
          elapsedTimerRef.current = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
        }
      })
      engine.on('remoteUserOffLineNotify', (userId: string) => {
        if (userId === sessionRef.current?.renderUid) fail('Live Swap a été interrompu. Veuillez réessayer.')
      })
      engine.on('bye', () => fail('Connexion Live Swap perdue. Veuillez réessayer.'))
      engine.on('authInfoExpired', () => fail('Session Live Swap expirée. Veuillez réessayer.'))

      await callOptional(engine, 'setChannelProfile', 'communication')
      await callOptional(engine, 'setDefaultPublishLocalAudioStream', false)
      await callOptional(engine, 'setDefaultPublishLocalVideoStream', true)
      await callOptional(engine, 'setDefaultSubscribeAllRemoteAudioStreams', false)
      await callOptional(engine, 'setDefaultSubscribeAllRemoteVideoStreams', true)
      await engine.joinChannel(session.rtc.token, session.rtc.user_id)
      if (localVideoRef.current) await callOptional(engine, 'setLocalViewConfig', localVideoRef.current, 1)
      await callOptional(engine, 'startPreview', 1)
      await callOptional(engine, 'publishLocalVideoStream', true)
      setCameraEnabled(true)

      const noOutput = window.setTimeout(() => {
        if (!elapsedTimerRef.current) {
          options?.onNoOutput?.(sessionId)
          fail("Live Swap n'a produit aucune image. Veuillez réessayer.")
        }
      }, OUTPUT_TIMEOUT_MS)
      timersRef.current.push(noOutput)
    } catch (err) {
      console.error('[live-swap] connect failed', err)
      const message = err instanceof UserFacingError ? err.message : LIVE_SWAP_GENERIC_ERROR
      const denied = err instanceof DOMException && err.name === 'NotAllowedError'
      fail(denied ? "Acces a la camera refuse. Autorise-le dans ton navigateur." : message)
    }
  }, [fail, sendSignal, teardown])

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
