"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { Room, LocalVideoTrack, Track } from 'livekit-client'
import { getLiveKitClient } from '@/lib/livekit/client'
import { createAdaptiveQualityManager, QualitySettings, QualityMetrics } from '@/lib/adaptive-quality'

export type CloudSwapStatus = 'idle' | 'connecting' | 'connected' | 'processing' | 'error' | 'disconnected'
export type UserTier = 'free' | 'premium'

export interface CloudSwapConfig {
  userId: string
  userTier: UserTier
  avatarUrl: string
  onFrameProcessed?: (frame: string) => void
  onStatusChange?: (status: CloudSwapStatus) => void
  onMetricsUpdate?: (metrics: CloudSwapMetrics) => void
}

export interface CloudSwapMetrics {
  latency: number
  fps: number
  quality: QualitySettings
  gpuLoad: number
  sessionDuration: number
  framesProcessed: number
  pointsUsed: number
}

export interface CloudSwapResult {
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  status: CloudSwapStatus
  metrics: CloudSwapMetrics
  room: Room | null
  localVideoTrack: LocalVideoTrack | null
  processedStream: MediaStream | null
  error: string | null
  isProcessing: boolean
}

const TIER_LIMITS = {
  free: {
    maxDuration: 5 * 60, // 5 minutes
    maxFps: 15,
    maxResolution: '480p' as const,
    pointsPerSecond: 2,
  },
  premium: {
    maxDuration: Infinity,
    maxFps: 30,
    maxResolution: '1080p' as const,
    pointsPerSecond: 2,
  },
}

