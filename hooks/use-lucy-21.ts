'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createDecartClient, models } from '@decartai/sdk'

const CAMERA_WIDTH = 1280
const CAMERA_HEIGHT = 720
const CAMERA_FPS = 30

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
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null

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

    try {
      // Token
      const tokenRes = await fetch('/api/decart-token')
      const { token: clientToken } = await tokenRes.json()

      // Webcam
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: CAMERA_WIDTH }, 
          height: { ideal: CAMERA_HEIGHT }, 
          frameRate: { ideal: CAMERA_FPS } 
        }
      })
      streamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      // Avatar
      const avatarRes = await fetch(avatarImageUrl)
      const avatarBlob = await avatarRes.blob()

      const client = createDecartClient({ apiKey: clientToken })

      const realtimeClient = await client.realtime.connect(stream, {
        model: models.realtime('lucy-2.1'),
        mirror: 'auto',
        quality: 'high',
        latencyMode: 'low',
      })

      realtimeClientRef.current = realtimeClient

      // Application de l'image de référence (version corrigée)
      await realtimeClient.set({
        image: avatarBlob,
        prompt: "Full body swap. Replace the person with the one in the reference image. Keep natural movements, face, and expressions.",
        enhance: true,
      })

      realtimeClient.on('connectionChange', (state: string) => {
        setConnectionState(state)
        if (state === 'connected' || state === 'generating') {
          setIsConnected(true)
          setIsConnecting(false)
        }
      })

      realtimeClient.on('error', (e: any) => {
        console.error(e)
        setError(e.message)
      })

      setIsConnected(true)
      setIsConnecting(false)

    } catch (err: any) {
      console.error(err)
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
