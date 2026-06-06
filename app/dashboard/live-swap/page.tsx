'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Camera, Zap, Clock, Coins, Plus, Check, AlertCircle, Loader2, Square, Wifi, WifiOff, Monitor, Cloud, Settings, Download, Crown, CreditCard, ClipboardList, Mic, MicOff, Video as VideoIcon, VideoOff, BookOpen, Languages, ImageIcon, Film, ArrowRight, Maximize2, Minimize2 } from 'lucide-react'
import { useLucy21 } from '@/hooks/use-lucy-21'
import { InstallationRequestModal } from '@/components/dashboard/installation-request-modal'
import { VirtualCameraIndicator } from '@/components/live/virtual-camera-indicator'
import { detectHardwareCapabilities, determineProcessingMode, loadProcessingPreferences, saveProcessingPreferences, type HardwareCapabilities, type UserProcessingPreferences } from '@/lib/hardware-detection'

const SUPABASE_URL = 'https://ojmzqokffbptmcktnwdy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbXpxb2tmZmJwdG1ja3Rud2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTAzNTYsImV4cCI6MjA5NDg4NjM1Nn0.e9sk4b_15ge2LIIQwFpXC3n_q48ctu9IJ6oJxV85kgw'

const POINTS_PER_SECOND = 2

interface Avatar {
  id: string
  name: string
  url: string
  is_active: boolean
}

