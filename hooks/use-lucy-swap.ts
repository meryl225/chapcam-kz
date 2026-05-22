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
  const activeRef = useRef(false)
  const realtimeClientRef = useRef<any>(null)
  const latencyIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const updateAvatar = useCallback((url: string) => {
    currentAvatarUrl.current = url
    // Update avatar in active session
    if (realtimeClientRef.current && url) {
      realtimeClientRef.current.set({
        prompt: "Transform into this person, keep all movements and expressions",
        image: url,
        enhance: true,
      }).catch(console.error)
    }
  }, [])

  const startSwap = useCallback(async () => {
    if (!currentAvatarUrl.current) {
      setError('Aucun avatar sélectionné')
      return
    }

    setIsConnecting(true)
    setConnectionStatus('connecting')
    setError(null)

    try {
      // Dynamically import Decart SDK
      const { createDecartClient, models } = await import('@decartai/sdk')

      const model = models.realtime('lucy-2.1')

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          frameRate: model.fps,
          width: model.width,
          height: model.height,
        },
      })

      streamRef.current = stream

      // Show webcam on left side
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Create Decart client
      const client = createDecartClient({
        apiKey: process.env.NEXT_PUBLIC_DECART_API_KEY || '',
      })

      // Connect to Lucy 2.1
      const realtimeClient = await client.realtime.connect(stream, {
        model,
        mirror: 'auto',
        onRemoteStream: (editedStream: MediaStream) => {
          // Show swapped video on right side
          if (outputRef.current) {
            outputRef.current.srcObject = editedStream
            outputRef.current.play().catch(console.error)
          }
        },
      })

      realtimeClientRef.current = realtimeClient

      // Set avatar as reference image
      await realtimeClient.set({
        prompt: "Transform into this person completely, maintain all movements and expressions naturally",
        image: currentAvatarUrl.current,
        enhance: true,
      })

      setIsActive(true)
      activeRef.current = true
      setIsConnecting(false)
      setConnectionStatus('connected')

      // Track latency
      let frameCount = 0
      const startTime = Date.now()
      latencyIntervalRef.current = setInterval(() => {
        frameCount++
        const elapsed = Date.now() - startTime
        setLatency(Math.round(elapsed / frameCount))
      }, 1000)

    } catch (err) {
      console.error('[Decart] Start error:', err)
      setIsConnecting(false)
      setConnectionStatus('error')

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Active la caméra dans ton navigateur')
        } else if (err.message.includes('API key')) {
          setError('Clé API Decart invalide')
        } else {
          setError(err.message)
        }
      } else {
        setError('Erreur de connexion')
      }
    }
  }, [videoRef, outputRef])

  const stopSwap = useCallback(() => {
    activeRef.current = false
    setIsActive(false)
    setConnectionStatus('disconnected')

    // Clear latency interval
    if (latencyIntervalRef.current) {
      clearInterval(latencyIntervalRef.current)
      latencyIntervalRef.current = null
    }

    // Disconnect Decart client
    if (realtimeClientRef.current) {
      try {
        realtimeClientRef.current.disconnect?.()
      } catch (e) {
        console.error('[Decart] Disconnect error:', e)
      }
      realtimeClientRef.current = null
    }

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    // Clear video elements
    if (videoRef.current) videoRef.current.srcObject = null
    if (outputRef.current) outputRef.current.srcObject = null

    setLatency(0)
  }, [videoRef, outputRef])

  useEffect(() => {
    currentAvatarUrl.current = avatarUrl
    // Update live if swap is active
    if (realtimeClientRef.current && avatarUrl && activeRef.current) {
      realtimeClientRef.current.set({
        prompt: "Transform into this person completely, maintain all movements and expressions naturally",
        image: avatarUrl,
        enhance: true,
      }).catch(console.error)
    }
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
