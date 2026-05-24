"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, Pause, Settings, Maximize2, Monitor, Cloud, 
  Cpu, Zap, Wifi, WifiOff, RefreshCw, Volume2, VolumeX,
  Camera, CameraOff, ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCloudSwap } from '@/hooks/use-cloud-swap'
import { 
  detectHardwareCapabilities, 
  determineProcessingMode,
  type HardwareCapabilities,
  type UserProcessingPreferences,
  loadProcessingPreferences,
  saveProcessingPreferences
} from '@/lib/hardware-detection'

interface CloudSwapPlayerProps {
  userId: string
  avatarUrl: string
  onPointsUpdate?: (points: number) => void
  userPlan: 'free' | 'starter' | 'popular' | 'pro' | 'ultimate'
  maxPoints: number
  currentPoints: number
}

export function CloudSwapPlayer({
  userId,
  avatarUrl,
  onPointsUpdate,
  userPlan,
  maxPoints,
  currentPoints
}: CloudSwapPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const outputRef = useRef<HTMLVideoElement>(null)
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  
  // Hardware et mode de traitement
  const [hardware, setHardware] = useState<HardwareCapabilities | null>(null)
  const [preferences, setPreferences] = useState<UserProcessingPreferences>(loadProcessingPreferences())
  const [processingMode, setProcessingMode] = useState<'local' | 'cloud'>('cloud')
  const [networkQuality, setNetworkQuality] = useState<'good' | 'medium' | 'poor'>('good')
  
  // Stats en temps reel
  const [stats, setStats] = useState({
    fps: 0,
    latency: 0,
    resolution: '720p',
    gpuUsage: 0,
    pointsUsed: 0
  })

  const { 
    connect, 
    disconnect, 
    isConnected, 
    error,
    streamStats 
  } = useCloudSwap({
    userId,
    avatarUrl,
    quality: userPlan === 'free' ? 'low' : userPlan === 'pro' || userPlan === 'ultimate' ? 'high' : 'medium',
    onFrame: handleProcessedFrame,
    onStatsUpdate: handleStatsUpdate
  })

  // Detecter le hardware au montage
  useEffect(() => {
    async function detectHardware() {
      const caps = await detectHardwareCapabilities()
      setHardware(caps)
      
      // Si PC gamer detecte, forcer le mode local obligatoirement
      if (caps.isGamingPC) {
        setProcessingMode('local')
        // Mettre a jour les preferences pour forcer le mode local
        const forcedPrefs = { ...preferences, mode: 'local' as const }
        setPreferences(forcedPrefs)
        saveProcessingPreferences(forcedPrefs)
        
        setStats(prev => ({
          ...prev,
          resolution: caps.gpuTier === 'high' ? '1080p' : '720p',
          fps: caps.gpuTier === 'high' ? 30 : 25
        }))
      } else {
        // PC classique: determiner le mode optimal (cloud par defaut)
        const mode = determineProcessingMode(caps, preferences, networkQuality)
        setProcessingMode(mode.mode)
        
        setStats(prev => ({
          ...prev,
          resolution: mode.resolution,
          fps: mode.fps
        }))
      }
    }
    detectHardware()
  }, [networkQuality])

  // Surveiller la qualite reseau
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & { connection?: { effectiveType: string } }).connection
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

  function handleProcessedFrame(frameData: ImageData) {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.putImageData(frameData, 0, 0)
  }

  function handleStatsUpdate(newStats: typeof streamStats) {
    setStats(prev => ({
      ...prev,
      fps: newStats.fps,
      latency: newStats.latency,
      gpuUsage: newStats.gpuUsage
    }))
  }

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: processingMode === 'local' && hardware?.gpuTier === 'high' ? 1920 : 1280 },
          height: { ideal: processingMode === 'local' && hardware?.gpuTier === 'high' ? 1080 : 720 },
          frameRate: { ideal: stats.fps || 25 }
        },
        audio: false
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraEnabled(true)
      }
    } catch (err) {
      console.error('[v0] Error starting camera:', err)
    }
  }, [processingMode, hardware, stats.fps])

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
      setCameraEnabled(false)
    }
  }, [])

  const handleStart = async () => {
    if (currentPoints <= 0) {
      alert('Plus de points disponibles. Veuillez recharger.')
      return
    }

    await startCamera()
    
    if (processingMode === 'cloud') {
      await connect()
    }
    
    setIsPlaying(true)
  }

  const handleStop = async () => {
    setIsPlaying(false)
    stopCamera()
    
    if (processingMode === 'cloud') {
      disconnect()
    }
    
    // Sauvegarder les points utilises
    if (onPointsUpdate && stats.pointsUsed > 0) {
      onPointsUpdate(stats.pointsUsed)
    }
  }

  const toggleFullscreen = () => {
    const container = document.getElementById('swap-player-container')
    if (!container) return

    if (!isFullscreen) {
      container.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
    setIsFullscreen(!isFullscreen)
  }

  const handleModeChange = (mode: 'auto' | 'local' | 'cloud') => {
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
  }

  // Calculer les limites selon le plan
  const planLimits = {
    free: { maxFps: 15, maxResolution: '480p', maxMinutes: 5 },
    starter: { maxFps: 25, maxResolution: '720p', maxMinutes: 4 },
    popular: { maxFps: 30, maxResolution: '1080p', maxMinutes: 50 },
    pro: { maxFps: 30, maxResolution: '1080p', maxMinutes: 133 },
    ultimate: { maxFps: 30, maxResolution: '1080p', maxMinutes: 375 }
  }

  const limits = planLimits[userPlan]

  return (
    <div 
      id="swap-player-container"
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10"
    >
      {/* Video Input (cache) */}
      <video 
        ref={videoRef} 
        className="hidden" 
        playsInline 
        muted 
      />
      
      {/* Canvas de traitement */}
      <canvas 
        ref={canvasRef}
        className="hidden"
        width={1280}
        height={720}
      />

      {/* Output Video / Preview */}
      <div className="absolute inset-0 flex items-center justify-center">
        {!cameraEnabled ? (
          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto rounded-full bg-white/5 flex items-center justify-center">
              <Camera className="w-12 h-12 text-white/40" />
            </div>
            <p className="text-white/60">Cliquez sur Demarrer pour activer la camera</p>
          </div>
        ) : (
          <video 
            ref={outputRef}
            className="w-full h-full object-cover"
            playsInline
            muted={isMuted}
          />
        )}
      </div>

      {/* Overlay Stats */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-4 flex items-center gap-3"
          >
            {/* Mode Badge */}
            <div className={`px-3 py-1.5 rounded-full flex items-center gap-2 ${
              processingMode === 'local' 
                ? 'bg-green-500/20 border border-green-500/50' 
                : 'bg-blue-500/20 border border-blue-500/50'
            }`}>
              {processingMode === 'local' ? (
                <Cpu className="w-4 h-4 text-green-400" />
              ) : (
                <Cloud className="w-4 h-4 text-blue-400" />
              )}
              <span className={`text-xs font-medium ${
                processingMode === 'local' ? 'text-green-400' : 'text-blue-400'
              }`}>
                {processingMode === 'local' ? 'LOCAL' : 'CLOUD'}
              </span>
            </div>

            {/* Stats */}
            <div className="px-3 py-1.5 rounded-full bg-black/50 border border-white/10 flex items-center gap-3 text-xs">
              <span className="text-[#00ff88]">{stats.fps} FPS</span>
              <span className="text-white/40">|</span>
              <span className="text-white/60">{stats.latency}ms</span>
              <span className="text-white/40">|</span>
              <span className="text-white/60">{stats.resolution}</span>
            </div>

            {/* Network Quality */}
            <div className={`p-2 rounded-full ${
              networkQuality === 'good' ? 'bg-green-500/20' :
              networkQuality === 'medium' ? 'bg-yellow-500/20' : 'bg-red-500/20'
            }`}>
              {networkQuality === 'poor' ? (
                <WifiOff className="w-4 h-4 text-red-400" />
              ) : (
                <Wifi className={`w-4 h-4 ${
                  networkQuality === 'good' ? 'text-green-400' : 'text-yellow-400'
                }`} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Points Counter */}
      <div className="absolute top-4 right-4 px-4 py-2 rounded-full bg-black/50 border border-white/10">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#00ff88]" />
          <span className="text-white font-medium">{currentPoints - stats.pointsUsed}</span>
          <span className="text-white/40">/ {maxPoints}</span>
        </div>
      </div>

      {/* Hardware Info (si PC gamer detecte) */}
      {hardware?.isGamingPC && !isPlaying && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-20 left-4 right-4 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/30"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Monitor className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-400">PC Gaming detecte</p>
              <p className="text-xs text-white/60">{hardware.gpuName} - Traitement local disponible</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            <Button
              onClick={isPlaying ? handleStop : handleStart}
              disabled={currentPoints <= 0}
              className={`px-6 py-2 rounded-xl font-medium transition-all ${
                isPlaying 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-[#00ff88] hover:bg-[#00dd77] text-black'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Arreter
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Demarrer
                </>
              )}
            </Button>

            {cameraEnabled && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCameraEnabled(false)}
                className="text-white/60 hover:text-white"
              >
                <CameraOff className="w-5 h-5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className="text-white/60 hover:text-white"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Mode Selector */}
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 text-white/60 hover:text-white"
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm">{preferences.mode === 'auto' ? 'Auto' : preferences.mode === 'local' ? 'Local' : 'Cloud'}</span>
                <ChevronDown className="w-4 h-4" />
              </Button>

              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full right-0 mb-2 w-64 p-4 rounded-xl bg-black/90 border border-white/10 backdrop-blur-xl"
                  >
                    <h4 className="text-sm font-medium text-white mb-3">Mode de traitement</h4>
                    
                    {/* Message PC Gamer - Mode Local Force */}
                    {hardware?.isGamingPC ? (
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Cpu className="w-4 h-4 text-green-400" />
                            <p className="text-sm font-medium text-green-400">Mode Local Active</p>
                          </div>
                          <p className="text-xs text-white/60">
                            PC Gaming detecte. Le traitement s&apos;effectue directement sur votre GPU pour des performances optimales.
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5">
                          <p className="text-xs text-white/70 font-medium">{hardware.gpuName}</p>
                          <p className="text-xs text-white/40">{hardware.vram}GB VRAM</p>
                        </div>
                      </div>
                    ) : (
                      /* Options pour PC classique */
                      <div className="space-y-2">
                        {[
                          { id: 'auto', label: 'Automatique', desc: 'Choisit le meilleur mode' },
                          { id: 'cloud', label: 'Cloud', desc: 'Serveurs haute performance' }
                        ].map(option => (
                          <button
                            key={option.id}
                            onClick={() => handleModeChange(option.id as 'auto' | 'local' | 'cloud')}
                            className={`w-full p-3 rounded-lg text-left transition-all ${
                              preferences.mode === option.id 
                                ? 'bg-[#00ff88]/20 border border-[#00ff88]/50' 
                                : 'bg-white/5 border border-transparent hover:bg-white/10'
                            }`}
                          >
                            <p className="text-sm font-medium text-white">{option.label}</p>
                            <p className="text-xs text-white/50">{option.desc}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Plan Limits Info */}
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-white/40 mb-2">Limites de votre plan ({userPlan})</p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-white/5">
                          <p className="text-sm font-medium text-white">{limits.maxFps}</p>
                          <p className="text-xs text-white/40">FPS max</p>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5">
                          <p className="text-sm font-medium text-white">{limits.maxResolution}</p>
                          <p className="text-xs text-white/40">Resolution</p>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5">
                          <p className="text-sm font-medium text-white">{limits.maxMinutes}</p>
                          <p className="text-xs text-white/40">Minutes</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white/60 hover:text-white"
            >
              <Maximize2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-20 left-4 right-4 p-4 rounded-xl bg-red-500/20 border border-red-500/50"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-400">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => connect()}
              className="text-red-400 hover:text-red-300"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Reessayer
            </Button>
          </div>
        </motion.div>
      )}

      {/* Connection Status */}
      {processingMode === 'cloud' && (
        <div className={`absolute bottom-20 right-4 w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
        }`} />
      )}
    </div>
  )
}
