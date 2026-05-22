'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createDecartClient, models } from '@decartai/sdk'

export interface UseLucy21Options {
  onError?: (error: Error) => void
  onConnectionChange?: (state: string) => void
  onStats?: (stats: any) => void
}

export interface UseLucy21Return {
  // State
  isConnected: boolean
  isConnecting: boolean
  connectionState: string
  error: string | null
  
  // Refs
  localVideoRef: React.RefObject<HTMLVideoElement>
  remoteVideoRef: React.RefObject<HTMLVideoElement>
  
  // Actions
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
  const currentAvatarRef = useRef<string | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [])

  const disconnect = useCallback(() => {
    if (realtimeClientRef.current) {
      try {
        realtimeClientRef.current.disconnect()
      } catch (e) {
        // Ignore disconnect errors
      }
      realtimeClientRef.current = null
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    
    setIsConnected(false)
    setIsConnecting(false)
    setConnectionState('disconnected')
    setError(null)
    currentAvatarRef.current = null
  }, [])

  const connect = useCallback(async (avatarImageUrl: string) => {
    // Cleanup previous connection
    disconnect()
    
    setIsConnecting(true)
    setError(null)
    setConnectionState('connecting')
    onConnectionChange?.('connecting')

    try {
      // 1. Get client token from our secure backend
      const tokenResponse = await fetch('/api/decart-session', { method: 'POST' })
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json()
        throw new Error(errorData.error || 'Failed to get Decart token')
      }
      const { apiKey } = await tokenResponse.json()

      // 2. Get user's camera stream with model's recommended settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false, // No audio for face swap
        video: {
          frameRate: { ideal: MODEL.fps },
          width: { ideal: MODEL.width },
          height: { ideal: MODEL.height },
          facingMode: 'user',
        },
      })
      streamRef.current = stream

      // Display local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // 3. Fetch the avatar image as blob
      const avatarResponse = await fetch(avatarImageUrl)
      const avatarBlob = await avatarResponse.blob()

      // 4. Create Decart client with the temporary token
      const client = createDecartClient({
        apiKey: apiKey,
      })

      // 5. Connect to Lucy 2.1 with WebRTC
      const realtimeClient = await client.realtime.connect(stream, {
        model: MODEL,
        mirror: 'auto', // Auto-mirror for front camera
        onRemoteStream: (transformedStream: MediaStream) => {
          // Display the transformed video
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = transformedStream
          }
        },
        initialState: {
          prompt: {
            text: 'Substitute the character in the video with the person in the reference image. Maintain natural expressions and movements.',
            enhance: true,
          },
          image: avatarBlob,
        },
      })

      realtimeClientRef.current = realtimeClient
      currentAvatarRef.current = avatarImageUrl

      // 6. Setup event listeners
      realtimeClient.on('connectionChange', (state: string) => {
        setConnectionState(state)
        onConnectionChange?.(state)
        
        if (state === 'connected' || state === 'generating') {
          setIsConnected(true)
          setIsConnecting(false)
        } else if (state === 'disconnected') {
          setIsConnected(false)
          setIsConnecting(false)
        } else if (state === 'reconnecting') {
          setIsConnecting(true)
        }
      })

      realtimeClient.on('error', (err: any) => {
        console.error('[Lucy 2.1] Error:', err)
        setError(err.message || 'Connection error')
        onError?.(err)
      })

      realtimeClient.on('stats', (stats: any) => {
        onStats?.(stats)
      })

      setIsConnected(true)
      setIsConnecting(false)
      setConnectionState('connected')

    } catch (err: any) {
      console.error('[Lucy 2.1] Connection failed:', err)
      setError(err.message || 'Failed to connect')
      setIsConnecting(false)
      setConnectionState('disconnected')
      onError?.(err)
      
      // Cleanup on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [disconnect, onConnectionChange, onError, onStats])

  const updateAvatar = useCallback(async (avatarImageUrl: string) => {
    if (!realtimeClientRef.current || !isConnected) {
      throw new Error('Not connected to Lucy 2.1')
    }

    try {
      // Fetch new avatar image
      const avatarResponse = await fetch(avatarImageUrl)
      const avatarBlob = await avatarResponse.blob()

      // Update the character atomically
      await realtimeClientRef.current.set({
        prompt: 'Substitute the character in the video with the person in the reference image. Maintain natural expressions and movements.',
        image: avatarBlob,
        enhance: true,
      })

      currentAvatarRef.current = avatarImageUrl
    } catch (err: any) {
      console.error('[Lucy 2.1] Failed to update avatar:', err)
      throw err
    }
  }, [isConnected])

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
