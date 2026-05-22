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
  fps: number
  error: string | null
  outputCanvasRef: React.RefObject<HTMLCanvasElement | null>
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
  const [fps, setFps] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const outputCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const connectionRef = useRef<any>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)
  const lastSendTimeRef = useRef<number>(0)
  const pointsIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const frameCountRef = useRef<number>(0)
  const fpsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Optimized settings for 720p full body swap
  const TARGET_FPS = 24
  const FRAME_INTERVAL = 1000 / TARGET_FPS // ~41.67ms between frames
  const CANVAS_WIDTH = 1280
  const CANVAS_HEIGHT = 720
  const JPEG_QUALITY = 0.85 // Higher quality for full body detail

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
    const ctx = canvas.getContext('2d', { 
      alpha: false,
      desynchronized: true // Reduces latency
    })
    if (!ctx) return null

    // Draw video frame to canvas at 720p
    ctx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    
    // Return high quality JPEG for full body detail
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  }, [])

  const sendFrame = useCallback(async () => {
    if (!connectionRef.current || !isConnected || !referenceImageUrl) return

    const now = performance.now()
    
    // Strict FPS control
    const elapsed = now - lastSendTimeRef.current
    if (elapsed < FRAME_INTERVAL) {
      animationFrameRef.current = requestAnimationFrame(sendFrame)
      return
    }
    lastSendTimeRef.current = now

    const frameData = captureFrame()
    if (!frameData) {
      animationFrameRef.current = requestAnimationFrame(sendFrame)
      return
    }

    try {
      // Send frame to Lucy 2.1 realtime with full body swap parameters
      connectionRef.current.send({
        image: frameData,
        reference_image: referenceImageUrl,
        // Full body + face swap optimized prompt
        prompt: "full body transformation, complete character swap, same pose and gestures, high fidelity face swap, preserve body position and movement, seamless blend",
        negative_prompt: "blurry, distorted, artifacts, glitches, partial swap, face only",
        // Optimized inference settings for speed + quality
        num_inference_steps: 2, // Slightly more for better quality
        strength: 0.85, // Strong transformation
        guidance_scale: 1.2, // Balanced guidance
        // Timestamp for latency calculation
        timestamp: now,
      })
      
      frameCountRef.current++
    } catch (err) {
      console.error('[v0] Error sending frame:', err)
    }

    // Continue loop immediately
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

    // Create offscreen canvas for 720p frame capture
    canvasRef.current = document.createElement('canvas')
    canvasRef.current.width = CANVAS_WIDTH
    canvasRef.current.height = CANVAS_HEIGHT

    try {
      // Connect to Lucy 2.1 realtime via fal.ai
      const connection = fal.realtime.connect('decart/lucy2-vton/realtime', {
        connectionKey: 'lucy-fullbody-swap',
        throttleInterval: 0, // Zero throttling for minimum latency
        clientOnly: false,
        
        onResult: (result: any) => {
          const receiveTime = performance.now()
          
          // Calculate round-trip latency
          if (result.timestamp) {
            const roundTrip = Math.round(receiveTime - result.timestamp)
            setLatency(roundTrip)
          }

          // Draw result to output canvas with optimized rendering
          if (result.image && outputCanvasRef.current) {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              const ctx = outputCanvasRef.current?.getContext('2d', {
                alpha: false,
                desynchronized: true
              })
              if (ctx && outputCanvasRef.current) {
                // Match output canvas to result size
                if (outputCanvasRef.current.width !== img.width) {
                  outputCanvasRef.current.width = img.width
                  outputCanvasRef.current.height = img.height
                }
                ctx.drawImage(img, 0, 0)
              }
            }
            // Handle both URL and base64 responses
            img.src = typeof result.image === 'string' 
              ? result.image 
              : result.image.url || result.image
          }
        },

        onError: (err: any) => {
          console.error('[v0] Lucy realtime error:', err)
          setError(err.message || 'Erreur de connexion Lucy 2.1')
          setIsConnected(false)
          setIsConnecting(false)
        },
      })

      connectionRef.current = connection
      setIsConnected(true)
      setIsConnecting(false)

      // Start frame capture loop
      lastSendTimeRef.current = performance.now()
      animationFrameRef.current = requestAnimationFrame(sendFrame)

      // FPS counter
      frameCountRef.current = 0
      fpsIntervalRef.current = setInterval(() => {
        setFps(frameCountRef.current)
        frameCountRef.current = 0
      }, 1000)

      // Start points deduction (2 points per second)
      if (onPointsDeducted) {
        pointsIntervalRef.current = setInterval(() => {
          onPointsDeducted(2)
        }, 1000)
      }

    } catch (err: any) {
      console.error('[v0] Failed to connect:', err)
      setError(err.message || 'Impossible de se connecter a Lucy 2.1')
      setIsConnecting(false)
    }
  }, [referenceImageUrl, sendFrame, onPointsDeducted])

  const stopSwap = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Stop FPS counter
    if (fpsIntervalRef.current) {
      clearInterval(fpsIntervalRef.current)
      fpsIntervalRef.current = null
    }

    // Stop points deduction
    if (pointsIntervalRef.current) {
      clearInterval(pointsIntervalRef.current)
      pointsIntervalRef.current = null
    }

    // Close connection gracefully
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
    setFps(0)
  }, [])

  return {
    isConnected,
    isConnecting,
    latency,
    fps,
    error,
    outputCanvasRef,
    startSwap,
    stopSwap,
  }
}