export function useCloudSwap(config: CloudSwapConfig): CloudSwapResult {
  const { userId, userTier, avatarUrl, onFrameProcessed, onStatusChange, onMetricsUpdate } = config

  const [status, setStatus] = useState<CloudSwapStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null)
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null)
  const [metrics, setMetrics] = useState<CloudSwapMetrics>({
    latency: 0,
    fps: 0,
    quality: { resolution: '720p', fps: 24, bitrate: 2000, keyFrameInterval: 48 },
    gpuLoad: 0,
    sessionDuration: 0,
    framesProcessed: 0,
    pointsUsed: 0,
  })

  const liveKitClient = useRef(getLiveKitClient())
  const qualityManager = useRef(createAdaptiveQualityManager({
    maxResolution: TIER_LIMITS[userTier].maxResolution,
    maxFps: TIER_LIMITS[userTier].maxFps,
  }))
  const sessionStartTime = useRef<number>(0)
  const frameCount = useRef(0)
  const processingInterval = useRef<NodeJS.Timeout | null>(null)
  const gpuEndpoint = useRef<string>('')

  // Update status with callback
  const updateStatus = useCallback((newStatus: CloudSwapStatus) => {
    setStatus(newStatus)
    onStatusChange?.(newStatus)
  }, [onStatusChange])

  // Update metrics
  const updateMetrics = useCallback((partialMetrics: Partial<CloudSwapMetrics>) => {
    setMetrics(prev => {
      const updated = { ...prev, ...partialMetrics }
      onMetricsUpdate?.(updated)
      return updated
    })
  }, [onMetricsUpdate])

  // Connect to cloud swap session
  const connect = useCallback(async () => {
    try {
      updateStatus('connecting')
      setError(null)

      // Get LiveKit token from API
      const tokenResponse = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userTier,
          avatarUrl,
        }),
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to get LiveKit token')
      }

      const { token, roomName, endpoint } = await tokenResponse.json()
      gpuEndpoint.current = endpoint

      // Connect to LiveKit room
      const connectedRoom = await liveKitClient.current.connect(
        {
          url: process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://chapcam.livekit.cloud',
          token,
          roomName,
        },
        {
          onConnected: () => {
            console.log('[v0] Cloud Swap: Connected to room')
            updateStatus('connected')
          },
          onDisconnected: () => {
            console.log('[v0] Cloud Swap: Disconnected')
            updateStatus('disconnected')
          },
          onError: (err) => {
            console.error('[v0] Cloud Swap Error:', err)
            setError(err.message)
            updateStatus('error')
          },
        }
      )

      setRoom(connectedRoom)

      // Enable camera
      const videoTrack = await liveKitClient.current.enableCamera(true)
      if (videoTrack) {
        setLocalVideoTrack(videoTrack)
      }

      // Start processing loop
      sessionStartTime.current = Date.now()
      startProcessingLoop()

      updateStatus('processing')
    } catch (err) {
      console.error('[v0] Cloud Swap connect error:', err)
      setError(err instanceof Error ? err.message : 'Connection failed')
      updateStatus('error')
    }
  }, [userId, userTier, avatarUrl, updateStatus])

  // Start frame processing loop
  const startProcessingLoop = useCallback(() => {
    const tierLimits = TIER_LIMITS[userTier]
    const targetInterval = 1000 / tierLimits.maxFps

    processingInterval.current = setInterval(async () => {
      // Check session duration limit for free tier
      const sessionDuration = (Date.now() - sessionStartTime.current) / 1000
      if (sessionDuration >= tierLimits.maxDuration) {
        console.log('[v0] Session duration limit reached')
        disconnect()
        return
      }

      // Process frame
      await processFrame()

      // Update metrics
      frameCount.current++
      const pointsUsed = Math.floor(sessionDuration * tierLimits.pointsPerSecond)
      
      updateMetrics({
        sessionDuration,
        framesProcessed: frameCount.current,
        pointsUsed,
        fps: frameCount.current / sessionDuration,
      })
    }, targetInterval)
  }, [userTier, updateMetrics])

  // Process a single frame through GPU cloud
  const processFrame = useCallback(async () => {
    if (!localVideoTrack || !gpuEndpoint.current) return

    const startTime = performance.now()

    try {
      // Capture frame from video track
      const videoElement = document.createElement('video')
      videoElement.srcObject = new MediaStream([localVideoTrack.mediaStreamTrack])
      await videoElement.play()

      const canvas = document.createElement('canvas')
      const quality = qualityManager.current.getCurrentQuality()
      canvas.width = quality.resolution === '1080p' ? 1920 : quality.resolution === '720p' ? 1280 : 854
      canvas.height = quality.resolution === '1080p' ? 1080 : quality.resolution === '720p' ? 720 : 480

      const ctx = canvas.getContext('2d')
      ctx?.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

      const frameData = canvas.toDataURL('image/jpeg', 0.8)

      // Send to GPU for processing
      const response = await fetch('/api/gpu/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame: frameData,
          avatarUrl,
          userId,
          quality: quality.resolution,
        }),
      })

      const latency = performance.now() - startTime

      if (response.ok) {
        const result = await response.json()
        
        // Update quality manager with metrics
        const newMetrics: QualityMetrics = {
          latency,
          fps: metrics.fps,
          gpuLoad: result.gpuLoad || 50,
          networkBandwidth: 3000, // Estimated
          packetLoss: 0,
        }
        qualityManager.current.addMetrics(newMetrics)
        
        const newQuality = qualityManager.current.calculateOptimalQuality()
        
        updateMetrics({
          latency,
          gpuLoad: result.gpuLoad || 50,
          quality: newQuality,
        })

        // Callback with processed frame
        if (result.processedFrame) {
          onFrameProcessed?.(result.processedFrame)
        }
      }

      videoElement.remove()
      canvas.remove()
    } catch (err) {
      console.error('[v0] Frame processing error:', err)
    }
  }, [localVideoTrack, avatarUrl, userId, metrics.fps, updateMetrics, onFrameProcessed])

  // Disconnect from cloud swap session
  const disconnect = useCallback(async () => {
    try {
      // Stop processing loop
      if (processingInterval.current) {
        clearInterval(processingInterval.current)
        processingInterval.current = null
      }

      // Disconnect from LiveKit
      await liveKitClient.current.disconnect()

      // Release GPU allocation
      await fetch('/api/gpu/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      setRoom(null)
      setLocalVideoTrack(null)
      setProcessedStream(null)
      updateStatus('idle')
      
      console.log('[v0] Cloud Swap: Disconnected successfully')
    } catch (err) {
      console.error('[v0] Disconnect error:', err)
    }
  }, [userId, updateStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (status === 'processing' || status === 'connected') {
        disconnect()
      }
    }
  }, [])

  return {
    connect,
    disconnect,
    status,
    metrics,
    room,
    localVideoTrack,
    processedStream,
    error,
    isProcessing: status === 'processing',
  }
}
