'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Camera, Zap, Clock, Coins, Plus, Check, AlertCircle, Loader2, Square, Wifi, WifiOff, Monitor, Cloud, Settings } from 'lucide-react'
import { useLucy21 } from '@/hooks/use-lucy-21'
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
  const [preferences, setPreferences] = useState<UserProcessingPreferences>(loadProcessingPreferences())
  const [processingMode, setProcessingMode] = useState<'local' | 'cloud'>('cloud')
  const [networkQuality, setNetworkQuality] = useState<'good' | 'medium' | 'poor'>('good')
  const [showModeSettings, setShowModeSettings] = useState(false)
  const [stats, setStats] = useState({ fps: 0, latency: 0, resolution: '720p' })

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
        const pointsData = await pointsRes.json()
        if (pointsData.success) {
          setUserPoints(pointsData.points)
          setMaxPoints(pointsData.maxPoints)
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
        const data = await res.json()
        if (data.success) {
          setUserPoints(data.currentPoints)
          setMaxPoints(data.maxPoints)
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('user_activity')
        .upsert({
          user_id: user.id,
          last_active: new Date().toISOString(),
          current_page: window.location.pathname,
        }, { 
          onConflict: 'user_id' 
        })
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#00ff88]" />
            LIVE SWAP
          </h1>
          <p className="text-emerald-400 text-sm font-medium">
            Change d&apos;apparence en live avec ChapCam
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mode Indicator */}
          <div className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
            processingMode === 'local' 
              ? 'bg-green-500/10 border border-green-500/30' 
              : 'bg-blue-500/10 border border-blue-500/30'
          }`}>
            {processingMode === 'local' ? (
              <Monitor className="w-4 h-4 text-green-400" />
            ) : (
              <Cloud className="w-4 h-4 text-blue-400" />
            )}
            <span className={`text-xs font-medium ${
              processingMode === 'local' ? 'text-green-400' : 'text-blue-400'
            }`}>
              {processingMode === 'local' ? 'LOCAL' : 'CLOUD'}
            </span>
          </div>

          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-white font-bold">{userPoints.toLocaleString()}</span>
            <span className="text-gray-400 text-sm">points</span>
          </div>
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
              <p className="text-xs text-white/60">{hardware.gpuName} | {hardware.vramEstimate}GB VRAM | Mode {processingMode}</p>
            </div>
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowModeSettings(!showModeSettings)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Settings className="w-5 h-5 text-white/60" />
            </button>
            
            {showModeSettings && (
              <div className="absolute top-full right-0 mt-2 w-64 p-4 rounded-xl bg-[#111] border border-[#333] z-50">
                <h4 className="text-sm font-medium text-white mb-3">Mode de traitement</h4>
                
                {/* PC Gamer: Afficher uniquement le mode local force */}
                {hardware?.isGamingPC ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Monitor className="w-4 h-4 text-green-400" />
                        <p className="text-sm font-medium text-green-400">Mode Local Active</p>
                      </div>
                      <p className="text-xs text-white/60">
                        PC Gaming detecte. Le traitement s&apos;effectue directement sur votre GPU pour des performances optimales.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-white/70 font-medium">{hardware.gpuName}</p>
                      <p className="text-xs text-white/40">{hardware.vramEstimate}GB VRAM</p>
                    </div>
                  </div>
                ) : (
                  /* PC classique: Afficher Auto et Cloud uniquement */
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
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
          <div className="bg-[#0a0a0a] px-4 py-2 flex items-center gap-2 border-b border-[#222]">
            <Camera className="w-4 h-4 text-blue-500" />
            <span className="text-white font-medium">CAMERA REELLE</span>
            {isConnected && <span className="ml-auto text-blue-500 text-xs">● LIVE</span>}
          </div>
          <div className="aspect-video bg-[#0a0a0a] relative">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {!isConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                <Camera className="w-12 h-12 mb-2 opacity-50" />
                <p>Camera inactive</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#111] border border-[#00ff88]/30 rounded-xl overflow-hidden">
          <div className="bg-[#0a0a0a] px-4 py-2 flex items-center gap-2 border-b border-[#00ff88]/30">
            <Zap className="w-4 h-4 text-[#00ff88]" />
            <span className="text-white font-medium">CAMERA CHAPCAM</span>
            {isConnected && (
              <div className="ml-auto flex items-center gap-2 text-xs">
                <span className="text-[#00ff88]">{stats.fps} FPS</span>
                <span className="text-white/40">|</span>
                <span className="text-white/60">{stats.resolution}</span>
              </div>
            )}
          </div>
          
          <div className="relative aspect-video bg-[#0a0a0a]">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white text-xs px-3 py-1 rounded-md flex items-center gap-1.5 z-20">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              ChapCam • {processingMode === 'local' ? 'Local' : 'Cloud'}
            </div>

            {!isConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-[#0a0a0a]">
                <Zap className="w-12 h-12 mb-2 opacity-50" />
                <p>{isConnecting ? 'Connexion en cours...' : 'Swap inactif'}</p>
              </div>
            )}
            
            {isConnecting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="w-8 h-8 text-[#00ff88] animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-[#111] border border-[#222] rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            {isConnected ? <Wifi className="w-4 h-4 text-[#00ff88]" /> : <WifiOff className="w-4 h-4 text-gray-500" />}
            <span className={`text-sm ${isConnected ? 'text-[#00ff88]' : 'text-gray-400'}`}>
              {isConnected ? 'En direct' : 'Deconnecte'}
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
          {/* Network Quality */}
          <div className={`flex items-center gap-2 px-2 py-1 rounded ${
            networkQuality === 'good' ? 'bg-green-500/10' :
            networkQuality === 'medium' ? 'bg-yellow-500/10' : 'bg-red-500/10'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              networkQuality === 'good' ? 'bg-green-500' :
              networkQuality === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className={`text-xs ${
              networkQuality === 'good' ? 'text-green-400' :
              networkQuality === 'medium' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {networkQuality === 'good' ? 'Connexion stable' :
               networkQuality === 'medium' ? 'Connexion moyenne' : 'Connexion faible'}
            </span>
          </div>
        </div>
        <div className="text-gray-400 text-sm">
          Avatar : <span className="text-white">{selectedAvatar?.name || 'Aucun'}</span>
        </div>
      </div>

      {/* Bouton Swap */}
      <button
        onClick={isConnected ? handleStopSwap : handleStartSwap}
        disabled={!selectedAvatar && !isConnected}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
          isConnected
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : isConnecting
            ? 'bg-yellow-500 text-black cursor-wait'
            : selectedAvatar && userPoints >= POINTS_PER_SECOND
            ? 'bg-[#00ff88] hover:bg-[#00dd77] text-black'
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            CONNEXION EN COURS...
          </>
        ) : isConnected ? (
          <>
            <Square className="w-5 h-5" />
            ARRETER LE SWAP
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            DEMARRER LE SWAP {processingMode === 'local' ? '(LOCAL)' : '(CLOUD)'}
          </>
        )}
      </button>

      {/* Mes Avatars */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold">MES AVATARS</h2>
          <a href="/dashboard/avatars" className="flex items-center gap-1 text-[#00ff88] hover:underline text-sm">
            <Plus className="w-4 h-4" />
            Ajouter
          </a>
        </div>

        {avatars.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Aucun avatar trouve</p>
            <a href="/dashboard/avatars" className="inline-flex items-center gap-2 bg-[#00ff88] text-black px-4 py-2 rounded-lg font-medium">
              Creer mon premier avatar
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {avatars.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => handleSelectAvatar(avatar)}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                  selectedAvatar?.id === avatar.id ? 'border-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.3)]' : 'border-[#333] hover:border-[#555]'
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
