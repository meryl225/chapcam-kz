'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type LiveStatus =
  | 'idle'
  | 'connecting'
  | 'queued'
  | 'preparing'
  | 'running'
  | 'stopped'
  | 'error'

export type LiveMode = 'paid' | 'ready' | 'trial' | 'none'

interface StartOptions {
  references: string[]
}

interface UseLiveFaceSwapReturn {
  status: LiveStatus
  mode: LiveMode | null
  secondsRemaining: number
  fps: number
  latencyMs: number
  gpuMs: number
  networkMs: number
  queuePosition: number
  queueTotal: number
  saturated: boolean
  error: string | null
  notConfigured: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  outputCanvasRef: React.RefObject<HTMLCanvasElement | null>
  start: (opts: StartOptions) => Promise<void>
  stop: () => void
}

const MIN_IN_FLIGHT = 2
const MAX_IN_FLIGHT_CAP = 10
const LAT_GROW_MS = 220
const LAT_SHRINK_MS = 420
const CAPTURE_WIDTH = 480
const JPEG_QUALITY = 0.6
const TARGET_INTERVAL_MS = 12
const PERF_LOG = true
const MAX_RECONNECT = 4
const RECONNECT_DELAY_MS = 2000
const BUSY_RETRY_DELAY_MS = 4000

