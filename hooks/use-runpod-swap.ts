"use client"

import { useState, useCallback, useRef, useEffect } from 'react'

export type SwapStatus = 'idle' | 'connecting' | 'processing' | 'error'

export interface UseRunPodSwapConfig {
  userId: string
  avatarImageBase64: string
  onFrameProcessed?: (frame: string) => void
  onStatusChange?: (status: SwapStatus) => void
  onPointsUpdate?: (pointsUsed: number, pointsRemaining: number) => void
}

export interface SwapMetrics {
  fps: number
  latency: number
  framesProcessed: number
  pointsUsed: number
  pointsRemaining: number
  sessionDuration: number
}

export function useRunPodSwap(config: UseRunPodSwapConfig) {
  const { userId, avatarImageBase64, onFrameProcessed, onStatusChange, onPointsUpdate } = config

  const [status, setStatus] = useState<SwapStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<SwapMetrics>({
    fps: 0,
    latency: 0,
    framesProcessed: 0,
    pointsUsed: 0,
    pointsRemaining: 0,
    sessionDuration: 0,
  })

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processingRef = useRef(false)
  const sessionStartRef = useRef<number>(0)
  const frameCountRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)

  const updateStatus = useCallback((newStatus: SwapStatus) => {
    setStatus(newStatus)
    onStatusChange?.(newStatus)
  }, [onStatusChange])

  // Start camera and processing
  const start = useCallback(async () => {
    try {
      updateStatus('connecting')
      setError(null)

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      })

      streamRef.current = stream

      // Create hidden video element
      const video = document.createElement('video')
      video.srcObject = stream
      video.playsInline = true
      video.muted = true
      await video.play()
      videoRef.current = video

      // Create canvas for frame capture
      const canvas = document.createElement('canvas')
      canvas.width = 1280
      canvas.height = 720
      canvasRef.current = canvas

      sessionStartRef.current = Date.now()
      processingRef.current = true
      updateStatus('processing')

      // Start processing loop
      processFrameLoop()

    } catch (err) {
      console.error('[v0] Camera/Processing error:', err)
      setError(err instanceof Error ? err.message : 'Erreur camera')
      updateStatus('error')
    }
  }, [updateStatus])

  // Process frames in a loop
  const processFrameLoop = useCallback(async () => {
    if (!processingRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) {
      animationFrameRef.current = requestAnimationFrame(processFrameLoop)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Capture frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const frameBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]

    const startTime = performance.now()

    try {
      // Send to RunPod API
      const response = await fetch('/api/faceswap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_image: avatarImageBase64,
          target_image: frameBase64,
          mode: 'sync',
        }),
      })

      const latency = performance.now() - startTime

      if (response.ok) {
        const result = await response.json()
        
        if (result.output_image) {
          onFrameProcessed?.(`data:image/jpeg;base64,${result.output_image}`)
        }

        frameCountRef.current++
        const sessionDuration = (Date.now() - sessionStartRef.current) / 1000

        setMetrics(prev => {
          const updated = {
            ...prev,
            fps: frameCountRef.current / sessionDuration,
            latency,
            framesProcessed: frameCountRef.current,
            pointsRemaining: result.points_remaining,
            pointsUsed: prev.pointsUsed + 2, // 2 points per frame
            sessionDuration,
          }
          return updated
        })

        if (result.points_remaining !== undefined) {
          onPointsUpdate?.(2, result.points_remaining)
        }
      } else {
        const errorData = await response.json()
        
        // Check if out of points
        if (response.status === 402) {
          setError('Points insuffisants')
          stop()
          return
        }
        
        console.error('[v0] API error:', errorData)
      }
    } catch (err) {
      console.error('[v0] Processing error:', err)
    }

    // Continue loop if still processing
    if (processingRef.current) {
      // Throttle to ~10 FPS for API calls (100ms between frames)
      setTimeout(() => {
        animationFrameRef.current = requestAnimationFrame(processFrameLoop)
      }, 100)
    }
  }, [avatarImageBase64, onFrameProcessed, onPointsUpdate])

  // Stop processing
  const stop = useCallback(() => {
    processingRef.current = false

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current = null
    }

    updateStatus('idle')
  }, [updateStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    start,
    stop,
    status,
    error,
    metrics,
    isProcessing: status === 'processing',
  }
}
