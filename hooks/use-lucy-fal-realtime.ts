'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { fal } from '@fal-ai/client'

interface UseLucyFalRealtimeOptions {
  referenceImageUrl: string | null
  onPointsDeducted?: (points: number) => void
}

interface UseLucyFalRealtimeReturn {
  isConnected: boolean
  isConnecting: boolean
  latency: number
  error: string | null
  outputCanvasRef: React.RefObject<HTMLCanvasElement>
  startSwap: (videoElement: HTMLVideoElement) => Promise<void>
  stopSwap: () => void
}

export function useLucyFalRealtime({
  referenceImageUrl,
  onPointsDeducted
}: UseLucyFalRealtimeOptions): UseLucyFalRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [latency, setLatency] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const outputCanvasRef = useRef<HTMLCanvasElement>(null)
  const connectionRef = useRef<any>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)
  const pointsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Optimized settings for low latency
  const TARGET_FPS = 20
  const FRAME_INTERVAL = 1000 / TARGET_FPS // ~50ms between frames
  const CANVAS_WIDTH = 640
  const CANVAS_HEIGHT = 480
  const JPEG_QUALITY = 0.7

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSwap()
    }
  }, [])

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Draw video frame to canvas (resized for performance)
    ctx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    
    // Return compressed JPEG data URL
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  }, [])

  const sendFrame = useCallback(async () => {
    if (!connectionRef.current || !isConnected || !referenceImageUrl) return

    const now = performance.now()
    
    // Throttle frames to target FPS
    if (now - lastFrameTimeRef.current < FRAME_INTERVAL) {
      animationFrameRef.current = requestAnimationFrame(sendFrame)
      return
    }
    lastFrameTimeRef.current = now

    const frameData = captureFrame()
    if (!frameData) {
      animationFrameRef.current = requestAnimationFrame(sendFrame)
      return
    }

    try {
      // Send frame to Lucy realtime
      connectionRef.current.send({
        image: frameData,
        reference_image: referenceImageUrl,
        // Low latency settings
        num_inference_steps: 1,
        strength: 0.8,
        guidance_scale: 1.0,
      })
    } catch (err) {
      console.error('[v0] Error sending frame:', err)
    }

    // Continue loop
    animationFrameRef.current = requestAnimationFrame(sendFrame)
  }, [isConnected, referenceImageUrl, captureFrame])

  const startSwap = useCallback(async (videoElement: HTMLVideoElement) => {
    if (!referenceImageUrl) {
      setError('Aucun avatar selectionne')
      return
    }

    setIsConnecting(true)
    setError(null)
    videoRef.current = videoElement

    // Create offscreen canvas for frame capture
    canvasRef.current = document.createElement('canvas')
    canvasRef.current.width = CANVAS_WIDTH
    canvasRef.current.height = CANVAS_HEIGHT

    try {
      // Connect to Lucy 2.1 realtime via fal.ai
      const connection = fal.realtime.connect('decart/lucy2-vton/realtime', {
        connectionKey: 'lucy-swap-session',
        throttleInterval: 0, // No throttling for lowest latency
        
        onResult: (result: any) => {
          const receiveTime = performance.now()
          
          // Calculate latency
          if (result.timestamp) {
            setLatency(Math.round(receiveTime - result.timestamp))
          }

          // Draw result to output canvas
          if (result.image && outputCanvasRef.current) {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              const ctx = outputCanvasRef.current?.getContext('2d')
              if (ctx && outputCanvasRef.current) {
                outputCanvasRef.current.width = img.width
                outputCanvasRef.current.height = img.height
                ctx.drawImage(img, 0, 0)
              }
            }
            img.src = result.image.url || result.image
          }
        },

        onError: (err: any) => {
          console.error('[v0] Lucy realtime error:', err)
          setError(err.message || 'Erreur de connexion Lucy')
          setIsConnected(false)
          setIsConnecting(false)
        },
      })

      connectionRef.current = connection
      setIsConnected(true)
      setIsConnecting(false)

      // Start frame capture loop
      animationFrameRef.current = requestAnimationFrame(sendFrame)

      // Start points deduction (2 points per second)
      if (onPointsDeducted) {
        pointsIntervalRef.current = setInterval(() => {
          onPointsDeducted(2)
        }, 1000)
      }

    } catch (err: any) {
      console.error('[v0] Failed to connect:', err)
      setError(err.message || 'Impossible de se connecter a Lucy')
      setIsConnecting(false)
    }
  }, [referenceImageUrl, sendFrame, onPointsDeducted])

  const stopSwap = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Stop points deduction
    if (pointsIntervalRef.current) {
      clearInterval(pointsIntervalRef.current)
      pointsIntervalRef.current = null
    }

    // Close connection
    if (connectionRef.current) {
      try {
        connectionRef.current.close()
      } catch (e) {
        // Ignore close errors
      }
      connectionRef.current = null
    }

    setIsConnected(false)
    setLatency(0)
  }, [])

  return {
    isConnected,
    isConnecting,
    latency,
    error,
    outputCanvasRef,
    startSwap,
    stopSwap,
  }
}
