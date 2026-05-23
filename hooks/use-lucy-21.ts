'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createDecartClient, models } from '@decartai/sdk'

const CAMERA_WIDTH = 1280
const CAMERA_HEIGHT = 720
const CAMERA_FPS = 30

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
      const tokenResponse = await fetch('/api/decart-token')
      if (!tokenResponse.ok) throw new Error('Token error')
      const { token: clientToken } = await tokenResponse.json()

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: CAMERA_WIDTH },
          height: { ideal: CAMERA_HEIGHT },
          frameRate: { ideal: CAMERA_FPS },
          facingMode: 'user',
        },
      })
      streamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      // === Amélioration importante : Chargement de l'image ===
      const avatarResponse = await fetch(avatarImageUrl)
      if (!avatarResponse.ok) throw new Error('Failed to load avatar')
      const avatarBlob = await avatarResponse.blob()

      const client = createDecartClient({ apiKey: clientToken })

      const realtimeClient = await client.realtime.connect(stream, {
        model: MODEL,
        mirror: 'auto',
        quality: 'high',
        latencyMode: 'low',

        onRemoteStream: (stream) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream
        },
      })

      realtimeClientRef.current = realtimeClient

      // Envoi explicite de l'image de référence
      await realtimeClient.set({
        image: avatarBlob,
        prompt: {
          text: "Transform the person in the video into the person in the reference image. Keep natural face, expressions and movements. Full body if visible.",
          enhance: true,
        }
      })

      realtimeClient.on('connectionChange', (state: string) => {
        setConnectionState(state)
        onConnectionChange?.(state)
        if (state === 'connected' || state === 'generating') {
          setIsConnected(true)
          setIsConnecting(false)
        }
      })

      realtimeClient.on('error', (err: any) => {
        console.error(err)
        setError(err.message)
        onError?.(err)
      })

      setIsConnected(true)
      setIsConnecting(false)
      setConnectionState('connected')

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to start Lucy')
      setIsConnecting(false)
      setConnectionState('disconnected')
      onError?.(err)
    }
  }, [disconnect, onConnectionChange, onError])

  const updateAvatar = useCallback(async (avatarImageUrl: string) => {
    if (!realtimeClientRef.current) throw new Error('Not connected')
    const avatarResponse = await fetch(avatarImageUrl)
    const avatarBlob = await avatarResponse.blob()
    await realtimeClientRef.current.set({ image: avatarBlob })
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
