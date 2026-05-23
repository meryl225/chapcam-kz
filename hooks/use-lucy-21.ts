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
      // 1. Token
      const tokenRes = await fetch('/api/decart-token')
      const { token: clientToken } = await tokenRes.json()

      // 2. Webcam
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: CAMERA_WIDTH }, 
          height: { ideal: CAMERA_HEIGHT }, 
          frameRate: { ideal: CAMERA_FPS } 
        }
      })
      streamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      // 3. Avatar
      const avatarRes = await fetch(avatarImageUrl)
      const avatarBlob = await avatarRes.blob()

      const client = createDecartClient({ apiKey: clientToken })

      // 4. Connexion Realtime
      const realtimeClient = await client.realtime.connect(stream, {
        model: models.realtime('lucy-2.1'),
        mirror: 'auto',
        quality: 'high',
        latencyMode: 'low',

        // IMPORTANT : onRemoteStream doit être une fonction directe
        onRemoteStream: (transformedStream: MediaStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = transformedStream
          }
        },
      })

      realtimeClientRef.current = realtimeClient

      // 5. Appliquer l'image de référence
      await realtimeClient.set({
        image: avatarBlob,
        prompt: "Full body swap. Replace the person with the one in the reference image. Keep natural movements, face and expressions.",
        enhance: true,
      })

      // Events
      realtimeClient.on('connectionChange', (state: string) => {
        setConnectionState(state)
        if (state === 'connected' || state === 'generating') {
          setIsConnected(true)
          setIsConnecting(false)
