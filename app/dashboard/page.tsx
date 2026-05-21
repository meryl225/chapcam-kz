'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Zap, 
  Check, 
  Plus, 
  Square, 
  Play,
  AlertCircle,
  Loader2,
  Monitor,
  Video,
  MessageCircle,
  Radio,
  Smartphone,
  Camera,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'

interface Avatar {
  id: string
  name: string
  url: string
  thumbnail_url?: string
  created_at: string
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// Platform icons
const platformShortcuts = [
  { id: 'obs', name: 'OBS', icon: Monitor, tooltip: 'Ajoute comme source camera virtuelle' },
  { id: 'zoom', name: 'Zoom', icon: Video, tooltip: 'Selectionne ChapCam Virtual Camera' },
  { id: 'discord', name: 'Discord', icon: MessageCircle, tooltip: 'Parametres > Voix et Video' },
  { id: 'tiktok', name: 'TikTok', icon: Radio, tooltip: 'Via OBS pour TikTok Live' },
  { id: 'whatsapp', name: 'WhatsApp', icon: Smartphone, tooltip: 'WhatsApp Web camera virtuelle' },
]

function getStatusColor(status: ConnectionStatus): string {
  switch (status) {
    case 'connected': return 'bg-[#00ff88]'
    case 'connecting': return 'bg-yellow-500 animate-pulse'
    case 'error': return 'bg-red-500'
    default: return 'bg-gray-500'
  }
}

function getStatusText(status: ConnectionStatus): string {
  switch (status) {
    case 'connected': return 'Connecte'
    case 'connecting': return 'Connexion...'
    case 'error': return 'Erreur'
    default: return 'Deconnecte'
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // Refs for videos
  const webcamVideoRef = useRef<HTMLVideoElement>(null)
  const swapVideoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // State
  const [userId, setUserId] = useState<string | null>(null)
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [isActive, setIsActive] = useState(false)
  const [latency, setLatency] = useState(0)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Refs for swap processing
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const processingRef = useRef(false)

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Load user data
  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          router.push('/auth/login')
          return
        }

        setUserId(user.id)

        // For now, use mock avatars since we don't have the table yet
        // In production, fetch from supabase
        setAvatars([])

        // Restore selected avatar from localStorage
        const savedAvatarId = localStorage.getItem('chapcam_active_avatar')
        if (savedAvatarId) {
          // Would fetch from DB
        }

      } catch (err) {
        console.error('Error loading user data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [router, supabase])

  // Session timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isActive && sessionStartTime) {
      interval = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - sessionStartTime) / 1000))
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, sessionStartTime])

  // Process frame with fal.ai Lucy
  const processFrame = useCallback(async () => {
    if (!isActive || !webcamVideoRef.current || !canvasRef.current || processingRef.current) {
      return
    }

    const video = webcamVideoRef.current
    const canvas = canvasRef.current

    if (video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(processFrame)
      return
    }

    processingRef.current = true
    const startTime = performance.now()

    try {
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const frameDataUrl = canvas.toDataURL('image/jpeg', 0.7)

      // Call fal.ai face-swap API
      const response = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_image: frameDataUrl,
          swap_image: selectedAvatar?.url,
        }),
      })

      const result = await response.json()
      
      setLatency(Math.round(performance.now() - startTime))

      if (result.image_url && swapVideoRef.current) {
        // Draw swapped image to swap canvas/video
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const swapCanvas = document.createElement('canvas')
          swapCanvas.width = canvas.width
          swapCanvas.height = canvas.height
          const swapCtx = swapCanvas.getContext('2d')
          if (swapCtx) {
            swapCtx.drawImage(img, 0, 0, canvas.width, canvas.height)
            if (swapVideoRef.current) {
              const stream = swapCanvas.captureStream(30)
              if (swapVideoRef.current.srcObject !== stream) {
                swapVideoRef.current.srcObject = stream
              }
            }
          }
        }
        img.src = result.image_url
      }

    } catch (err) {
      console.error('Swap error:', err)
    } finally {
      processingRef.current = false
      
      if (isActive) {
        setTimeout(() => {
          animationFrameRef.current = requestAnimationFrame(processFrame)
        }, 100) // ~10 FPS to avoid rate limits
      }
    }
  }, [isActive, selectedAvatar])

  // Start swap
  const handleStartSwap = useCallback(async () => {
    if (!selectedAvatar) {
      toast({ title: 'Selectionne un avatar', variant: 'destructive' })
      return
    }

    setConnectionStatus('connecting')
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      })

      streamRef.current = stream

      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream
        await webcamVideoRef.current.play()
      }

      // Initially show webcam on both sides
      if (swapVideoRef.current) {
        swapVideoRef.current.srcObject = stream
        await swapVideoRef.current.play()
      }

      setIsActive(true)
      setConnectionStatus('connected')
      setSessionStartTime(Date.now())
      setSessionDuration(0)

      // Start processing
      animationFrameRef.current = requestAnimationFrame(processFrame)

      toast({ title: 'Live Swap active!' })

    } catch (err) {
      console.error('Start error:', err)
      setConnectionStatus('error')
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Active la camera dans ton navigateur')
      } else {
        setError('Erreur de connexion camera')
      }
    }
  }, [selectedAvatar, processFrame])

  // Stop swap
  const handleStopSwap = useCallback(() => {
    setIsActive(false)
    setConnectionStatus('disconnected')

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (webcamVideoRef.current) webcamVideoRef.current.srcObject = null
    if (swapVideoRef.current) swapVideoRef.current.srcObject = null

    setLatency(0)
    toast({ title: 'Session terminee', description: `Duree: ${formatTime(sessionDuration)}` })
  }, [sessionDuration])

  // Handle avatar selection
  const handleSelectAvatar = useCallback((avatar: Avatar) => {
    setSelectedAvatar(avatar)
    localStorage.setItem('chapcam_active_avatar', avatar.id)
  }, [])

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48 bg-white/5" />
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Skeleton className="aspect-video rounded-2xl bg-white/5" />
          <Skeleton className="aspect-video rounded-2xl bg-white/5" />
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="p-6">
        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <Zap className="h-7 w-7 text-[#00ff88]" />
            LIVE SWAP
          </h1>
          <p className="mt-1 text-gray-400">
            Camera reelle a gauche, visage swappe a droite en temps reel
          </p>
        </div>

        {/* Main Layout - Two videos side by side */}
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
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#00ff88]" />
              <span className="font-semibold text-white">SWAP EN DIRECT</span>
              {latency > 0 && (
                <Badge className="ml-auto bg-[#00ff88]/20 text-[#00ff88]">{latency}ms</Badge>
              )}
            </div>
            <div className={`relative aspect-video overflow-hidden rounded-2xl bg-black ${isActive ? 'border-2 border-[#00ff88]/50 shadow-[0_0_30px_rgba(0,255,136,0.2)]' : 'border border-white/10'}`}>
              <video
                ref={swapVideoRef}
                autoPlay
                playsInline
                muted
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
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-[#111] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${getStatusColor(connectionStatus)}`} />
            <span className="text-sm text-gray-400">{getStatusText(connectionStatus)}</span>
            {error && <span className="text-sm text-red-400">{error}</span>}
          </div>
          {isActive && (
            <div className="flex items-center gap-6">
              <div className="text-sm">
                <span className="text-gray-400">Duree: </span>
                <span className="font-mono text-white">{formatTime(sessionDuration)}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">Cout: </span>
                <span className="font-mono text-[#00ff88]">{(sessionDuration * 0.02).toFixed(2)}€</span>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
          {/* CTA Button */}
          <Button
            onClick={isActive ? handleStopSwap : handleStartSwap}
            disabled={!selectedAvatar && !isActive}
            className={`h-14 text-lg font-bold uppercase ${
              isActive 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : connectionStatus === 'connecting'
                  ? 'bg-yellow-500 text-black animate-pulse'
                  : 'bg-[#00ff88] hover:bg-[#00dd77] text-black shadow-[0_0_30px_rgba(0,255,136,0.3)]'
            }`}
          >
            {isActive ? (
              <><Square className="mr-2 h-5 w-5" /> ARRETER LE SWAP</>
            ) : connectionStatus === 'connecting' ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Connexion...</>
            ) : (
              <><Zap className="mr-2 h-5 w-5" /> DEMARRER LE SWAP</>
            )}
          </Button>

          {/* Avatar Quick Select */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111] px-3">
            <span className="text-sm text-gray-400">Avatar:</span>
            {selectedAvatar ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 overflow-hidden rounded-full border border-[#00ff88]">
                  <Image src={selectedAvatar.thumbnail_url || selectedAvatar.url} alt={selectedAvatar.name} width={32} height={32} className="object-cover" />
                </div>
                <span className="text-sm text-white">{selectedAvatar.name}</span>
              </div>
            ) : (
              <Link href="/dashboard/avatars">
                <Button size="sm" variant="ghost" className="text-[#00ff88]">
                  <Plus className="mr-1 h-4 w-4" /> Choisir
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Avatars Grid */}
        <Card className="mt-6 border-white/10 bg-[#111] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">MES AVATARS</h2>
            <Link href="/dashboard/avatars">
              <Button size="sm" variant="outline" className="border-white/20 text-white">
                <Plus className="mr-1 h-4 w-4" /> Ajouter
              </Button>
            </Link>
          </div>

          {avatars.length > 0 ? (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
              {avatars.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => handleSelectAvatar(avatar)}
                  className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                    selectedAvatar?.id === avatar.id
                      ? 'border-[#00ff88] ring-2 ring-[#00ff88]/30'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <Image src={avatar.thumbnail_url || avatar.url} alt={avatar.name} fill className="object-cover" />
                  {selectedAvatar?.id === avatar.id && (
                    <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#00ff88]">
                      <Check className="h-3 w-3 text-black" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/20 py-8">
              <Zap className="mb-3 h-10 w-10 text-[#00ff88]/30" />
              <p className="text-gray-400">Aucun avatar</p>
              <Link href="/dashboard/avatars">
                <Button className="mt-3 bg-[#00ff88] text-black hover:bg-[#00dd77]">
                  <Plus className="mr-2 h-4 w-4" /> Creer mon premier avatar
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Platform Shortcuts */}
        <div className="mt-4 rounded-xl border border-white/10 bg-[#111] p-4">
          <p className="mb-3 text-sm text-gray-400">Compatible avec:</p>
          <div className="flex flex-wrap gap-4">
            {platformShortcuts.map((platform) => (
              <Tooltip key={platform.id}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                    <platform.icon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{platform.name}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-[#1a1a1a] text-white border-white/10">
                  {platform.tooltip}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
