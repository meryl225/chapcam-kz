'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import * as fal from '@fal-ai/serverless-client'

// Configure fal client
fal.config({
  credentials: process.env.NEXT_PUBLIC_FAL_KEY,
})

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
  const animationFrameId = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const processingRef = useRef(false)
  const lastFrameTime = useRef(0)
  
  // Update avatar URL
  const updateAvatar = useCallback((url: string) => {
    currentAvatarUrl.current = url
  }, [])

  // Process frame with Lucy 2.1
  const processFrame = useCallback(async () => {
    if (!isActive || !videoRef.current || !outputRef.current || processingRef.current) {
      return
    }

    const video = videoRef.current
    const output = outputRef.current

    // Skip if video not ready
    if (video.readyState < 2) {
      animationFrameId.current = requestAnimationFrame(processFrame)
      return
    }

    processingRef.current = true
    const startTime = performance.now()

    try {
      // Create canvas for frame capture
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas')
      }
      const canvas = canvasRef.current
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Could not get canvas context')
      }

      // Draw current video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert to base64
      const frameDataUrl = canvas.toDataURL('image/jpeg', 0.8)

      // Call Lucy 2.1 API via fal.ai
      const result = await fal.subscribe('fal-ai/face-swap', {
        input: {
          base_image: frameDataUrl,
          swap_image: currentAvatarUrl.current,
        },
      }) as { image?: { url: string } }

      // Update latency
      const endTime = performance.now()
      setLatency(Math.round(endTime - startTime))

      // Display result
      if (result?.image?.url) {
        // Create image element and draw to output
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          if (output && isActive) {
            // Create a canvas for output
            const outputCanvas = document.createElement('canvas')
            outputCanvas.width = canvas.width
            outputCanvas.height = canvas.height
            const outputCtx = outputCanvas.getContext('2d')
            if (outputCtx) {
              outputCtx.drawImage(img, 0, 0, canvas.width, canvas.height)
              // Stream canvas to video
              const stream = outputCanvas.captureStream(30)
              if (output.srcObject !== stream) {
                output.srcObject = stream
              }
            }
          }
        }
        img.src = result.image.url
      }

    } catch (err) {
      console.error('[v0] Lucy swap error:', err)
      // Don't set error for individual frame failures, just continue
    } finally {
      processingRef.current = false
      
      // Throttle to ~15 FPS to avoid API rate limits
      const elapsed = performance.now() - lastFrameTime.current
      const delay = Math.max(0, 66 - elapsed) // ~15 FPS
      lastFrameTime.current = performance.now()
      
      if (isActive) {
        setTimeout(() => {
          animationFrameId.current = requestAnimationFrame(processFrame)
        }, delay)
      }
    }
  }, [isActive, videoRef, outputRef])

  // Start swap
  const startSwap = useCallback(async () => {
    if (!currentAvatarUrl.current) {
      setError('Aucun avatar sélectionné')
      return
    }

    setIsConnecting(true)
    setConnectionStatus('connecting')
    setError(null)

    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      })

      streamRef.current = stream

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Mirror output to show raw webcam initially
      if (outputRef.current) {
        outputRef.current.srcObject = stream
        await outputRef.current.play()
      }

      setIsActive(true)
      setIsConnecting(false)
      setConnectionStatus('connected')

      // Start processing loop
      lastFrameTime.current = performance.now()
      animationFrameId.current = requestAnimationFrame(processFrame)

    } catch (err) {
      console.error('[v0] Failed to start swap:', err)
      setIsConnecting(false)
      setConnectionStatus('error')
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Active la caméra dans ton navigateur')
        } else {
          setError(err.message)
        }
      } else {
        setError('Erreur de connexion')
      }
    }
  }, [videoRef, outputRef, processFrame])

  // Stop swap
  const stopSwap = useCallback(() => {
    setIsActive(false)
    setConnectionStatus('disconnected')

    // Cancel animation frame
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current)
      animationFrameId.current = null
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    // Clear video elements
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (outputRef.current) {
      outputRef.current.srcObject = null
    }

    setLatency(0)
  }, [videoRef, outputRef])

  // Update avatar ref when prop changes
  useEffect(() => {
    currentAvatarUrl.current = avatarUrl
  }, [avatarUrl])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
