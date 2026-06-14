'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Camera, Zap, Clock, Coins, Plus, Check, AlertCircle, Loader2, Square, Wifi, WifiOff, Monitor, Cloud, Settings, Download, Crown, CreditCard, ClipboardList, Mic, MicOff, Video as VideoIcon, VideoOff, BookOpen, Languages, ImageIcon, Film, ArrowRight, Maximize2, Minimize2, AudioLines } from 'lucide-react'

import { useLucy21 } from '@/hooks/use-lucy-21'
import { useDecartNoWatermark } from '@/hooks/useDecartNoWatermark'   // ← Nouveau hook

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

  const [hardware, setHardware] = useState<HardwareCapabilities | null>(null)
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

  const [renderQuality, setRenderQuality] = useState<'standard' | 'hd' | 'ultra'>('ultra')
  const [stability, setStability] = useState(80)
  const [smoothing, setSmoothing] = useState(70)
  const [noiseReduction, setNoiseReduction] = useState(60)
  const [faceOrientation, setFaceOrientation] = useState<'left' | 'center' | 'right'>('center')
  const [colorCorrection, setColorCorrection] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)

  const chapCamRef = useRef<HTMLDivElement | null>(null)
  const [isCamFullscreen, setIsCamFullscreen] = useState(false)

  // ==================== NOUVEAU : Flag Watermark (à connecter plus tard à Supabase) ====================
  const [watermarkDisabled, setWatermarkDisabled] = useState(true) // true = actif par défaut pour les tests

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

  // ==================== Hook de retrait watermark ====================
  const { videoRef: hiddenVideoRef, canvasRef, cleanStream } = useDecartNoWatermark({
    decartStream: remoteVideoRef.current?.srcObject as MediaStream | null, // On intercepte le flux Lucy
    enabled: watermarkDisabled,
    onCleanStreamReady: (clean) => {
      // On remplace le flux visible par le flux nettoyé
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = clean
      }
    }
  })

  // Toggle fullscreen
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

  // ... (le reste de tes useEffect reste identique) ...

  // Charge les données utilisateur (je garde ton code original)
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      // ... ton code points + avatars ...
    }
    loadData()
  }, [])

  // ... tous tes autres useEffect restent inchangés ...

  const handleStartSwap = async () => {
    if (!selectedAvatar || userPoints < POINTS_PER_SECOND) return
    setDuration(0)
    setPointsUsed(0)
    await connect(selectedAvatar.url)
  }

  const handleStopSwap = () => {
    disconnect()
    // ... ton code de sauvegarde points ...
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Tout ton header, status bar, etc. reste identique */}

      {/* Main layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Cameras */}
          <div className="relative grid gap-6 md:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
            
            {/* Camera réelle (inchangée) */}
            <div className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
              {/* ... ton code camera réelle ... */}
            </div>

            {/* Camera ChapCam (flux nettoyé) */}
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
                </div>
              </div>
              <div ref={chapCamRef} className="cc-cam-stage relative aspect-video bg-background">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                {/* Indicateur watermark */}
                <div className="absolute right-3 top-3 z-20 rounded-md bg-black/70 px-3 py-1 text-xs text-green-400">
                  {watermarkDisabled ? '✅ Watermark Retiré' : 'Watermark Actif'}
                </div>
                {/* ... le reste de tes overlays ... */}
              </div>
            </div>
          </div>

          {/* Bouton démarrer (inchangé) */}
          <button onClick={isConnected ? handleStopSwap : handleStartSwap} /* ... */ >
            {/* ... */}
          </button>
        </div>

        {/* Panneau réglages (inchangé) */}
        <aside className="h-fit space-y-6 ...">
          {/* Tu peux ajouter ici un toggle pour watermark si tu veux */}
        </aside>
      </div>

      {/* Hidden elements for watermark removal */}
      <video ref={hiddenVideoRef} style={{ display: 'none' }} muted playsInline />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <InstallationRequestModal open={showInstallModal} onClose={() => setShowInstallModal(false)} />
    </div>
  )
}
