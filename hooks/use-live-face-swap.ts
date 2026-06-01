'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ============================================================
// Hook de Face Swap temps reel (2e outil ChapCam, moteur GPU persistant).
//
// Protocole WebSocket avec le worker GPU :
//   1. A l'ouverture, on envoie un message JSON :
//        { "type": "config", "references": ["url1", ...] }
//      Le worker telecharge les photos persona et prepare le visage source.
//   2. Le worker repond { "type": "ready" } quand il est pret.
//   3. Pour chaque image : on envoie une frame binaire (JPEG).
//      Le worker renvoie une frame binaire (JPEG) deja "swappee".
//   4. En cas de souci : { "type": "error", "message": "..." }
//
// Strategie de latence : au plus `MAX_IN_FLIGHT` frames en vol a la fois
// (back-pressure) pour eviter l'accumulation de buffer et garder la latence basse.
// ============================================================

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
  references: string[] // URLs des photos persona (1 a 4)
}

interface UseLiveFaceSwapReturn {
  status: LiveStatus
  mode: LiveMode | null
  secondsRemaining: number
  fps: number
  latencyMs: number
  gpuMs: number // temps de traitement GPU (rapporte par le worker)
  networkMs: number // latence reseau estimee (total - GPU)
  queuePosition: number
  queueTotal: number
  error: string | null
  notConfigured: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  outputCanvasRef: React.RefObject<HTMLCanvasElement | null>
  start: (opts: StartOptions) => Promise<void>
  stop: () => void
}