export default function DashboardPage() {
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null)
  const [userPoints, setUserPoints] = useState(0)
  const [maxPoints, setMaxPoints] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [pointsUsed, setPointsUsed] = useState(0)
  const [isSyncingPoints, setIsSyncingPoints] = useState(false)

  // Nouveau: Detection hardware et mode de traitement
  const [hardware, setHardware] = useState<HardwareCapabilities | null>(null)
  // IMPORTANT : on initialise avec les MEMES valeurs par defaut que le rendu
  // serveur. Lire localStorage ici (pendant le rendu) provoquait un mismatch
  // d'hydratation (React #418) qui faisait planter toute la page Live.
  // Les vraies preferences sont chargees apres le montage dans un useEffect.
  const [preferences, setPreferences] = useState<UserProcessingPreferences>({
    mode: 'auto',
    maxLocalFPS: 25,
    preferQuality: true,
    forceCloud: false,
  })
  const [processingMode, setProcessingMode] = useState<'local' | 'cloud'>('cloud')
  const [networkQuality, setNetworkQuality] = useState<'good' | 'medium' | 'poor'>('good')
  const [showModeSettings, setShowModeSettings] = useState(false)
  const [stats, setStats] = useState({ fps: 0, latency: 0, resolution: '720p' })
  const [showInstallModal, setShowInstallModal] = useState(false)

  // Reglages visuels (modernisation UI uniquement - n'affecte pas la logique du swap)
  const [renderQuality, setRenderQuality] = useState<'standard' | 'hd' | 'ultra'>('ultra')
  const [stability, setStability] = useState(80)
  const [smoothing, setSmoothing] = useState(70)
  const [noiseReduction, setNoiseReduction] = useState(60)
  const [faceOrientation, setFaceOrientation] = useState<'left' | 'center' | 'right'>('center')
  const [colorCorrection, setColorCorrection] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)

  // Agrandissement de la camera ChapCam (plein ecran natif pour faciliter le cadrage / OBS)
  const chapCamRef = useRef<HTMLDivElement | null>(null)
  const [isCamFullscreen, setIsCamFullscreen] = useState(false)

  const toggleCamFullscreen = useCallback(() => {
    const el = chapCamRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const onFsChange = () => setIsCamFullscreen(document.fullscreenElement === chapCamRef.current)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const {
    isConnected,
    isConnecting,
    error,
    localVideoRef,
    remoteVideoRef,
    connect,
    disconnect,
    updateAvatar,
  } = useLucy21()

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Charger les preferences sauvegardees uniquement cote client (apres montage)
  // pour eviter tout mismatch d'hydratation avec le rendu serveur.
  useEffect(() => {
    setPreferences(loadProcessingPreferences())
  }, [])

  // Detecter le hardware au montage
  useEffect(() => {
    async function detectHardware() {
      const caps = await detectHardwareCapabilities()
      setHardware(caps)
      
      // Si PC gamer detecte, forcer le mode local obligatoirement
      if (caps.isGamingPC) {
        setProcessingMode('local')
        const forcedPrefs = { ...preferences, mode: 'local' as const }
        setPreferences(forcedPrefs)
        saveProcessingPreferences(forcedPrefs)
        setStats(prev => ({ ...prev, resolution: caps.gpuTier === 'high' ? '1080p' : '720p', fps: caps.gpuTier === 'high' ? 30 : 25 }))
      } else {
        // PC classique: determiner le mode optimal (cloud par defaut)
        const mode = determineProcessingMode(caps, preferences, networkQuality)
        setProcessingMode(mode.mode)
        setStats(prev => ({ ...prev, resolution: mode.resolution, fps: mode.fps }))
      }
    }
    detectHardware()
  }, [networkQuality])

  // Surveiller la qualite reseau
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & { connection?: { effectiveType: string; addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void } }).connection
      if (connection) {
        const updateNetworkQuality = () => {
          const type = connection.effectiveType
          if (type === '4g') setNetworkQuality('good')
          else if (type === '3g') setNetworkQuality('medium')
          else setNetworkQuality('poor')
        }
        updateNetworkQuality()
        connection.addEventListener?.('change', updateNetworkQuality)
        return () => connection.removeEventListener?.('change', updateNetworkQuality)
      }
    }
  }, [])

  // Load user data
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      // Charger les points via l'API
      try {
        const pointsRes = await fetch('/api/points')
        const pointsData = await pointsRes.json().catch(() => null)
        if (pointsData?.success) {
          setUserPoints(pointsData.points ?? 0)
          setMaxPoints(pointsData.maxPoints ?? 0)
        }
      } catch (err) {
        console.error('Erreur chargement points:', err)
      }

      const { data: avatarsData } = await supabase
        .from('user_avatars')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (avatarsData && avatarsData.length > 0) {
        setAvatars(avatarsData)
        const activeAvatar = avatarsData.find(a => a.is_active)
        if (activeAvatar) setSelectedAvatar(activeAvatar)
      }
    }

    loadData()
  }, [])

  // Track points usage en temps reel (localement)
  useEffect(() => {
    if (!isConnected) return
    const interval = setInterval(() => {
      setDuration(prev => prev + 1)
      setPointsUsed(prev => prev + POINTS_PER_SECOND)
      setUserPoints(prev => {
        const newPoints = Math.max(0, prev - POINTS_PER_SECOND)
        if (newPoints === 0) {
          // Plus de points - arreter le swap et sauvegarder
          handleStopSwapAndSave()
        }
        return newPoints
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isConnected])

  // Fonction pour arreter le swap et sauvegarder les points
  const handleStopSwapAndSave = async () => {
    disconnect()
    
    // Sauvegarder les points utilises dans Supabase
    if (pointsUsed > 0 && !isSyncingPoints) {
      setIsSyncingPoints(true)
      try {
        const res = await fetch('/api/points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            pointsToDeduct: pointsUsed,
            sessionDuration: duration 
          })
        })
        const data = await res.json().catch(() => null)
        if (data?.success) {
          setUserPoints(data.currentPoints ?? 0)
          setMaxPoints(data.maxPoints ?? 0)
        }
      } catch (err) {
        console.error('Erreur sauvegarde points:', err)
      } finally {
        setIsSyncingPoints(false)
      }
    }
    
    // Reset les compteurs
    setPointsUsed(0)
    setDuration(0)
  }

  // === TRACKING UTILISATEURS ACTIFS ===
  useEffect(() => {
    const trackActivity = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Le tracking d'activite est purement "best effort" : si la table
        // user_activity n'existe pas / n'a pas de contrainte unique sur
        // user_id (erreur 400), on ignore silencieusement pour ne JAMAIS
        // faire planter la page Live.
        const { error: activityError } = await supabase
          .from('user_activity')
          .upsert({
            user_id: user.id,
            last_active: new Date().toISOString(),
            current_page: window.location.pathname,
          }, {
            onConflict: 'user_id',
          })

        if (activityError) {
          console.warn('[live-swap] Suivi activite ignore:', activityError.message)
        }
      } catch (err) {
        console.warn('[live-swap] Suivi activite indisponible:', err)
      }
    }

    trackActivity()
    const interval = setInterval(trackActivity, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleStartSwap = async () => {
    if (!selectedAvatar || userPoints < POINTS_PER_SECOND) return
    setDuration(0)
    setPointsUsed(0)
    await connect(selectedAvatar.url)
  }

  const handleStopSwap = () => handleStopSwapAndSave()

  const handleSelectAvatar = async (avatar: Avatar) => {
    setSelectedAvatar(avatar)

    if (userId) {
      await supabase.from('user_avatars').update({ is_active: false }).eq('user_id', userId)
      await supabase.from('user_avatars').update({ is_active: true }).eq('id', avatar.id)
      setAvatars(prev => prev.map(a => ({ ...a, is_active: a.id === avatar.id })))
    }

    if (isConnected) {
      try {
        await updateAvatar(avatar.url)
      } catch (err) {
        console.error(err)
      }
    }
  }

  const handleModeChange = useCallback((mode: 'auto' | 'local' | 'cloud') => {
    // Si PC gamer, ignorer tout changement et rester en local
    if (hardware?.isGamingPC) {
      return
    }
    
    const newPrefs = { ...preferences, mode }
    setPreferences(newPrefs)
    saveProcessingPreferences(newPrefs)
    
    if (hardware) {
      const result = determineProcessingMode(hardware, newPrefs, networkQuality)
      setProcessingMode(result.mode)
    }
    setShowModeSettings(false)
  }, [hardware, networkQuality, preferences])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const canStart = !!selectedAvatar && userPoints >= POINTS_PER_SECOND

  const quickTools = [
    { href: '/dashboard/voice-changer', label: 'Voice Changer V1', icon: Mic, color: '#06b6d4' },
    { href: '/dashboard/voice-translator', label: 'Voice Traducteur', icon: Languages, color: '#3b82f6' },
    { href: '/dashboard/photo-video', label: 'Photos → Vidéo', icon: ImageIcon, color: '#f97316' },
    { href: '/dashboard/video-translation', label: 'Traduction Vidéo', icon: Film, color: '#8b5cf6' },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 md:text-3xl">
            <Zap className="w-6 h-6 text-primary" />
            Live Swap
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Transformez votre apparence en temps réel avec l&apos;IA.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {/* Guide d'utilisation */}
          <Link
            href="/dashboard/mes-demandes"
            className="hidden items-center gap-2 rounded-lg border border-hairline bg-muted px-4 py-2 text-sm font-semibold text-foreground backdrop-blur-md transition-colors hover:border-hairline-strong sm:flex"
          >
            <BookOpen className="h-4 w-4" />
            Mes demandes
          </Link>

          {/* Recharger (orange) */}
          <Link
            href="/dashboard/plans"
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-colors hover:bg-orange-600"
          >
            <CreditCard className="h-4 w-4" />
            Recharger
          </Link>

          {/* Demande d'installation (bleu) */}
          <button
            onClick={() => setShowInstallModal(true)}
            className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-colors hover:bg-[#1d4ed8]"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Demande d&apos;installation</span>
            <span className="sm:hidden">Installation</span>
          </button>

          {/* Credits restants */}
          <div className="flex items-center gap-2 rounded-lg border border-hairline bg-muted px-4 py-2 backdrop-blur-md">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-foreground font-bold">{userPoints.toLocaleString()}</span>
            <span className="text-muted-foreground text-sm">points</span>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-hairline bg-muted px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          {isConnected ? <Wifi className="h-4 w-4 text-primary" /> : <WifiOff className="h-4 w-4 text-text-faint" />}
          <span className={`text-sm font-medium ${isConnected ? 'text-primary' : 'text-muted-foreground'}`}>
            {isConnected ? 'Connexion excellente' : 'Connexion prête'}
          </span>
        </div>
        <div className="hidden h-4 w-px bg-muted sm:block" />
        <div className="flex items-center gap-2 text-sm">
          {processingMode === 'local' ? <Monitor className="h-4 w-4 text-green-400" /> : <Cloud className="h-4 w-4 text-blue-400" />}
          <span className="text-muted-foreground">Mode :</span>
          <span className="font-medium text-foreground">{processingMode === 'local' ? 'Local' : 'Cloud'}</span>
        </div>
        <div className="hidden h-4 w-px bg-muted sm:block" />
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
            {renderQuality === 'ultra' ? '4K' : renderQuality === 'hd' ? 'HD' : 'SD'}
          </span>
          <span className="text-muted-foreground">Qualité :</span>
          <span className="font-medium text-foreground">
            {renderQuality === 'ultra' ? 'Ultra HD' : renderQuality === 'hd' ? 'HD' : 'Standard'}
          </span>
        </div>
        <div className="hidden h-4 w-px bg-muted sm:block" />
        <div className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Latence :</span>
          <span className="font-medium text-foreground">{stats.latency || 120} ms</span>
        </div>
      </div>

      {/* Rappel : c'est la vraie version premium */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-transparent p-4">
        <div className="rounded-lg bg-primary/20 p-2">
          <Crown className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Tu utilises la vraie version ChapCam</p>
          <p className="mt-1 text-xs text-foreground/60">
            Ici, pas de bug et la transformation se fait de la tete aux pieds, en bien meilleure qualite
            que l&apos;essai gratuit. C&apos;est le vrai logiciel.
          </p>
        </div>
      </div>

      {/* Hardware Detection Banner */}
      {hardware?.isGamingPC && (
        <div className="bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Monitor className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-400">PC Gaming detecte - Traitement local disponible</p>
              <p className="text-xs text-foreground/60">{hardware.gpuName} | {hardware.vramEstimate}GB VRAM | Mode {processingMode}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Main layout : contenu + panneau de reglages */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Colonne principale */}
        <div className="space-y-6">
          {/* Cameras avec cercle IA */}
          <div className="relative grid gap-6 md:grid-cols-2">
            {/* Camera reelle */}
            <div className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-2 border-b border-hairline bg-muted px-4 py-2.5 backdrop-blur-md">
                <Camera className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-foreground">Caméra réelle</span>
                {isConnected && (
                  <span className="ml-auto flex items-center gap-1.5 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> EN DIRECT
                  </span>
                )}
              </div>
              <div className="relative aspect-video bg-background">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {!isConnected && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-text-faint">
                    <Camera className="mb-2 h-12 w-12 opacity-50" />
                    <p className="text-sm">Caméra inactive</p>
                  </div>
                )}
                {/* Controles camera */}
                <div className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMicOn(v => !v)}
                      aria-label={micOn ? 'Couper le micro' : 'Activer le micro'}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-black/50 text-foreground/80 backdrop-blur-md transition-colors hover:bg-black/70"
                    >
                      {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-red-400" />}
                    </button>
                    <button
                      onClick={() => setCamOn(v => !v)}
                      aria-label={camOn ? 'Couper la caméra' : 'Activer la caméra'}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-black/50 text-foreground/80 backdrop-blur-md transition-colors hover:bg-black/70"
                    >
                      {camOn ? <VideoIcon className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-red-400" />}
                    </button>
                    <div className="flex h-9 items-end gap-0.5 rounded-lg border border-hairline bg-black/50 px-2 py-2 backdrop-blur-md">
                      {[0, 1, 2, 3, 4, 5].map(i => (
                        <span
                          key={i}
                          className="cc-wave-bar w-0.5 rounded-full bg-primary"
                          style={{ height: '100%', animationDelay: `${i * 0.12}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Camera ChapCam */}
            <div className="overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-[0_8px_40px_rgba(0,255,136,0.12)]">
              <div className="flex items-center gap-2 border-b border-primary/20 bg-muted px-4 py-2.5 backdrop-blur-md">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Caméra ChapCam</span>
                <div className="ml-auto flex items-center gap-2 text-[11px]">
                  {isConnected && (
                    <>
                      <span className="font-semibold text-primary">{stats.fps} FPS</span>
                      <span className="text-foreground/30">|</span>
                      <span className="text-foreground/60">{stats.resolution}</span>
                    </>
                  )}
                  <button
                    onClick={toggleCamFullscreen}
                    aria-label={isCamFullscreen ? 'Réduire la caméra' : 'Agrandir la caméra'}
                    title={isCamFullscreen ? 'Réduire' : 'Agrandir en plein écran'}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                  >
                    {isCamFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div ref={chapCamRef} className="cc-cam-stage relative aspect-video bg-background">
                <video
                  ref={remoteVideoRef}
                  data-chapcam-output="true"
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />

                <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-md bg-black/60 px-3 py-1 text-xs text-foreground backdrop-blur-md">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                  ChapCam • {processingMode === 'local' ? 'Local' : 'Cloud'}
                </div>

                <button
                  onClick={toggleCamFullscreen}
                  aria-label={isCamFullscreen ? 'Réduire la caméra' : 'Agrandir la caméra'}
                  title={isCamFullscreen ? 'Réduire' : 'Agrandir en plein écran'}
                  className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-black/50 text-foreground/80 backdrop-blur-md transition-colors hover:bg-black/70"
                >
                  {isCamFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>

                {!isConnected && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background text-text-faint">
                    <Zap className="mb-2 h-12 w-12 opacity-50" />
                    <p className="text-sm">{isConnecting ? 'Connexion en cours...' : 'Swap inactif'}</p>
                  </div>
                )}

                {isConnecting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}

                {/* Controles camera */}
                <div className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-between">
                  <div className="flex h-9 items-end gap-0.5 rounded-lg border border-hairline bg-black/50 px-2 py-2 backdrop-blur-md">
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <span
                        key={i}
                        className="cc-wave-bar w-0.5 rounded-full bg-primary"
                        style={{ height: '100%', animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-hairline bg-black/50 px-3 py-2 text-xs text-foreground/70 backdrop-blur-md">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(duration)}
                  </div>
                </div>
              </div>

              {/* Indicateur d'etat de la camera virtuelle ChapCam (app de bureau uniquement) */}
              <VirtualCameraIndicator className="m-3" />
            </div>

            {/* Cercle IA anime au centre */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 md:flex">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl cc-pulse" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-background shadow-[0_0_30px_rgba(0,255,136,0.5)]">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
              </div>
              <span className="rounded-md bg-black/60 px-2 py-1 text-center text-[10px] leading-tight text-foreground/70 backdrop-blur-md">
                Transformation
                <br />
                en temps réel
              </span>
            </div>
          </div>

          {/* Outils rapides ChapCam */}
          <div className="rounded-2xl border border-hairline bg-muted p-4 backdrop-blur-xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Outils rapides ChapCam
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quickTools.map(tool => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group flex items-center gap-2.5 rounded-xl border border-hairline bg-black/30 px-3 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-hairline-strong"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${tool.color}22` }}
                  >
                    <tool.icon className="h-4 w-4" style={{ color: tool.color }} />
                  </span>
                  <span className="flex-1 truncate text-xs font-medium text-foreground">{tool.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/60" />
                </Link>
              ))}
            </div>
          </div>

          {/* Avatars */}
          <div className="grid gap-4 md:grid-cols-[260px_1fr]">
            {/* Avatar selectionne */}
            <div className="rounded-2xl border border-hairline bg-muted p-4 backdrop-blur-xl">
              <p className="mb-3 text-sm font-semibold text-foreground">Avatar sélectionné</p>
              {selectedAvatar ? (
                <div className="flex items-center gap-3">
                  <img
                    src={selectedAvatar.url || '/placeholder.svg'}
                    alt={selectedAvatar.name}
                    className="h-14 w-14 rounded-xl border border-primary/40 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{selectedAvatar.name}</p>
                    <p className="text-xs text-foreground/40">Actif</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground/40">Aucun avatar sélectionné</p>
              )}
            </div>

            {/* Mes avatars */}
            <div className="rounded-2xl border border-hairline bg-muted p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Mes avatars</p>
                <Link href="/dashboard/avatars" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter
                </Link>
              </div>

              {avatars.length === 0 ? (
                <div className="flex items-center gap-3 py-2">
                  <Link
                    href="/dashboard/avatars"
                    className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-hairline-strong text-foreground/50 transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Plus className="h-5 w-5" />
                  </Link>
                  <p className="text-sm text-foreground/40">Créez votre premier avatar</p>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {avatars.map(avatar => (
                    <button
                      key={avatar.id}
                      onClick={() => handleSelectAvatar(avatar)}
                      className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                        selectedAvatar?.id === avatar.id
                          ? 'border-primary shadow-[0_0_20px_rgba(0,255,136,0.3)]'
                          : 'border-hairline hover:border-white/30'
                      }`}
                    >
                      <img src={avatar.url || '/placeholder.svg'} alt={avatar.name} className="h-full w-full object-cover" />
                      {selectedAvatar?.id === avatar.id && (
                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-black" />
                        </span>
                      )}
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                        <span className="block truncate text-[10px] font-medium text-foreground">{avatar.name}</span>
                      </span>
                    </button>
                  ))}
                  <Link
                    href="/dashboard/avatars"
                    className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-hairline-strong text-foreground/50 transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-[10px]">Ajouter</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Bouton Demarrer (degrade vert -> violet) */}
          <button
            onClick={isConnected ? handleStopSwap : handleStartSwap}
            disabled={!canStart && !isConnected}
            className={`group relative w-full overflow-hidden rounded-2xl py-5 text-lg font-bold transition-all ${
              isConnected
                ? 'bg-red-500 text-white hover:bg-red-600'
                : isConnecting
                ? 'cursor-wait bg-yellow-500 text-black'
                : canStart
                ? 'bg-gradient-to-r from-primary via-[#1ec8d8] to-[#8b5cf6] text-foreground shadow-[0_0_40px_rgba(0,255,136,0.35)] hover:shadow-[0_0_60px_rgba(139,92,246,0.45)]'
                : 'cursor-not-allowed bg-gray-700 text-muted-foreground'
            }`}
          >
            <span className="flex flex-col items-center justify-center gap-0.5">
              {isConnecting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connexion en cours...
                </span>
              ) : isConnected ? (
                <span className="flex items-center gap-2">
                  <Square className="h-5 w-5" />
                  Arrêter le Live Swap
                </span>
              ) : (
                <>
                  <span className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Démarrer le Live Swap
                  </span>
                  <span className="text-xs font-normal opacity-80">
                    La transformation commencera en temps réel
                  </span>
                </>
              )}
            </span>
          </button>
        </div>

        {/* Panneau de reglages */}
        <aside className="h-fit space-y-6 rounded-2xl border border-hairline bg-muted p-5 backdrop-blur-xl lg:sticky lg:top-6">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Réglages du swap</h2>
          </div>

          {/* Qualite de rendu */}
          <div>
            <p className="mb-2 text-xs font-medium text-foreground/60">Qualité de rendu</p>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/40 p-1">
              {([
                { id: 'standard', label: 'Standard' },
                { id: 'hd', label: 'HD' },
                { id: 'ultra', label: 'Ultra HD' },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setRenderQuality(opt.id)}
                  className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                    renderQuality === opt.id ? 'bg-primary text-black' : 'text-foreground/60 hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          {([
            { label: 'Stabilité', value: stability, set: setStability },
            { label: 'Lissage', value: smoothing, set: setSmoothing },
            { label: 'Réduction du bruit', value: noiseReduction, set: setNoiseReduction },
          ]).map(s => (
            <div key={s.label}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-foreground/60">{s.label}</span>
                <span className="text-xs font-semibold text-primary">{s.value}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={s.value}
                onChange={e => s.set(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
            </div>
          ))}

          {/* Orientation du visage */}
          <div>
            <p className="mb-2 text-xs font-medium text-foreground/60">Orientation du visage</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'left', label: 'Gauche' },
                { id: 'center', label: 'Centre' },
                { id: 'right', label: 'Droite' },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFaceOrientation(opt.id)}
                  className={`flex flex-col items-center gap-1 rounded-lg border py-2.5 text-[10px] transition-colors ${
                    faceOrientation === opt.id
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-hairline bg-black/30 text-foreground/50 hover:border-hairline-strong'
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Correction des couleurs */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground/60">Correction des couleurs</span>
            <button
              onClick={() => setColorCorrection(v => !v)}
              role="switch"
              aria-checked={colorCorrection}
              aria-label="Correction des couleurs"
              className={`relative h-6 w-11 rounded-full transition-colors ${
                colorCorrection ? 'bg-primary' : 'bg-white/15'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  colorCorrection ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Mode de traitement */}
          <div>
            <p className="mb-2 text-xs font-medium text-foreground/60">Mode de traitement</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleModeChange('cloud')}
                disabled={hardware?.isGamingPC}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  processingMode === 'cloud'
                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                    : 'border-hairline bg-black/30 text-foreground/50 hover:border-hairline-strong'
                }`}
              >
                <Cloud className="h-4 w-4" />
                Cloud
              </button>
              <button
                onClick={() => handleModeChange('local')}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${
                  processingMode === 'local'
                    ? 'border-green-500/50 bg-green-500/10 text-green-400'
                    : 'border-hairline bg-black/30 text-foreground/50 hover:border-hairline-strong'
                }`}
              >
                <Monitor className="h-4 w-4" />
                Local
              </button>
            </div>
            {hardware?.isGamingPC && (
              <p className="mt-2 text-[10px] text-green-400/70">
                PC Gaming détecté — mode local forcé pour des performances optimales.
              </p>
            )}
          </div>

          {/* Session info */}
          <div className="space-y-2 rounded-xl border border-hairline bg-black/30 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-foreground/50">Durée session</span>
              <span className="font-medium text-foreground">{formatDuration(duration)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground/50">Points utilisés</span>
              <span className="font-medium text-foreground">{pointsUsed} pts</span>
            </div>
          </div>
        </aside>
      </div>

      <InstallationRequestModal
        open={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </div>
  )
}
