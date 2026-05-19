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
  Wifi,
  WifiOff,
  AlertCircle,
  Loader2,
  Monitor,
  Video,
  MessageCircle,
  Radio,
  Smartphone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { useLucySwap, type ConnectionStatus } from '@/hooks/use-lucy-swap'
import { toast } from '@/hooks/use-toast'

interface Avatar {
  id: string
  name: string
  url: string
  thumbnail_url?: string
  created_at: string
}

interface Subscription {
  plan: string
  is_active: boolean
  expires_at: string | null
}

// Platform icons with tooltips
const platformShortcuts = [
  { 
    id: 'obs', 
    name: 'OBS Studio', 
    icon: Monitor,
    tooltip: 'Ajoute ChapCam comme source de caméra virtuelle dans OBS'
  },
  { 
    id: 'zoom', 
    name: 'Zoom', 
    icon: Video,
    tooltip: 'Sélectionne "ChapCam Virtual Camera" dans les paramètres vidéo Zoom'
  },
  { 
    id: 'discord', 
    name: 'Discord', 
    icon: MessageCircle,
    tooltip: 'Active ChapCam dans Paramètres > Voix et Vidéo > Caméra'
  },
  { 
    id: 'tiktok', 
    name: 'TikTok Live', 
    icon: Radio,
    tooltip: 'Utilise OBS avec ChapCam pour streamer sur TikTok Live'
  },
  { 
    id: 'whatsapp', 
    name: 'WhatsApp', 
    icon: Smartphone,
    tooltip: 'Fonctionne avec WhatsApp Web en sélectionnant la caméra virtuelle'
  },
]

function getStatusColor(status: ConnectionStatus): string {
  switch (status) {
    case 'connected': return 'bg-[#00ff88]'
    case 'connecting': return 'bg-yellow-500'
    case 'error': return 'bg-red-500'
    default: return 'bg-gray-500'
  }
}