// Reglages basse latence. Le limiteur de cadence est une FENETRE d'envoi
// adaptative (nombre de frames "en vol") qui se regle toute seule facon AIMD
// (comme un controle de congestion reseau) :
//   - si la latence reste basse -> on AGRANDIT la fenetre (on nourrit le GPU,
//     les FPS montent) ;
//   - si la latence derape    -> on REDUIT la fenetre (on protege la latence).
// C'est ce qui debloque le cas "GPU rapide mais tunnel a fort RTT" ou une
// fenetre fixe a 2 bridait les FPS a 2*1000/RTT (~16 fps sur 120ms de RTT).
const MIN_IN_FLIGHT = 2 // plancher (latence mini garantie)
const MAX_IN_FLIGHT_CAP = 10 // plafond de securite (anti-accumulation)
const LAT_GROW_MS = 220 // sous ce seuil de latence : on agrandit la fenetre
const LAT_SHRINK_MS = 420 // au-dessus : on reduit la fenetre
const CAPTURE_WIDTH = 480 // largeur d'envoi (downscale pour la vitesse)
const JPEG_QUALITY = 0.6
const TARGET_INTERVAL_MS = 12 // garde-fou anti-flood (~83 fps max, ne bride plus)
const PERF_LOG = true // logs de performance detailles en console

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
  const maxInFlightRef = useRef<number>(MIN_IN_FLIGHT) // fenetre d'envoi adaptative (AIMD)
  const sendTimesRef = useRef<number[]>([]) // FIFO des timestamps d'envoi
  const lastSendRef = useRef<number>(0)
  const recvTimesRef = useRef<number[]>([]) // timestamps de reception (pour le fps)
  const readyRef = useRef<boolean>(false)
  const stoppingRef = useRef<boolean>(false)

  // --- Instrumentation perf cote client ---
  const lastGpuMsRef = useRef<number>(0) // dernier serverMs rapporte par le worker
  const latEmaRef = useRef<number>(0) // latence totale lissee (pour l'AIMD)
  const lastAdaptRef = useRef<number>(0) // dernier ajustement de fenetre
  const perfRef = useRef({
    frames: 0,
    encodeMs: 0, // temps de toBlob (encodage JPEG navigateur)
    drawMs: 0, // temps de drawImage capture
    latency: 0, // somme des latences totales
    lastLog: 0,
  })

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

  const stop = useCallback(() => {
    if (stoppingRef.current) return
    stoppingRef.current = true
    // Battement final pour figer le compteur cote serveur
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
    stoppingRef.current = false
  }, [cleanup])

  // Boucle de capture/envoi des frames
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
                    // perf : accumuler draw + encode cote client
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

    // Latence : on associe la frame recue au plus ancien envoi (FIFO)
    const sentAt = sendTimesRef.current.shift()
    let lat = 0
    if (sentAt != null) {
      lat = performance.now() - sentAt
      latEmaRef.current = latEmaRef.current ? latEmaRef.current * 0.7 + lat * 0.3 : lat
      setLatencyMs(Math.round(latEmaRef.current))
      // Reseau estime = latence totale - temps GPU rapporte par le worker
      const net = Math.max(0, lat - lastGpuMsRef.current)
      setNetworkMs((prev) => Math.round(prev ? prev * 0.7 + net * 0.3 : net))
    }
    inFlightRef.current = Math.max(0, inFlightRef.current - 1)

    // --- AIMD : on regle la fenetre d'envoi selon la latence lissee ---
    // Objectif : maximiser les FPS (nourrir le GPU malgre le RTT du tunnel)
    // sans laisser la latence s'envoler. Ajuste au plus toutes les 500 ms.
    const tAdapt = performance.now()
    if (tAdapt - lastAdaptRef.current >= 500 && latEmaRef.current > 0) {
      const l = latEmaRef.current
      if (l < LAT_GROW_MS && maxInFlightRef.current < MAX_IN_FLIGHT_CAP) {
        maxInFlightRef.current += 1 // additive increase : on nourrit le GPU
      } else if (l > LAT_SHRINK_MS && maxInFlightRef.current > MIN_IN_FLIGHT) {
        // multiplicative decrease : on degonfle vite pour proteger la latence
        maxInFlightRef.current = Math.max(
          MIN_IN_FLIGHT,
          Math.floor(maxInFlightRef.current * 0.7),
        )
      }
      lastAdaptRef.current = tAdapt
    }

    // FPS : nombre de frames recues sur la derniere seconde
    const tnow = performance.now()
    recvTimesRef.current.push(tnow)
    recvTimesRef.current = recvTimesRef.current.filter((t) => tnow - t <= 1000)
    setFps(recvTimesRef.current.length)

    // --- Log perf periodique (toutes les ~2 s) ---
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
      stoppingRef.current = false
      setStatus('connecting')

      // 1. Demarrer la session cote serveur (credits + connexion GPU)
      let session: any
      try {
        const res = await fetch('/api/live/session', { method: 'POST' })
        session = await res.json()
        if (!res.ok) {
          setError(session?.error || 'Impossible de demarrer la session.')
          setStatus('error')
          return
        }
      } catch {
        setError('Erreur de connexion au serveur.')
        setStatus('error')
        return
      }

      setMode(session.mode)
      setSecondsRemaining(session.secondsRemaining ?? 0)

      if (session.configured === false) {
        setNotConfigured(true)
        setStatus('error')
        setError(session.message || 'Moteur Live non configure.')
        return
      }

      const gpu = session.gpu as { wsUrl: string; token: string } | undefined
      if (!gpu?.wsUrl || !gpu?.token) {
        setNotConfigured(true)
        setStatus('error')
        setError('Connexion GPU indisponible.')
        return
      }

      // 2. Acceder a la webcam
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

      // 3. Connexion WebSocket au worker GPU (on passe le mode pour la priorite de file d'attente)
      const sep = gpu.wsUrl.includes('?') ? '&' : '?'
      const url = `${gpu.wsUrl}${sep}token=${encodeURIComponent(gpu.token)}&mode=${encodeURIComponent(session.mode ?? 'trial')}`
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
        setStatus('preparing')
        ws.send(JSON.stringify({ type: 'config', references }))
      }

      ws.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          try {
            const msg = JSON.parse(ev.data)
            if (msg.type === 'queue') {
              setStatus('queued')
              setQueuePosition(typeof msg.position === 'number' ? msg.position : 0)
              setQueueTotal(typeof msg.total === 'number' ? msg.total : 0)
            } else if (msg.type === 'ready') {
              setQueuePosition(0)
              setQueueTotal(0)
              readyRef.current = true
              setStatus('running')
            } else if (msg.type === 'error') {
              setError(msg.message || 'Erreur du moteur Live.')
              setStatus('error')
              cleanup()
            } else if (msg.type === 'stats') {
              // Metriques perf rapportees par le worker GPU
              if (typeof msg.serverMs === 'number') {
                lastGpuMsRef.current = msg.serverMs
                setGpuMs(Math.round(msg.serverMs))
              }
            }
          } catch {
            /* message texte inconnu */
          }
          return
        }
        // Frame binaire swappee
        drawResult(ev.data as Blob)
      }

      ws.onerror = () => {
        if (!stoppingRef.current) {
          setError('Connexion au moteur Live perdue.')
          setStatus('error')
        }
      }

      ws.onclose = () => {
        if (!stoppingRef.current && status !== 'stopped') {
          cleanup()
          setStatus((s) => (s === 'error' ? s : 'stopped'))
        }
      }

      // 4. Lancer la boucle de capture
      rafRef.current = requestAnimationFrame(captureLoop)

      // 5. Battements serveur (decompte du temps) toutes les 5 s
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
          /* reseau instable : on retentera au prochain beat */
        }
      }, 5000)

      // 6. Decompte local fluide (affichage)
      countdownRef.current = setInterval(() => {
        setSecondsRemaining((s) => (s > 0 ? s - 1 : 0))
      }, 1000)
    },
    [captureLoop, drawResult, cleanup, stop, status],
  )

  // Nettoyage au demontage
  useEffect(() => {
    return () => cleanup()
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
    error,
    notConfigured,
    videoRef,
    outputCanvasRef,
    start,
    stop,
  }
}
