'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Camera, Zap, Clock, Coins, Plus, Check, AlertCircle, Loader2, Square } from 'lucide-react'

const SUPABASE_URL = 'https://ojmzqokffbptmcktnwdy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbXpxb2tmZmJwdG1ja3Rud2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTAzNTYsImV4cCI6MjA5NDg4NjM1Nn0.e9sk4b_15ge2LIIQwFpXC3n_q48ctu9IJ6oJxV85kgw'

interface Avatar {
  id: string
  name: string
  url: string
  is_active: boolean
}

export default function DashboardPage() {
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null)
  const [isSwapping, setIsSwapping] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [duration, setDuration] = useState(0)
  const [pointsUsed, setPointsUsed] = useState(0)
  const [userPoints, setUserPoints] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [latency, setLatency] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const swapCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const swapIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pointsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load user data
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Load points from subscriptions
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('points_remaining, points_total')
          .eq('user_id', user.id)
          .single()

        if (subscription) {
          setUserPoints(subscription.points_remaining || 0)
        }

        // Load avatars
        const { data: avatarsData } = await supabase
          .from('user_avatars')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (avatarsData && avatarsData.length > 0) {
          setAvatars(avatarsData)
          const active = avatarsData.find((a: Avatar) => a.is_active)
          setSelectedAvatar(active || avatarsData[0])
        }
      } catch (err) {
        console.error('Error loading data:', err)
      }
    }
    loadData()
  }, [])

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setCameraActive(true)
      }
    } catch (err) {
      setError("Impossible d'acceder a la camera")
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  // Capture frame and send to swap API
  const captureAndSwap = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !selectedAvatar) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    ctx.drawImage(video, 0, 0)

    const frameDataUrl = canvas.toDataURL('image/jpeg', 0.7)
    const startTime = Date.now()

    try {
      const response = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceImage: frameDataUrl,
          targetImage: selectedAvatar.url,
        }),
      })

      const result = await response.json()
      setLatency(Date.now() - startTime)

      if (result.success && result.image && swapCanvasRef.current) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const swapCtx = swapCanvasRef.current?.getContext('2d')
          if (swapCtx && swapCanvasRef.current) {
            swapCanvasRef.current.width = img.width
            swapCanvasRef.current.height = img.height
            swapCtx.drawImage(img, 0, 0)
          }
        }
        img.src = result.image
      } else if (result.error) {
        console.error('Swap error:', result.error)
      }
    } catch (err) {
      console.error('Swap request error:', err)
    }
  }, [selectedAvatar])

  // Start swap
  const handleStart = async () => {
    if (!selectedAvatar) {
      setError("Selectionne un avatar d'abord")
      return
    }
    if (userPoints < 2) {
      setError('Pas assez de points. Recharge ton compte.')
      return
    }

    setError(null)
    setIsConnecting(true)
    setDuration(0)
    setPointsUsed(0)

    await startCamera()

    // Wait for camera to be ready
    await new Promise(resolve => setTimeout(resolve, 1000))

    setIsConnecting(false)
    setIsSwapping(true)

    // Start swap loop every 800ms
    swapIntervalRef.current = setInterval(captureAndSwap, 800)

    // Start duration counter
    durationIntervalRef.current = setInterval(() => {
      setDuration(prev => prev + 1)
    }, 1000)

    // Start points deduction (2 points per second)
    pointsIntervalRef.current = setInterval(() => {
      setPointsUsed(prev => prev + 2)
      setUserPoints(prev => {
        const newPoints = Math.max(0, prev - 2)
        if (newPoints === 0) {
          handleStop()
        }
        return newPoints
      })
    }, 1000)
  }

  // Stop swap
  const handleStop = async () => {
    if (swapIntervalRef.current) {
      clearInterval(swapIntervalRef.current)
      swapIntervalRef.current = null
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    if (pointsIntervalRef.current) {
      clearInterval(pointsIntervalRef.current)
      pointsIntervalRef.current = null
    }

    setIsSwapping(false)
    setIsConnecting(false)
    stopCamera()

    // Save points to Supabase
    try {
      const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('subscriptions')
          .update({ points_remaining: userPoints })
          .eq('user_id', user.id)
      }
    } catch (err) {
      console.error('Error saving points:', err)
    }
  }

  // Select avatar
  const selectAvatar = async (avatar: Avatar) => {
    setSelectedAvatar(avatar)

    try {
      const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('user_avatars').update({ is_active: false }).eq('user_id', user.id)
      await supabase.from('user_avatars').update({ is_active: true }).eq('id', avatar.id)
      setAvatars(prev => prev.map(a => ({ ...a, is_active: a.id === avatar.id })))
    } catch (err) {
      console.error('Error selecting avatar:', err)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#00ff88]" />
            LIVE SWAP
          </h1>
          <p className="text-gray-400 text-sm">Camera reelle a gauche, visage swappe a droite en temps reel</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 flex items-center gap-2">
          <Coins className="w-4 h-4 text-yellow-500" />
          <span className="text-white font-bold">{userPoints.toLocaleString()}</span>
          <span className="text-gray-400 text-sm">points</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="text-red-500">{error}</span>
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Webcam */}
        <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
          <div className="bg-[#0a0a0a] px-4 py-2 flex items-center gap-2 border-b border-[#222]">
            <Camera className="w-4 h-4 text-blue-500" />
            <span className="text-white font-medium">CAMERA REELLE</span>
            {cameraActive && (
              <span className="ml-auto flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-blue-500 text-xs">LIVE</span>
              </span>
            )}
          </div>
          <div className="aspect-video bg-[#0a0a0a] relative flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />
            {!cameraActive && (
              <div className="flex flex-col items-center justify-center text-gray-500">
                <Camera className="w-12 h-12 mb-2 opacity-50" />
                <p>Camera inactive</p>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Right - Swap Output */}
        <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
          <div className="bg-[#0a0a0a] px-4 py-2 flex items-center gap-2 border-b border-[#222]">
            <Zap className="w-4 h-4 text-[#00ff88]" />
            <span className="text-white font-medium">SWAP EN DIRECT</span>
            {latency > 0 && isSwapping && (
              <span className="ml-auto text-xs text-[#00ff88]">{latency}ms</span>
            )}
            {isSwapping && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-[#00ff88] rounded-full animate-pulse" />
                <span className="text-[#00ff88] text-xs">ACTIF</span>
              </span>
            )}
          </div>
          <div className="aspect-video bg-[#0a0a0a] relative flex items-center justify-center border-2 border-[#00ff88]/20">
            <canvas
              ref={swapCanvasRef}
              className={`w-full h-full object-contain ${isSwapping ? 'block' : 'hidden'}`}
            />
            {!isSwapping && (
              <div className="flex flex-col items-center justify-center text-gray-500">
                <Zap className="w-12 h-12 mb-2 opacity-50" />
                <p>Swap inactif</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-[#111] border border-[#222] rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isSwapping ? 'bg-[#00ff88]' : isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-gray-400 text-sm">
              {isSwapping ? 'Connecte' : isConnecting ? 'Connexion...' : 'Deconnecte'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-white">{formatDuration(duration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-white">{pointsUsed} pts utilises</span>
          </div>
        </div>
        <div className="text-gray-400 text-sm">
          Avatar actif: <span className="text-white">{selectedAvatar?.name || 'Aucun'}</span>
        </div>
      </div>

      {/* Main Button */}
      <button
        onClick={isSwapping ? handleStop : handleStart}
        disabled={(!selectedAvatar || userPoints < 2) && !isSwapping}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
          isSwapping
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : isConnecting
              ? 'bg-yellow-500/50 text-black cursor-wait animate-pulse'
              : selectedAvatar && userPoints >= 2
                ? 'bg-[#00ff88] hover:bg-[#00dd77] text-black shadow-[0_0_30px_rgba(0,255,136,0.3)]'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isSwapping ? (
          <><Square className="w-5 h-5" /> ARRETER LE SWAP</>
        ) : isConnecting ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Connexion...</>
        ) : (
          <><Zap className="w-5 h-5" /> {selectedAvatar ? 'DEMARRER LE SWAP' : 'SELECTIONNE UN AVATAR'}</>
        )}
      </button>

      {/* Avatars */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold">MES AVATARS</h2>
          <a href="/dashboard/avatars" className="flex items-center gap-1 text-[#00ff88] hover:underline text-sm">
            <Plus className="w-4 h-4" /> Ajouter
          </a>
        </div>

        {avatars.length === 0 ? (
          <div className="text-center py-12">
            <Zap className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400 mb-4">Aucun avatar</p>
            <a href="/dashboard/avatars" className="inline-flex items-center gap-2 bg-[#00ff88] hover:bg-[#00dd77] text-black px-4 py-2 rounded-lg font-medium">
              <Plus className="w-4 h-4" /> Creer mon premier avatar
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {avatars.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => selectAvatar(avatar)}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                  selectedAvatar?.id === avatar.id
                    ? 'border-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.3)]'
                    : 'border-[#333] hover:border-[#555]'
                }`}
              >
                <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                {selectedAvatar?.id === avatar.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-[#00ff88] rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-black" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-white text-xs font-medium truncate">{avatar.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