function getStatusText(status: ConnectionStatus): string {
  switch (status) {
    case 'connected': return 'Connecté'
    case 'connecting': return 'Connexion...'
    case 'error': return 'Erreur'
    default: return 'Déconnecté'
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // Refs
  const webcamVideoRef = useRef<HTMLVideoElement>(null)
  const outputVideoRef = useRef<HTMLVideoElement>(null)
  
  // State
  const [userId, setUserId] = useState<string | null>(null)
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  
  // Lucy Swap hook
  const {
    isConnected,
    isConnecting,
    isActive,
    latency,
    error,
    connectionStatus,
    startSwap,
    stopSwap,
    updateAvatar,
  } = useLucySwap({
    avatarUrl: selectedAvatar?.url ?? '',
    videoRef: webcamVideoRef,
    outputRef: outputVideoRef,
  })

  // Format session time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate cost estimate
  const costEstimate = (sessionDuration * 0.02).toFixed(2)

  // Check if user can swap
  const canSwap = selectedAvatar && subscription?.plan !== 'free' && subscription?.is_active

  // Load user data on mount
  useEffect(() => {
    async function loadUserData() {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          router.push('/auth/login')
          return
        }

        setUserId(user.id)

        // Fetch subscription
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('plan, is_active, expires_at')
          .eq('user_id', user.id)
          .single()

        if (subData) {
          setSubscription(subData)
        } else {
          // Default to free plan
          setSubscription({ plan: 'free', is_active: true, expires_at: null })
        }

        // Fetch avatars
        const { data: avatarData } = await supabase
          .from('user_avatars')
          .select('id, name, url, thumbnail_url, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (avatarData) {
          setAvatars(avatarData)
        }

        // Restore selected avatar from localStorage
        const savedAvatarId = localStorage.getItem('chapcam_active_avatar')
        if (savedAvatarId && avatarData) {
          const savedAvatar = avatarData.find((a: Avatar) => a.id === savedAvatarId)
          if (savedAvatar) {
            setSelectedAvatar(savedAvatar)
          }
        }

      } catch (err) {
        console.error('[v0] Error loading user data:', err)
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

  // Handle avatar selection
  const handleSelectAvatar = useCallback((avatar: Avatar) => {
    setSelectedAvatar(avatar)
    localStorage.setItem('chapcam_active_avatar', avatar.id)
    updateAvatar(avatar.url)
  }, [updateAvatar])

  // Handle start swap
  const handleStartSwap = useCallback(async () => {
    if (!selectedAvatar || !userId) return

    try {
      // Insert swap session
      const { data: sessionData, error: sessionError } = await supabase
        .from('swap_sessions')
        .insert({
          user_id: userId,
          avatar_id: selectedAvatar.id,
          avatar_name: selectedAvatar.name,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (sessionError) {
        console.error('[v0] Failed to create session:', sessionError)
      } else if (sessionData) {
        setCurrentSessionId(sessionData.id)
      }

      setSessionStartTime(Date.now())
      setSessionDuration(0)
      
      await startSwap()
      
      toast({
        title: '⚡️ Body swap activé !',
        description: 'Ta transformation est en cours.',
      })

    } catch (err) {
      console.error('[v0] Start swap error:', err)
      toast({
        title: 'Erreur',
        description: 'Impossible de démarrer le swap',
        variant: 'destructive',
      })
    }
  }, [selectedAvatar, userId, supabase, startSwap])

  // Handle stop swap
  const handleStopSwap = useCallback(async () => {
    stopSwap()
    
    // Update session in database
    if (currentSessionId) {
      const framesProcessed = sessionDuration * 30 // ~30 FPS
      
      await supabase
        .from('swap_sessions')
        .update({
          ended_at: new Date().toISOString(),
          frames_processed: framesProcessed,
        })
        .eq('id', currentSessionId)
    }

    setCurrentSessionId(null)
    setSessionStartTime(null)
    
    toast({
      title: 'Session terminée',
      description: `Durée: ${formatTime(sessionDuration)}`,
    })
  }, [stopSwap, currentSessionId, sessionDuration, supabase])

  // Show error toast
  useEffect(() => {
    if (error) {
      toast({
        title: 'Erreur',
        description: error,
        variant: 'destructive',
      })
    }
  }, [error])

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 bg-white/5" />
          <Skeleton className="mt-2 h-4 w-96 bg-white/5" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[55%_45%]">
          <Skeleton className="aspect-video w-full rounded-2xl bg-white/5" />
          <Skeleton className="h-96 w-full rounded-2xl bg-white/5" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
          <Zap className="h-7 w-7 text-[#00ff88]" />
          LIVE SWAP
        </h1>
        <p className="mt-1 text-gray-400">
          Transforme ton apparence en temps réel pendant tes streams et appels vidéo.
        </p>
      </div>

      {/* Main Layout */}
      <div className="grid gap-6 lg:grid-cols-[55%_45%]">
        {/* LEFT PANEL - Video Output */}
        <div className="space-y-4">
          {/* Main Video */}
          <div className="relative">
            <div 
              className={`relative aspect-video overflow-hidden rounded-2xl bg-black ${
                isActive ? 'border-2 border-[#00ff88]/50' : 'border border-white/10'
              }`}
            >
              {/* Output Video */}
              <video
                ref={outputVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />

              {/* Hidden webcam video for processing */}
              <video
                ref={webcamVideoRef}
                autoPlay
                playsInline
                muted
                className="hidden"
              />

              {/* Overlay: Live indicator */}
              {isActive && (
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ff88] opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#00ff88]" />
                  </span>
                  <span className="text-xs font-semibold text-white">EN DIRECT</span>
                </div>
              )}

              {/* Overlay: Latency badge */}
              {isActive && latency > 0 && (
                <div className="absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
                  <span className="text-xs font-mono text-[#00ff88]">{latency}ms</span>
                </div>
              )}

              {/* PIP: Raw webcam when swap active */}
              {isActive && (
                <div className="absolute bottom-4 right-4 h-[90px] w-[160px] overflow-hidden rounded-lg border-2 border-white/20 bg-black shadow-lg">
                  <video
                    ref={webcamVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {/* Placeholder when not active */}
              {!isActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#00ff88]/10">
                    <Zap className="h-10 w-10 text-[#00ff88]" />
                  </div>
                  <p className="text-lg font-medium text-white">Prêt à démarrer</p>
                  <p className="mt-1 text-sm text-gray-400">Sélectionne un avatar et lance le swap</p>
                </div>
              )}
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111111] px-4 py-3">
            {/* Connection Status */}
            <div className="flex items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full ${getStatusColor(connectionStatus)}`} />
              <span className="text-sm text-gray-400">{getStatusText(connectionStatus)}</span>
              
              {connectionStatus === 'error' && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>

            {/* Session Timer */}
            {isActive && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Durée:</span>
                  <span className="font-mono text-sm text-white">{formatTime(sessionDuration)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Coût:</span>
                  <span className="font-mono text-sm text-[#00ff88]">{costEstimate}€</span>
                </div>
              </div>
            )}
          </div>

          {/* Main CTA Button */}
          <Button
            onClick={isActive ? handleStopSwap : handleStartSwap}
            disabled={!canSwap && !isActive}
            className={`w-full py-7 text-lg font-bold uppercase transition-all ${
              isActive 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : isConnecting
                  ? 'animate-pulse bg-[#00ff88]/50 text-black'
                  : 'bg-[#00ff88] hover:bg-[#00cc6a] text-black shadow-[0_0_30px_rgba(0,255,136,0.3)]'
            } ${!canSwap && !isActive ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {isActive ? (
              <>
                <Square className="mr-2 h-5 w-5" /> ARRÊTER LE SWAP
              </>
            ) : isConnecting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Connexion à Lucy AI...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" /> DÉMARRER LE SWAP
              </>
            )}
          </Button>

          {/* Disabled reason */}
          {!canSwap && !isActive && (
            <p className="text-center text-sm text-gray-500">
              {!selectedAvatar 
                ? 'Sélectionne un avatar pour commencer'
                : subscription?.plan === 'free'
                  ? 'Upgrade ton plan pour utiliser le Live Swap'
                  : 'Ton abonnement a expiré'}
            </p>
          )}

          {/* Platform Shortcuts */}
          <div className="rounded-xl border border-white/10 bg-[#111111] p-4">
            <p className="mb-3 text-sm font-medium text-gray-400">Compatibilité plateformes</p>
            <div className="flex items-center justify-between">
              {platformShortcuts.map((platform) => (
                <Tooltip key={platform.id}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-2 rounded-lg p-2 transition-colors hover:bg-white/5">
                      <platform.icon className="h-6 w-6 text-gray-400" />
                      <span className="text-xs text-gray-500">{platform.name}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px] bg-[#1a1a1a] text-white border-white/10">
                    {platform.tooltip}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Avatar Selection */}
        <div className="space-y-4">
          <Card className="border-white/10 bg-[#111111] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">CHOISIR UN AVATAR</h2>
              <Badge variant="outline" className="border-[#00ff88]/30 text-[#00ff88]">
                {avatars.length} avatar{avatars.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {avatars.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {avatars.map((avatar) => (
                  <button
                    key={avatar.id}
                    onClick={() => handleSelectAvatar(avatar)}
                    className={`group relative aspect-[3/4] overflow-hidden rounded-xl border-2 transition-all ${
                      selectedAvatar?.id === avatar.id
                        ? 'border-[#00ff88] ring-2 ring-[#00ff88]/30'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <Image
                      src={avatar.thumbnail_url || avatar.url}
                      alt={avatar.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    
                    {/* Selected indicator */}
                    {selectedAvatar?.id === avatar.id && (
                      <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#00ff88]">
                        <Check className="h-4 w-4 text-black" />
                      </div>
                    )}

                    {/* Name overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <p className="truncate text-sm font-medium text-white">{avatar.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/20 py-10">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#7c3aed]/10">
                  <Zap className="h-8 w-8 text-[#7c3aed]" />
                </div>
                <p className="mb-2 text-center text-white">Aucun avatar</p>
                <p className="mb-4 text-center text-sm text-gray-400">
                  Crée ton premier avatar pour commencer
                </p>
                <Link href="/dashboard/avatars">
                  <Button className="bg-[#7c3aed] hover:bg-[#6d28d9]">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un avatar
                  </Button>
                </Link>
              </div>
            )}

            {/* Add avatar button */}
            {avatars.length > 0 && (
              <Link href="/dashboard/avatars" className="mt-4 block">
                <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/5">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un avatar
                </Button>
              </Link>
            )}
          </Card>

          {/* Plan upgrade banner */}
          {subscription?.plan === 'free' && (
            <Card className="border-orange-500/30 bg-orange-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/20">
                  <Zap className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-semibold text-white">Passe en Pro</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Le Live Swap nécessite un abonnement Pro ou supérieur.
                  </p>
                  <Link href="/dashboard/settings">
                    <Button className="mt-3 bg-orange-500 hover:bg-orange-600 text-white">
                      Voir les plans
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
