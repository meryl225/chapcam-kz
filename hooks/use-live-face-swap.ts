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
  queuePosition: number
  queueTotal: number
  error: string | null
  notConfigured: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  outputCanvasRef: React.RefObject<HTMLCanvasElement | null>
  start: (opts: StartOptions) => Promise<void>
  stop: () => void
}

const MAX_IN_FLIGHT = 2
const CAPTURE_WIDTH = 480 // largeur d'envoi (downscale pour la vitesse)
const JPEG_QUALITY = 0.6
const TARGET_INTERVAL_MS = 60 // ~16 fps max cote envoi (limite par la latence reseau/GPU)

export function useLiveFaceSwap(): UseLiveFaceSwapReturn {
  const [status, setStatus] = useState<LiveStatus>('idle')
  const [mode, setMode] = useState<LiveMode | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [fps, setFps] = useState(0)
  const [latencyMs, setLatencyMs] = useState(0)
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
  const sendTimesRef = useRef<number[]>([]) // FIFO des timestamps d'envoi
  const lastSendRef = useRef<number>(0)
  const recvTimesRef = useRef<number[]>([]) // timestamps de reception (pour le fps)
  const readyRef = useRef<boolean>(false)
  const stoppingRef = useRef<boolean>(false)

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

    if (inFlightRef.current < MAX_IN_FLIGHT && elapsedSinceSend >= TARGET_INTERVAL_MS) {
      const vw = video.videoWidth
      const vh = video.videoHeight
      if (vw > 0 && vh > 0) {
        const scale = CAPTURE_WIDTH / vw
        canvas.width = CAPTURE_WIDTH
        canvas.height = Math.round(vh * scale)
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          canvas.toBlob(
            (blob) => {
              if (blob && wsRef.current?.readyState === WebSocket.OPEN) {
                blob.arrayBuffer().then((buf) => {
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    sendTimesRef.current.push(performance.now())
                    inFlightRef.current += 1
                    wsRef.current.send(buf)
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
    if (sentAt != null) {
      const lat = performance.now() - sentAt
      setLatencyMs((prev) => Math.round(prev ? prev * 0.7 + lat * 0.3 : lat))
    }
    inFlightRef.current = Math.max(0, inFlightRef.current - 1)

    // FPS : nombre de frames recues sur la derniere seconde
    const tnow = performance.now()
    recvTimesRef.current.push(tnow)
    recvTimesRef.current = recvTimesRef.current.filter((t) => tnow - t <= 1000)
    setFps(recvTimesRef.current.length)
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
