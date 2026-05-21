'use client'

import { useEffect, useState, useRef, useCallback, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Zap, 
  Square, 
  Loader2,
  Camera,
  Sparkles,
  Upload,
  X,
  Image as ImageIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

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
  
  // Refs
  const webcamVideoRef = useRef<HTMLVideoElement>(null)
  const swapCanvasRef = useRef<HTMLCanvasElement>(null)
  const processCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // State
  const [avatarImage, setAvatarImage] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [isActive, setIsActive] = useState(false)
  const [latency, setLatency] = useState(0)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Refs for processing
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const processingRef = useRef(false)

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Check auth
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      // Load saved avatar from localStorage
      const savedAvatar = localStorage.getItem('chapcam_avatar')
      if (savedAvatar) {
        setAvatarImage(savedAvatar)
      }
      setIsLoading(false)
    }
    checkAuth()
  }, [router, supabase])

  // Session timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isActive && sessionStartTime) {
      interval = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - sessionStartTime) / 1000))
      }, 1000)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [isActive, sessionStartTime])

  // Handle avatar upload
  const handleAvatarUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Fichier invalide', description: 'Choisis une image', variant: 'destructive' })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setAvatarImage(dataUrl)
      localStorage.setItem('chapcam_avatar', dataUrl)
      toast({ title: 'Avatar charge!' })
    }
    reader.readAsDataURL(file)
  }

  // Remove avatar
  const handleRemoveAvatar = () => {
    setAvatarImage(null)
    localStorage.removeItem('chapcam_avatar')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Process frame with fal.ai
  const processFrame = useCallback(async () => {
    if (!isActive || !webcamVideoRef.current || !processCanvasRef.current || !swapCanvasRef.current || processingRef.current || !avatarImage) {
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
      if (!ctx) return

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const frameDataUrl = canvas.toDataURL('image/jpeg', 0.7)

      // Call swap API
      const response = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_image: frameDataUrl,
          swap_image: avatarImage,
        }),
      })

      const result = await response.json()
      setLatency(Math.round(performance.now() - startTime))

      if (result.image_url) {
        // Draw swapped result
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

    } catch (err) {
      console.error('[v0] Swap error:', err)
    } finally {
      processingRef.current = false
      if (isActive) {
        setTimeout(() => {
          animationFrameRef.current = requestAnimationFrame(processFrame)
        }, 150) // ~7 FPS
      }
    }
  }, [isActive, avatarImage])

  // Start swap
  const handleStartSwap = async () => {
    if (!avatarImage) {
      toast({ title: 'Charge un avatar', description: 'Clique sur "Charger une photo"', variant: 'destructive' })
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
      toast({ title: 'Live Swap actif!' })

    } catch (err) {
      console.error('[v0] Camera error:', err)
      setConnectionStatus('error')
      setError('Autorise la camera dans ton navigateur')
    }
  }

  // Stop swap
  const handleStopSwap = () => {
    setIsActive(false)
    setConnectionStatus('disconnected')

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (webcamVideoRef.current) webcamVideoRef.current.srcObject = null

    setLatency(0)
    toast({ title: 'Session terminee', description: `Duree: ${formatTime(sessionDuration)}` })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Hidden canvases */}
      <canvas ref={processCanvasRef} className="hidden" />
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
          <Zap className="h-7 w-7 text-[#00ff88]" />
          LIVE SWAP
        </h1>
        <p className="mt-1 text-gray-400">Camera reelle a gauche, swap en direct a droite</p>
      </div>

      {/* Avatar Upload */}
      <div className="mb-6 flex items-center gap-4 rounded-xl border border-white/10 bg-[#111] p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          className="hidden"
        />
        
        {avatarImage ? (
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-xl border-2 border-[#00ff88]">
              <img src={avatarImage} alt="Avatar" className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="font-medium text-white">Avatar charge</p>
              <p className="text-sm text-gray-400">Pret pour le swap</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveAvatar}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <X className="mr-1 h-4 w-4" /> Supprimer
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-[#00ff88] text-black hover:bg-[#00dd77]"
          >
            <Upload className="mr-2 h-4 w-4" /> Charger une photo
          </Button>
        )}
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
          </div>
        )}
      </div>

      {/* CTA Button */}
      <Button
        onClick={isActive ? handleStopSwap : handleStartSwap}
        disabled={!avatarImage && !isActive}
        className={`mt-4 h-14 w-full text-lg font-bold uppercase ${
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

      {!avatarImage && (
        <p className="mt-2 text-center text-sm text-gray-500">
          Charge une photo pour commencer le swap
        </p>
      )}
    </div>
  )
}
