'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createDecartClient, models } from '@decartai/sdk'

const CAMERA_WIDTH = 1280
const CAMERA_HEIGHT = 720
const CAMERA_FPS = 30  // Augmenté pour plus de fluidité

export interface UseLucy21Options {
  onError?: (error: Error) => void
  onConnectionChange?: (state: string) => void
  onStats?: (stats: any) => void
}

export interface UseLucy21Return {
  isConnected: boolean
  isConnecting: boolean
  connectionState: string
  error: string | null
  localVideoRef: React.RefObject<HTMLVideoElement>
  remoteVideoRef: React.RefObject<HTMLVideoElement>
  connect: (avatarImageUrl: string) => Promise<void>
  disconnect: () => void
  updateAvatar: (avatarImageUrl: string) => Promise<void>
}

const MODEL = models.realtime('lucy-2.1')

export function useLucy21(options: UseLucy21Options = {}): UseLucy21Return {
  const { onError, onConnectionChange, onStats } = options

  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionState, setConnectionState] = useState('disconnected')
  const [error, setError] = useState<string | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const realtimeClientRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => disconnect()
  }, [])

  const disconnect = useCallback(() => {
    if (realtimeClientRef.current) {
      try { realtimeClientRef.current.disconnect() } catch {}
      realtimeClientRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null

    setIsConnected(false)
    setIsConnecting(false)
    setConnectionState('disconnected')
    setError(null)
  }, [])

  const connect = useCallback(async (avatarImageUrl: string) => {
    disconnect()

    setIsConnecting(true)
    setError(null)
    setConnectionState('connecting')
    onConnectionChange?.('connecting')

    try {
      // 1. Récupération du token sécurisé
      const tokenResponse = await fetch('/api/decart-token')
      if (!tokenResponse.ok) throw new Error('Failed to get token')
      
      const { token: clientToken } = await tokenResponse.json()
      if (!clientToken) throw new Error('No token received')

      // 2. Webcam avec paramètres optimisés pour fluidité
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: CAMERA_WIDTH, max: 1280 },
          height: { ideal: CAMERA_HEIGHT, max: 720 },
          frameRate: { ideal: CAMERA_FPS, max: 30 },
          facingMode: 'user',
        },
      })
      streamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // 3. Avatar
      const avatarResponse = await fetch(avatarImageUrl)
      const avatarBlob = await avatarResponse.blob()

      // 4. Client Decart
      const client = createDecartClient({ apiKey: clientToken })

      // 5. Connexion Realtime optimisée
      const realtimeClient = await client.realtime.connect(stream, {
        model: MODEL,
        mirror: 'auto',
        quality: 'high',           // ← Important pour fluidité
        latencyMode: 'low',        // ← Priorité faible latence

        onRemoteStream: (transformedStream: MediaStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = transformedStream
          }
        },
      })

      realtimeClientRef.current = realtimeClient

      // Event listeners
      realtimeClient.on('connectionChange', (state: string) => {
        setConnectionState(state)
        onConnectionChange?.(state)
        if (state === 'connected' || state === 'generating') {
          setIsConnected(true)
          setIsConnecting(false)
        }
      })

      realtimeClient.on('error', (err: any) => {
        console.error('[Lucy 2.1] Error:', err)
        setError(err.message)
        onError?.(err)
      })

      setIsConnected(true)
      setIsConnecting(false)
      setConnectionState('connected')

    } catch (err: any) {
      console.error('[Lucy 2.1] Failed:', err)
      setError(err.message || 'Connection failed')
      setIsConnecting(false)
      setConnectionState('disconnected')
      onError?.(err)
    }
  }, [disconnect, onConnectionChange, onError])

  const updateAvatar = useCallback(async (avatarImageUrl: string) => {
    if (!realtimeClientRef.current) throw new Error('Not connected')

    const avatarResponse = await fetch(avatarImageUrl)
    const avatarBlob = await avatarResponse.blob()

    await realtimeClientRef.current.set({
      image: avatarBlob,
      enhance: true,
    })
  }, [])

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
  }
}
