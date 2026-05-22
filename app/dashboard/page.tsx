'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { fal } from '@fal-ai/client'
import { Camera, Zap, Clock, Coins, Plus, Check, AlertCircle, Loader2, Square } from 'lucide-react'

const SUPABASE_URL = 'https://ojmzqokffbptmcktnwdy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbXpxb2tmZmJwdG1ja3Rud2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTAzNTYsImV4cCI6MjA5NDg4NjM1Nn0.e9sk4b_15ge2LIIQwFpXC3n_q48ctu9IJ6oJxV85kgw'

// Lucy 2.1 Realtime Settings - Optimized for 720p full body swap
const TARGET_FPS = 24
const CANVAS_WIDTH = 1280
const CANVAS_HEIGHT = 720
const JPEG_QUALITY = 0.85

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
  const connectionRef = useRef<any>(null)
  const frameLoopRef = useRef<number | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pointsIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFrameTimeRef = useRef<number>(0)

  // Load user data
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('points_remaining, points_total')
          .eq('user_id', user.id)
          .single()

        if (subscription) {
          setUserPoints(subscription.points_remaining || 0)
        }

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
        video: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, facingMode: 'user', frameRate: TARGET_FPS }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setCameraActive(true)
      }
      return true
    } catch (err) {
      setError("Impossible d'acceder a la camera")
      return false
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

  // Capture frame as base64
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT
    ctx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  }, [])

  // Frame send loop for Lucy 2.1 realtime
  const sendFrameLoop = useCallback(() => {
    if (!connectionRef.current || !selectedAvatar) {
      frameLoopRef.current = requestAnimationFrame(sendFrameLoop)
      return
    }

    const now = performance.now()
    const frameInterval = 1000 / TARGET_FPS

    if (now - lastFrameTimeRef.current < frameInterval) {
      frameLoopRef.current = requestAnimationFrame(sendFrameLoop)
      return
    }
    lastFrameTimeRef.current = now

    const frameData = captureFrame()
    if (frameData) {
      try {
        connectionRef.current.send({
          image: frameData,
          reference_image: selectedAvatar.url,
          // Full body + face swap optimized parameters
          prompt: "full body transformation, complete character swap, same pose and gestures, high fidelity face swap, preserve body position",
          negative_prompt: "blurry, distorted, artifacts, partial swap",
          num_inference_steps: 2,
          strength: 0.85,
          guidance_scale: 1.2,
        })
      } catch (err) {
        console.error('Error sending frame:', err)
      }
    }

    frameLoopRef.current = requestAnimationFrame(sendFrameLoop)
  }, [selectedAvatar, captureFrame])

  // Start swap with Lucy 2.1 realtime
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

    const cameraStarted = await startCamera()
    if (!cameraStarted) {
      setIsConnecting(false)
      return
    }

    // Wait for camera to be ready
    await new Promise(resolve => setTimeout(resolve, 500))

    try {
      // Connect to Lucy 2.1 realtime via fal.ai
      const connection = fal.realtime.connect('decart/lucy2-vton/realtime', {
        connectionKey: 'chapcam-lucy-session',
        throttleInterval: 0,

        onResult: (result: any) => {
          const now = performance.now()
          if (result.inference_time) {
            setLatency(Math.round(result.inference_time * 1000))
          }

          // Draw result to swap canvas
          const imageUrl = result.image?.url || result.image
          if (imageUrl && swapCanvasRef.current) {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              const ctx = swapCanvasRef.current?.getContext('2d')
              if (ctx && swapCanvasRef.current) {
                swapCanvasRef.current.width = img.width
                swapCanvasRef.current.height = img.height
                ctx.drawImage(img, 0, 0)
              }
            }
            img.src = imageUrl
          }
        },

        onError: (err: any) => {
          console.error('Lucy realtime error:', err)
          setError(err.message || 'Erreur connexion Lucy 2.1')
        },
      })

      connectionRef.current = connection
      setIsConnecting(false)
      setIsSwapping(true)

      // Start frame loop
      frameLoopRef.current = requestAnimationFrame(sendFrameLoop)

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

    } catch (err: any) {
      console.error('Failed to connect to Lucy:', err)
      setError('Impossible de se connecter a Lucy 2.1')
      setIsConnecting(false)
      stopCamera()
    }
  }

  // Stop swap
  const handleStop = async () => {
    if (frameLoopRef.current) {
      cancelAnimationFrame(frameLoopRef.current)
      frameLoopRef.current = null
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    if (pointsIntervalRef.current) {
      clearInterval(pointsIntervalRef.current)
      pointsIntervalRef.current = null
    }
    if (connectionRef.current) {
      try { connectionRef.current.close() } catch (e) {}
      connectionRef.current = null
    }

    setIsSwapping(false)
    setIsConnecting(false)
    setLatency(0)
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
          <p className="text-gray-400 text-sm">Camera reelle a gauche, full body swap par Lucy 2.1 a droite (720p, 24fps)</p>
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

      {/* Video Grid - Camera LEFT, Swap RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT - Camera reelle */}
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

        {/* RIGHT - Swap Lucy 2.1 */}
        <div className="bg-[#111] border border-[#00ff88]/30 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,255,136,0.1)]">
          <div className="bg-[#0a0a0a] px-4 py-2 flex items-center gap-2 border-b border-[#00ff88]/30">
            <Zap className="w-4 h-4 text-[#00ff88]" />
            <span className="text-white font-medium">LUCY 2.1 FULL BODY</span>
            {latency > 0 && isSwapping && (
              <span className="ml-2 text-xs text-[#00ff88] bg-[#00ff88]/10 px-2 py-1 rounded">~{latency}ms</span>
            )}
            {isSwapping && (
              <span className="ml-auto flex items-center gap-1">
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
              {isSwapping ? 'Connecte a Lucy 2.1' : isConnecting ? 'Connexion...' : 'Deconnecte'}
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
              ? 'bg-yellow-500/50 text-black cursor-wait'
              : selectedAvatar && userPoints >= 2
                ? 'bg-[#00ff88] hover:bg-[#00dd77] text-black shadow-[0_0_30px_rgba(0,255,136,0.3)]'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isSwapping ? (
          <><Square className="w-5 h-5" /> ARRETER LE SWAP</>
        ) : isConnecting ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Connexion a Lucy 2.1...</>
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