export function useLiveFaceSwap(): UseLiveFaceSwapReturn {
  const [status, setStatus] = useState<LiveStatus>('idle')
  const [mode, setMode] = useState<LiveMode | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [fps, setFps] = useState(0)
  const [latencyMs, setLatencyMs] = useState(0)
  const [gpuMs, setGpuMs] = useState(0)
  const [networkMs, setNetworkMs] = useState(0)
  const [queuePosition, setQueuePosition] = useState(0)
  const [queueTotal, setQueueTotal] = useState(0)
  const [saturated, setSaturated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notConfigured, setNotConfigured] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const outputCanvasRef = useRef<HTMLCanvasElement>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const inFlightRef = useRef<number>(0)
  const maxInFlightRef = useRef<number>(MIN_IN_FLIGHT)
  const sendTimesRef = useRef<number[]>([])
  const lastSendRef = useRef<number>(0)
  const recvTimesRef = useRef<number[]>([])
  const readyRef = useRef<boolean>(false)
  const stoppingRef = useRef<boolean>(false)

  const lastReferencesRef = useRef<string[]>([])
  const reconnectAttemptsRef = useRef<number>(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const secondsRemainingRef = useRef<number>(0)
  const startRef = useRef<((opts: StartOptions) => Promise<void>) | null>(null)

  const lastGpuMsRef = useRef<number>(0)
  const latEmaRef = useRef<number>(0)
  const lastAdaptRef = useRef<number>(0)
  const perfRef = useRef({
    frames: 0,
    encodeMs: 0,
    drawMs: 0,
    latency: 0,
    lastLog: 0,
  })

  useEffect(() => {
    secondsRemainingRef.current = secondsRemaining
  }, [secondsRemaining])

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    heartbeatRef.current = null
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = null
    if (wsRef.current) {
      try {
        wsRef.current.onclose = null
        wsRef.current.close()
      } catch {
        /* ignore */
      }
      wsRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    inFlightRef.current = 0
    maxInFlightRef.current = MIN_IN_FLIGHT
    sendTimesRef.current = []
    recvTimesRef.current = []
    readyRef.current = false
  }, [])

  useEffect(() => {
    startRef.current = start
  })

  const stop = useCallback(() => {
    if (stoppingRef.current) return
    stoppingRef.current = true
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    reconnectAttemptsRef.current = 0
    fetch('/api/live/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    }).catch(() => {})
    cleanup()
    setStatus('stopped')
    setFps(0)
    setLatencyMs(0)
    setQueuePosition(0)
    setQueueTotal(0)
    setSaturated(false)
    stoppingRef.current = false
  }, [cleanup])

  const captureLoop = useCallback(() => {
    const video = videoRef.current
    const ws = wsRef.current
    const canvas = captureCanvasRef.current
    if (!video || !ws || !canvas || ws.readyState !== WebSocket.OPEN || !readyRef.current) {
      rafRef.current = requestAnimationFrame(captureLoop)
      return
    }

    const now = performance.now()
    const elapsedSinceSend = now - lastSendRef.current

    if (inFlightRef.current < maxInFlightRef.current && elapsedSinceSend >= TARGET_INTERVAL_MS) {
      const vw = video.videoWidth
      const vh = video.videoHeight
      if (vw > 0 && vh > 0) {
        const scale = CAPTURE_WIDTH / vw
        canvas.width = CAPTURE_WIDTH
        canvas.height = Math.round(vh * scale)
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const tDraw0 = performance.now()
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const drawMs = performance.now() - tDraw0
          const tEnc0 = performance.now()
          canvas.toBlob(
            (blob) => {
              const encodeMs = performance.now() - tEnc0
              if (blob && wsRef.current?.readyState === WebSocket.OPEN) {
                blob.arrayBuffer().then((buf) => {
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    sendTimesRef.current.push(performance.now())
                    inFlightRef.current += 1
                    wsRef.current.send(buf)
                    perfRef.current.drawMs += drawMs
                    perfRef.current.encodeMs += encodeMs
                  }
                })
              }
            },
            'image/jpeg',
            JPEG_QUALITY,
          )
          lastSendRef.current = now
        }
      }
    }

    rafRef.current = requestAnimationFrame(captureLoop)
  }, [])

  const drawResult = useCallback(async (data: Blob) => {
    const canvas = outputCanvasRef.current
    if (!canvas) return
    try {
      const bitmap = await createImageBitmap(data)
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.drawImage(bitmap, 0, 0)
      bitmap.close()
    } catch {
      /* frame illisible : on ignore */
    }

    const sentAt = sendTimesRef.current.shift()
    let lat = 0
    if (sentAt != null) {
      lat = performance.now() - sentAt
      latEmaRef.current = latEmaRef.current ? latEmaRef.current * 0.7 + lat * 0.3 : lat
      setLatencyMs(Math.round(latEmaRef.current))
      const net = Math.max(0, lat - lastGpuMsRef.current)
      setNetworkMs((prev) => Math.round(prev ? prev * 0.7 + net * 0.3 : net))
    }
    inFlightRef.current = Math.max(0, inFlightRef.current - 1)

    const tAdapt = performance.now()
    if (tAdapt - lastAdaptRef.current >= 500 && latEmaRef.current > 0) {
      const l = latEmaRef.current
      if (l < LAT_GROW_MS && maxInFlightRef.current < MAX_IN_FLIGHT_CAP) {
        maxInFlightRef.current += 1
      } else if (l > LAT_SHRINK_MS && maxInFlightRef.current > MIN_IN_FLIGHT) {
        maxInFlightRef.current = Math.max(
          MIN_IN_FLIGHT,
          Math.floor(maxInFlightRef.current * 0.7),
        )
      }
      lastAdaptRef.current = tAdapt
    }

    const tnow = performance.now()
    recvTimesRef.current.push(tnow)
    recvTimesRef.current = recvTimesRef.current.filter((t) => tnow - t <= 1000)
    setFps(recvTimesRef.current.length)

    if (PERF_LOG) {
      const p = perfRef.current
      p.frames += 1
      p.latency += lat
      if (p.lastLog === 0) p.lastLog = tnow
      const dt = tnow - p.lastLog
      if (dt >= 2000 && p.frames > 0) {
        const fpsr = (p.frames / dt) * 1000
        const avgLat = p.latency / p.frames
        const gpu = lastGpuMsRef.current
        const net = Math.max(0, avgLat - gpu)
        console.log(
          `[v0][perf] ${fpsr.toFixed(1)} fps | latence ${avgLat.toFixed(0)}ms ` +
            `= GPU ${gpu.toFixed(0)}ms + reseau ~${net.toFixed(0)}ms | ` +
            `fenetre ${maxInFlightRef.current} en vol | ` +
            `client: draw ${(p.drawMs / p.frames).toFixed(1)}ms + encode ${(p.encodeMs / p.frames).toFixed(1)}ms`,
        )
        perfRef.current = { frames: 0, encodeMs: 0, drawMs: 0, latency: 0, lastLog: tnow }
      }
    }
  }, [])

  const start = useCallback(
    async ({ references }: StartOptions) => {
      setError(null)
      setNotConfigured(false)
      setSaturated(false)
      stoppingRef.current = false
      lastReferencesRef.current = references
      setStatus('connecting')

      // 1. Acceder a la webcam EN PREMIER.
      //    On ouvre la camera immediatement pour que l'utilisateur se voie tout
      //    de suite, independamment de l'etat du moteur GPU. Si le GPU echoue
      //    ensuite, la camera reste affichee et on montre l'erreur reelle au
      //    lieu d'un ecran noir muet.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
      } catch {
        setError('Acces a la camera refuse. Autorisez la webcam pour continuer.')
        setStatus('error')
        cleanup()
        return
      }

      if (!captureCanvasRef.current) {
        captureCanvasRef.current = document.createElement('canvas')
      }

      // 2. Demarrer la session cote serveur (verifie l'acces + le moteur GPU).
      //    La camera est deja ouverte : en cas d'echec ici, on coupe le flux
      //    proprement mais l'utilisateur a au moins vu que sa camera marchait.
      let session: any
      try {
        const res = await fetch('/api/live/session', { method: 'POST' })
        session = await res.json()
        if (!res.ok) {
          setError(session?.error || 'Impossible de demarrer la session.')
          setStatus('error')
          cleanup()
          return
        }
      } catch {
        setError('Erreur de connexion au serveur.')
        setStatus('error')
        cleanup()
        return
      }

      setMode(session.mode)
      setSecondsRemaining(session.secondsRemaining ?? 0)

      if (session.configured === false) {
        setNotConfigured(true)
        setStatus('error')
        setError(session.message || 'Moteur Live non configure (worker/tunnel GPU injoignable).')
        cleanup()
        return
      }

      const gpu = session.gpu as { wsUrl: string; token: string } | undefined
      if (!gpu?.wsUrl || !gpu?.token) {
        setNotConfigured(true)
        setStatus('error')
        setError('Connexion GPU indisponible (le tunnel ne renvoie pas d\'URL).')
        cleanup()
        return
      }

      // 3. Connexion WebSocket au worker ChapCam (server.py).
      //    IMPORTANT : le navigateur parle le protocole ChapCam au worker, PAS
      //    le protocole brut de PersonaLive. C'est le worker (server.py +
      //    bridge_personalive.py) qui telecharge la photo de reference et la
      //    transmet a PersonaLive. Le client ne fait donc AUCUN upload direct
      //    (cela provoquait une erreur CORS et etait inutile).
      //    Le worker authentifie via ?token= et attend ensuite un message
      //    {type:'config', references:[...]} (cf. server.py handle()).
      const baseUrl = gpu.wsUrl.replace(/\/+$/, '')
      const sep = baseUrl.includes('?') ? '&' : '?'
      const url = `${baseUrl}${sep}token=${encodeURIComponent(gpu.token)}&mode=${encodeURIComponent(session.mode ?? 'trial')}`

      console.log('[live] Connexion WS vers:', url)

      let ws: WebSocket
      try {
        ws = new WebSocket(url)
        ws.binaryType = 'blob'
      } catch {
        setError('Impossible d\'ouvrir la connexion temps reel.')
        setStatus('error')
        cleanup()
        return
      }
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[live] WS ouvert, envoi config...')
        setStatus('preparing')
        // Le worker (server.py) attend OBLIGATOIREMENT ce message en premier :
        // il y lit les photos de reference, les telecharge cote serveur et,
        // en mode PersonaLive, les transmet au moteur. C'est le serveur qui
        // gere la reference -> aucun upload HTTP direct cote navigateur.
        ws.send(JSON.stringify({ type: 'config', references }))
        // Marquer comme pret immediatement car PersonaLive
        // n'envoie pas forcement de message "ready"
        setTimeout(() => {
          if (!readyRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
            console.log('[live] PersonaLive: passage en mode running auto')
            readyRef.current = true
            setStatus('running')
          }
        }, 2000)
      }

      ws.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          try {
            const msg = JSON.parse(ev.data)
            if (msg.type === 'queue') {
              setStatus('queued')
              setSaturated(false)
              setQueuePosition(typeof msg.position === 'number' ? msg.position : 0)
              setQueueTotal(typeof msg.total === 'number' ? msg.total : 0)
            } else if (msg.type === 'ready') {
              setQueuePosition(0)
              setQueueTotal(0)
              setSaturated(false)
              readyRef.current = true
              reconnectAttemptsRef.current = 0
              setStatus('running')
            } else if (msg.type === 'error') {
              if (msg.code === 'busy') {
                setStatus('queued')
                setSaturated(true)
                setQueuePosition(0)
                setQueueTotal(0)
                setError(null)
                cleanup()
                if (!stoppingRef.current && lastReferencesRef.current.length > 0) {
                  reconnectTimerRef.current = setTimeout(() => {
                    startRef.current?.({ references: lastReferencesRef.current })
                  }, BUSY_RETRY_DELAY_MS)
                }
                return
              }
              setError(msg.message || 'Erreur du moteur Live.')
              setStatus('error')
              cleanup()
            } else if (msg.type === 'stats') {
              if (typeof msg.serverMs === 'number') {
                lastGpuMsRef.current = msg.serverMs
                setGpuMs(Math.round(msg.serverMs))
              }
            } else {
              // PersonaLive peut envoyer d'autres messages JSON :
              // on les logue et on considere le worker pret
              console.log('[live] Message PersonaLive:', msg)
              if (!readyRef.current) {
                readyRef.current = true
                setStatus('running')
              }
            }
          } catch {
            /* message texte inconnu */
          }
          return
        }
        // Frame binaire swappee
        if (!readyRef.current) {
          readyRef.current = true
          setStatus('running')
        }
        drawResult(ev.data as Blob)
      }

      ws.onerror = (e) => {
        console.error('[live] WS erreur:', e)
        if (!stoppingRef.current) {
          setError('Connexion au moteur Live perdue.')
          setStatus('error')
        }
      }

      ws.onclose = (e) => {
        console.log('[live] WS ferme, code:', e.code, 'raison:', e.reason)
        if (stoppingRef.current) return
        if (
          secondsRemainingRef.current > 0 &&
          reconnectAttemptsRef.current < MAX_RECONNECT &&
          lastReferencesRef.current.length > 0
        ) {
          reconnectAttemptsRef.current += 1
          cleanup()
          setStatus('connecting')
          reconnectTimerRef.current = setTimeout(() => {
            startRef.current?.({ references: lastReferencesRef.current })
          }, RECONNECT_DELAY_MS)
          return
        }
        cleanup()
        setStatus((s) => (s === 'error' ? s : 'stopped'))
      }

      // 5. Lancer la boucle de capture
      rafRef.current = requestAnimationFrame(captureLoop)

      // 6. Battements serveur toutes les 5 s
      heartbeatRef.current = setInterval(async () => {
        try {
          const res = await fetch('/api/live/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'beat' }),
          })
          const data = await res.json()
          if (typeof data.secondsRemaining === 'number') {
            setSecondsRemaining(data.secondsRemaining)
          }
          if (data.mode) setMode(data.mode)
          if (data.stop) {
            stop()
          }
        } catch {
          /* reseau instable */
        }
      }, 5000)

      // 7. Decompte local fluide
      countdownRef.current = setInterval(() => {
        setSecondsRemaining((s) => (s > 0 ? s - 1 : 0))
      }, 1000)
    },
    [captureLoop, drawResult, cleanup, stop, status],
  )

  useEffect(() => {
    return () => {
      stoppingRef.current = true
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      cleanup()
    }
  }, [cleanup])

  return {
    status,
    mode,
    secondsRemaining,
    fps,
    latencyMs,
    gpuMs,
    networkMs,
    queuePosition,
    queueTotal,
    saturated,
    error,
    notConfigured,
    videoRef,
    outputCanvasRef,
    start,
    stop,
  }
}
