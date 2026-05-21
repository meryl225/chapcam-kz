'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface UseLucySwapOptions {
  avatarUrl: string
  videoRef: React.RefObject<HTMLVideoElement | null>
  outputRef: React.RefObject<HTMLVideoElement | null>
}

interface UseLucySwapReturn {
  isConnected: boolean
  isConnecting: boolean
  isActive: boolean
  latency: number
  error: string | null
  connectionStatus: ConnectionStatus
  startSwap: () => Promise<void>
  stopSwap: () => void
  updateAvatar: (url: string) => void
}

export function useLucySwap({
  avatarUrl,
  videoRef,
  outputRef,
}: UseLucySwapOptions): UseLucySwapReturn {
  const [isActive, setIsActive] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [latency, setLatency] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const currentAvatarUrl = useRef(avatarUrl)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const processingRef = useRef(false)
  const activeRef = useRef(false)
  const outputCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const updateAvatar = useCallback((url: string) => {
    currentAvatarUrl.current = url
  }, [])

  // Main swap loop
  const swapLoop = useCallback(async () => {
    while (activeRef.current) {
      if (!videoRef.current || processingRef.current) {
        await new Promise(r => setTimeout(r, 100))
        continue
      }

      const video = videoRef.current
      if (video.readyState < 2) {
        await new Promise(r => setTimeout(r, 100))
        continue
      }

      processingRef.current = true
      const startTime = performance.now()

      try {
        // Capture frame
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas')
        }
        const canvas = canvasRef.current
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480

        const ctx = canvas.getContext('2d')
        if (!ctx) { processingRef.current = false; continue }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const frameDataUrl = canvas.toDataURL('image/jpeg', 0.7)

        // Call swap API
        const response = await fetch('/api/swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base_image: frameDataUrl,
            swap_image: currentAvatarUrl.current,
          }),
        })

        if (!response.ok) {
          processingRef.current = false
          await new Promise(r => setTimeout(r, 200))
          continue
        }

        const result = await response.json()
        setLatency(Math.round(performance.now() - startTime))

        if (result.image_url && outputRef.current) {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            if (!outputRef.current || !activeRef.current) return

            if (!outputCanvasRef.current) {
              outputCanvasRef.current = document.createElement('canvas')
            }
            const outCanvas = outputCanvasRef.current
            outCanvas.width = canvas.width
            outCanvas.height = canvas.height

            const outCtx = outCanvas.getContext('2d')
            if (outCtx) {
              outCtx.drawImage(img, 0, 0, outCanvas.width, outCanvas.height)
              const stream = outCanvas.captureStream(30)
              if (outputRef.current.srcObject !== stream) {
                outputRef.current.srcObject = stream
                outputRef.current.play().catch(() => {})
              }
            }
          }
          img.src = result.image_url
        }

      } catch (err) {
        console.error('[swap] Error:', err)
      } finally {
        processingRef.current = false
      }

      // ~3 FPS pour éviter les rate limits — 1 swap toutes les 300ms
      await new Promise(r => setTimeout(r, 300))
    }
  }, [videoRef, outputRef])

  const startSwap = useCallback(async () => {
    if (!currentAvatarUrl.current) {
      setError('Aucun avatar sélectionné')
      return
    }

    setIsConnecting(true)
    setConnectionStatus('connecting')
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Show webcam on output initially
      if (outputRef.current) {
        outputRef.current.srcObject = stream
        await outputRef.current.play()
      }

      setIsActive(true)
      activeRef.current = true
      setIsConnecting(false)
      setConnectionStatus('connected')

      // Start swap loop
      swapLoop()

    } catch (err) {
      console.error('[swap] Start error:', err)
      setIsConnecting(false)
      setConnectionStatus('error')
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Active la caméra dans ton navigateur')
      } else {
        setError('Erreur de connexion caméra')
      }
    }
  }, [videoRef, outputRef, swapLoop])

  const stopSwap = useCallback(() => {
    activeRef.current = false
    setIsActive(false)
    setConnectionStatus('disconnected')

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) videoRef.current.srcObject = null
    if (outputRef.current) outputRef.current.srcObject = null

    setLatency(0)
  }, [videoRef, outputRef])

  useEffect(() => {
    currentAvatarUrl.current = avatarUrl
  }, [avatarUrl])

  useEffect(() => {
    return () => {
      activeRef.current = false
      stopSwap()
    }
  }, [stopSwap])

  return {
    isConnected: connectionStatus === 'connected',
    isConnecting,
    isActive,
    latency,
    error,
    connectionStatus,
    startSwap,
    stopSwap,
    updateAvatar,
  }
}
