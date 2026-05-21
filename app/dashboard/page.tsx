'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Zap, 
  Square, 
  Loader2,
  Camera,
  Sparkles,
  Plus,
  Check,
  AlertCircle,
  Battery
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = 'https://ojmzqokffbptmcktnwdy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbXpxb2tmZmJwdG1ja3Rud2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTAzNTYsImV4cCI6MjA5NDg4NjM1Nn0.e9sk4b_15ge2LIIQwFpXC3n_q48ctu9IJ6oJxV85kgw'

const POINTS_PER_SECOND = 2

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface Avatar {
  id: string
  name: string
  image_url: string
  is_active: boolean
}

interface Subscription {
  points_remaining: number
  points_total: number
  plan: string
}

export default function DashboardPage() {
  const router = useRouter()
  
  // Refs
  const webcamVideoRef = useRef<HTMLVideoElement>(null)
  const swapCanvasRef = useRef<HTMLCanvasElement>(null)
  const processCanvasRef = useRef<HTMLCanvasElement>(null)
  
  // State
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [isActive, setIsActive] = useState(false)
  const [latency, setLatency] = useState(0)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  
  // Points state
  const [pointsRemaining, setPointsRemaining] = useState(0)
  const [pointsTotal, setPointsTotal] = useState(0)
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null)
  
  // Refs for processing
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const processingRef = useRef(false)
  const pointsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Create Supabase client
  const getSupabase = useCallback(() => {
    return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }, [])

  // Fetch subscription/points from Supabase
  const fetchSubscription = useCallback(async (uid: string) => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, points_remaining, points_total, plan')
      .eq('user_id', uid)
      .eq('is_active', true)
      .single()

    if (data) {
      setPointsRemaining(data.points_remaining || 0)
      setPointsTotal(data.points_total || 0)
      setSubscriptionId(data.id)
    }
  }, [getSupabase])

  // Update points in Supabase
  const updatePointsInDb = useCallback(async (newPoints: number) => {
    if (!subscriptionId) return
    
    const supabase = getSupabase()
    await supabase
      .from('subscriptions')
      .update({ points_remaining: newPoints })
      .eq('id', subscriptionId)
  }, [getSupabase, subscriptionId])

  // Fetch avatars from Supabase
  const fetchAvatars = useCallback(async (uid: string) => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('user_avatars')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })

    if (data && data.length > 0) {
      setAvatars(data)
      const activeAvatar = data.find((a: Avatar) => a.is_active) || data[0]
      setSelectedAvatar(activeAvatar)
    }
  }, [getSupabase])

  // Check auth and fetch data
  useEffect(() => {
    async function init() {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      setUserId(user.id)
      await Promise.all([
        fetchAvatars(user.id),
        fetchSubscription(user.id)
      ])
      setIsLoading(false)
    }
    init()
  }, [router, getSupabase, fetchAvatars, fetchSubscription])

  // Session timer + points deduction
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isActive && sessionStartTime) {
      interval = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - sessionStartTime) / 1000))
        
        // Deduct points
        setPointsRemaining(prev => {
          const newPoints = Math.max(0, prev - POINTS_PER_SECOND)
          
          // Update DB every 10 seconds to reduce API calls
          if (newPoints % 20 === 0 || newPoints === 0) {
            updatePointsInDb(newPoints)
          }
          
          // Auto-stop when points reach 0
          if (newPoints === 0) {
            handleStopSwap()
          }
          
          return newPoints
        })
      }, 1000)
    }
    
    return () => { 
      if (interval) clearInterval(interval)
    }
  }, [isActive, sessionStartTime, updatePointsInDb])

  // Select avatar
  const handleSelectAvatar = async (avatar: Avatar) => {
    setSelectedAvatar(avatar)
    
    if (userId) {
      const supabase = getSupabase()
      await supabase.from('user_avatars').update({ is_active: false }).eq('user_id', userId)
      await supabase.from('user_avatars').update({ is_active: true }).eq('id', avatar.id)
      setAvatars(prev => prev.map(a => ({ ...a, is_active: a.id === avatar.id })))
    }
  }

  // Process frame with fal.ai
  const processFrame = useCallback(async () => {
    if (!isActive || !webcamVideoRef.current || !processCanvasRef.current || !swapCanvasRef.current || processingRef.current || !selectedAvatar) {
      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(processFrame)
      }
      return
    }

    const video = webcamVideoRef.current
    if (video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(processFrame)
      return
    }

    processingRef.current = true
    const startTime = performance.now()

    try {
      const canvas = processCanvasRef.current
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        processingRef.current = false
        return
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const frameDataUrl = canvas.toDataURL('image/jpeg', 0.7)
      
      const response = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_image: frameDataUrl,
          swap_image: selectedAvatar.image_url,
        }),
      })

      const result = await response.json()
      const elapsed = Math.round(performance.now() - startTime)
      setLatency(elapsed)

      if (!response.ok) {
        setError(result.error || 'Swap failed')
      } else if (result.image_url) {
        setError(null)
        
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const swapCanvas = swapCanvasRef.current
          if (swapCanvas) {
            swapCanvas.width = canvas.width
            swapCanvas.height = canvas.height
            const swapCtx = swapCanvas.getContext('2d')
            if (swapCtx) {
              swapCtx.drawImage(img, 0, 0, canvas.width, canvas.height)
            }
          }
        }
        img.src = result.image_url
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      processingRef.current = false
      if (isActive) {
        setTimeout(() => {
          animationFrameRef.current = requestAnimationFrame(processFrame)
        }, 200)
      }
    }
  }, [isActive, selectedAvatar])

  // Start swap
  const handleStartSwap = async () => {
    if (!selectedAvatar) {
      setError('Selectionne un avatar')
      return
    }

    if (pointsRemaining <= 0) {
      setError('Plus de points! Recharge ton compte')
      return
    }

    setConnectionStatus('connecting')
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      })

      streamRef.current = stream

      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream
        await webcamVideoRef.current.play()
      }

      setIsActive(true)
      setConnectionStatus('connected')
      setSessionStartTime(Date.now())
      setSessionDuration(0)

      animationFrameRef.current = requestAnimationFrame(processFrame)

    } catch (err: any) {
      setConnectionStatus('error')
      setError('Autorise la camera dans ton navigateur')
    }
  }

  // Stop swap
  const handleStopSwap = useCallback(() => {
    setIsActive(false)
    setConnectionStatus('disconnected')

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = null
    }

    // Final points update
    updatePointsInDb(pointsRemaining)
    
    setLatency(0)
  }, [pointsRemaining, updatePointsInDb])

  const getStatusColor = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected': return 'bg-[#00ff88]'
      case 'connecting': return 'bg-yellow-500 animate-pulse'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected': return 'Connecte'
      case 'connecting': return 'Connexion...'
      case 'error': return 'Erreur'
      default: return 'Deconnecte'
    }
  }

  const pointsPercentage = pointsTotal > 0 ? (pointsRemaining / pointsTotal) * 100 : 0

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      <canvas ref={processCanvasRef} className="hidden" />
      
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <Zap className="h-7 w-7 text-[#00ff88]" />
            LIVE SWAP
          </h1>
          <p className="mt-1 text-gray-400">Camera reelle a gauche, visage swappe a droite</p>
        </div>
        
        {/* Points Display */}
        <div className="flex items-center gap-4">
          <div className="rounded-xl border border-white/10 bg-[#111] px-4 py-2">
            <div className="flex items-center gap-3">
              <Battery className="h-5 w-5 text-[#00ff88]" />
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-white">{pointsRemaining.toLocaleString()}</span>
                  <span className="text-sm text-gray-500">/{pointsTotal.toLocaleString()}</span>
                </div>
                <Progress value={pointsPercentage} className="mt-1 h-1.5 w-24 bg-white/10" />
              </div>
            </div>
          </div>
          <Link href="/dashboard/plans">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <Zap className="mr-1 h-4 w-4" /> Recharger
            </Button>
          </Link>
        </div>
      </div>

      {/* Two Videos Side by Side */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* LEFT - Real Camera */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-400" />
            <span className="font-semibold text-white">CAMERA REELLE</span>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
            <video
              ref={webcamVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            {!isActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]">
                <Camera className="mb-3 h-12 w-12 text-gray-600" />
                <p className="text-gray-500">Camera inactive</p>
              </div>
            )}
            {isActive && (
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-blue-500/80 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-medium text-white">LIVE</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT - Swapped Video */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#00ff88]" />
              <span className="font-semibold text-white">SWAP EN DIRECT</span>
            </div>
            {latency > 0 && (
              <Badge className="bg-[#00ff88]/20 text-[#00ff88]">{latency}ms</Badge>
            )}
          </div>
          <div className={`relative aspect-video overflow-hidden rounded-2xl bg-black ${isActive ? 'border-2 border-[#00ff88]/50 shadow-[0_0_30px_rgba(0,255,136,0.2)]' : 'border border-white/10'}`}>
            <canvas
              ref={swapCanvasRef}
              className="h-full w-full object-cover"
            />
            {!isActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]">
                <Sparkles className="mb-3 h-12 w-12 text-[#00ff88]/30" />
                <p className="text-gray-500">Swap inactif</p>
              </div>
            )}
            {isActive && (
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-[#00ff88]/80 px-3 py-1">
                <span className="relative flex h-2 w-2">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="h-2 w-2 rounded-full bg-white" />
                </span>
                <span className="text-xs font-bold text-black">SWAP</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#111] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${getStatusColor(connectionStatus)}`} />
          <span className="text-sm text-gray-400">{getStatusText(connectionStatus)}</span>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        <div className="flex items-center gap-4">
          {isActive && (
            <>
              <div className="text-sm">
                <span className="text-gray-400">Duree: </span>
                <span className="font-mono text-white">{formatTime(sessionDuration)}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">Cout: </span>
                <span className="font-mono text-orange-400">-{sessionDuration * POINTS_PER_SECOND} pts</span>
              </div>
            </>
          )}
          <div className="text-sm">
            <span className="text-gray-400">Avatar: </span>
            <span className="text-white">{selectedAvatar?.name || 'Aucun'}</span>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <Button
        onClick={isActive ? handleStopSwap : handleStartSwap}
        disabled={(!selectedAvatar && !isActive) || (pointsRemaining <= 0 && !isActive)}
        className={`mt-4 h-14 w-full text-lg font-bold uppercase ${
          isActive 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : connectionStatus === 'connecting'
              ? 'bg-yellow-500 text-black animate-pulse'
              : pointsRemaining <= 0
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-[#00ff88] hover:bg-[#00dd77] text-black shadow-[0_0_30px_rgba(0,255,136,0.3)]'
        }`}
      >
        {isActive ? (
          <><Square className="mr-2 h-5 w-5" /> ARRETER LE SWAP</>
        ) : connectionStatus === 'connecting' ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Connexion...</>
        ) : pointsRemaining <= 0 ? (
          <><Battery className="mr-2 h-5 w-5" /> RECHARGE NECESSAIRE</>
        ) : (
          <><Zap className="mr-2 h-5 w-5" /> DEMARRER LE SWAP</>
        )}
      </Button>

      {!selectedAvatar && pointsRemaining > 0 && (
        <p className="mt-2 text-center text-sm text-gray-500">
          Selectionne un avatar ci-dessous pour commencer
        </p>
      )}
      
      {pointsRemaining <= 0 && (
        <p className="mt-2 text-center text-sm text-orange-400">
          Tu as epuise tes points. <Link href="/dashboard/plans" className="underline">Recharge maintenant</Link>
        </p>
      )}

      {/* Avatars Section */}
      <div className="mt-8 rounded-xl border border-white/10 bg-[#111] p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">MES AVATARS</h2>
          <Link href="/dashboard/avatars">
            <Button size="sm" variant="outline" className="border-[#00ff88] text-[#00ff88] hover:bg-[#00ff88]/10">
              <Plus className="mr-1 h-4 w-4" /> Ajouter
            </Button>
          </Link>
        </div>

        {avatars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Zap className="mb-3 h-10 w-10 text-[#00ff88]/30" />
            <p className="text-gray-500 mb-4">Aucun avatar</p>
            <Link href="/dashboard/avatars">
              <Button className="bg-[#00ff88] text-black hover:bg-[#00dd77]">
                <Plus className="mr-2 h-4 w-4" /> Creer mon premier avatar
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {avatars.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => handleSelectAvatar(avatar)}
                className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                  selectedAvatar?.id === avatar.id
                    ? 'border-[#00ff88] shadow-[0_0_15px_rgba(0,255,136,0.3)]'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <img
                  src={avatar.image_url}
                  alt={avatar.name}
                  className="h-full w-full object-cover"
                />
                {selectedAvatar?.id === avatar.id && (
                  <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#00ff88]">
                    <Check className="h-3 w-3 text-black" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="truncate text-xs text-white">{avatar.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
