'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createDecartClient, models } from '@decartai/sdk'

export function useLucy21() {
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

    try {
      const tokenRes = await fetch('/api/decart-token')
      const { token: clientToken } = await tokenRes.json()

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, frameRate: 30 }
      })
      streamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const avatarRes = await fetch(avatarImageUrl)
      const avatarBlob = await avatarRes.blob()

      const client = createDecartClient({ apiKey: clientToken })

      const realtimeClient = await client.realtime.connect(stream, {
        model: models.realtime('lucy-2.1'),
        mirror: 'auto',
        quality: 'high',
        latencyMode: 'low',

        onRemoteStream: (transformedStream: MediaStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = transformedStream
          }
        },
      })

      realtimeClientRef.current = realtimeClient

      await realtimeClient.set({
        image: avatarBlob,
        prompt: "Full body swap. Replace the person with the one in the reference image. Keep natural movements and expressions.",
        enhance: true,
      })

      realtimeClient.on('connectionChange', (state: string) => {
        setConnectionState(state)
        if (state === 'connected' || state === 'generating') {
          setIsConnected(true)
          setIsConnecting(false)
        }
      })

      setIsConnected(true)
      setIsConnecting(false)

    } catch (err: any) {
      console.error('[Lucy 2.1]', err)
      setError(err.message || 'Erreur de connexion')
      setIsConnecting(false)
    }
  }, [disconnect])

  return {
    isConnected,
    isConnecting,
    connectionState,
    error,
    localVideoRef,
    remoteVideoRef,
    connect,
    disconnect,
  }
}
