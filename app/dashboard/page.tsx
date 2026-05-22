'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Camera, Zap, Clock, Coins, Plus, Check, AlertCircle, Loader2, Square, Wifi, WifiOff } from 'lucide-react'
import { useLucy21 } from '@/hooks/use-lucy-21'

const SUPABASE_URL = 'https://ojmzqokffbptmcktnwdy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbXpxb2tmZmJwdG1ja3Rud2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTAzNTYsImV4cCI6MjA5NDg4NjM1Nn0.e9sk4b_15ge2LIIQwFpXC3n_q48ctu9IJ6oJxV85kgw'

// Cost: 2 points per second of swap
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
  const [userId, setUserId] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [pointsUsed, setPointsUsed] = useState(0)
  const [stats, setStats] = useState<{ fps?: number; bitrate?: number; rtt?: number } | null>(null)

  const {
    isConnected,
    isConnecting,
    connectionState,
    error,
    localVideoRef,
    remoteVideoRef,
    connect,
    disconnect,
    updateAvatar,
  } = useLucy21({
    onError: (err) => console.error('[Dashboard] Lucy error:', err),
    onConnectionChange: (state) => console.log('[Dashboard] Connection state:', state),
    onStats: (s) => setStats({ fps: s?.framesPerSecond, bitrate: s?.bitrate, rtt: s?.roundTripTime }),
  })

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Load user data and avatars
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      // Get user points from subscriptions table
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('points_remaining')
        .eq('user_id', user.id)
        .single()

      if (subscription) setUserPoints(subscription.points_remaining || 0)

      // Get avatars
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

  // Track duration and points when connected
  useEffect(() => {
    if (!isConnected) return

    const interval = setInterval(() => {
      setDuration(prev => prev + 1)
      setPointsUsed(prev => prev + POINTS_PER_SECOND)
      setUserPoints(prev => {
        const newPoints = Math.max(0, prev - POINTS_PER_SECOND)
        if (newPoints === 0) {
          disconnect()
        }
        return newPoints
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isConnected, disconnect])

  // Save points when disconnecting
  useEffect(() => {
    if (!isConnected && userId && pointsUsed > 0) {
      supabase
        .from('subscriptions')
        .update({ points_remaining: userPoints })
        .eq('user_id', userId)
    }
  }, [isConnected, userId, pointsUsed, userPoints])

  const handleStartSwap = async () => {
    if (!selectedAvatar) return
    if (userPoints < POINTS_PER_SECOND) return

    setDuration(0)
    setPointsUsed(0)
    
    await connect(selectedAvatar.url)
  }

  const handleStopSwap = () => {
    disconnect()
  }

  const handleSelectAvatar = async (avatar: Avatar) => {
    setSelectedAvatar(avatar)

    // Update active status in DB
    if (userId) {
      await supabase
        .from('user_avatars')
        .update({ is_active: false })
        .eq('user_id', userId)

      await supabase
        .from('user_avatars')
        .update({ is_active: true })
        .eq('id', avatar.id)

      setAvatars(prev => prev.map(a => ({
        ...a,
        is_active: a.id === avatar.id
      })))
    }

    // Update avatar if already connected
    if (isConnected) {
      try {
        await updateAvatar(avatar.url)
      } catch (err) {
        console.error('Failed to update avatar:', err)
      }
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
          <p className="text-gray-400 text-sm">
            WebRTC realtime avec Lucy 2.1 - Full body transformation (720p, 25fps)
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-white font-bold">{userPoints.toLocaleString()}</span>
            <span className="text-gray-400 text-sm">points</span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Camera Feed */}
        <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
          <div className="bg-[#0a0a0a] px-4 py-2 flex items-center gap-2 border-b border-[#222]">
            <Camera className="w-4 h-4 text-blue-500" />
            <span className="text-white font-medium">CAMERA REELLE</span>
            {isConnected && (
              <span className="ml-auto flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-blue-500 text-xs">LIVE</span>
              </span>
            )}
          </div>
          <div className="aspect-video bg-[#0a0a0a] relative flex items-center justify-center">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {!isConnected && !isConnecting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-[#0a0a0a]">
                <Camera className="w-12 h-12 mb-2 opacity-50" />
                <p>Camera inactive</p>
              </div>
            )}
          </div>
        </div>

        {/* Right - Transformed Output */}
        <div className="bg-[#111] border border-[#00ff88]/30 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,255,136,0.1)]">
          <div className="bg-[#0a0a0a] px-4 py-2 flex items-center gap-2 border-b border-[#00ff88]/30">
            <Zap className="w-4 h-4 text-[#00ff88]" />
            <span className="text-white font-medium">LUCY 2.1 OUTPUT</span>
            {stats?.fps && (
              <span className="ml-2 text-xs text-gray-400">{Math.round(stats.fps)} FPS</span>
            )}
            {stats?.rtt && (
              <span className="text-xs text-gray-400">| {Math.round(stats.rtt)}ms</span>
            )}
            {isConnected && (
              <span className="ml-auto flex items-center gap-1">
                <Wifi className="w-3 h-3 text-[#00ff88]" />
                <span className="text-[#00ff88] text-xs">WEBRTC</span>
              </span>
            )}
          </div>
          <div className="aspect-video bg-[#0a0a0a] relative flex items-center justify-center border-2 border-[#00ff88]/20">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!isConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-[#0a0a0a]">
                <Zap className="w-12 h-12 mb-2 opacity-50" />
                <p>{isConnecting ? 'Connexion WebRTC...' : 'Swap inactif'}</p>
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
            {isConnected ? (
              <Wifi className="w-4 h-4 text-[#00ff88]" />
            ) : (
              <WifiOff className="w-4 h-4 text-gray-500" />
            )}
            <span className={`text-sm ${isConnected ? 'text-[#00ff88]' : 'text-gray-400'}`}>
              {connectionState === 'generating' ? 'Transforming' : connectionState}
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

      {/* Action Button */}
      <button
        onClick={isConnected ? handleStopSwap : handleStartSwap}
        disabled={(!selectedAvatar || userPoints < POINTS_PER_SECOND) && !isConnected}
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
            CONNEXION WEBRTC...
          </>
        ) : isConnected ? (
          <>
            <Square className="w-5 h-5" />
            ARRETER LE SWAP
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            {selectedAvatar ? 'DEMARRER LUCY 2.1' : 'SELECTIONNE UN AVATAR'}
          </>
        )}
      </button>

      {/* Avatars Grid */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold">MES AVATARS</h2>
          <a
            href="/dashboard/avatars"
            className="flex items-center gap-1 text-[#00ff88] hover:underline text-sm"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </a>
        </div>

        {avatars.length === 0 ? (
          <div className="text-center py-12">
            <Zap className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400 mb-4">Aucun avatar</p>
            <a
              href="/dashboard/avatars"
              className="inline-flex items-center gap-2 bg-[#00ff88] hover:bg-[#00dd77] text-black px-4 py-2 rounded-lg font-medium"
            >
              <Plus className="w-4 h-4" />
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
                  selectedAvatar?.id === avatar.id
                    ? 'border-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.3)]'
                    : 'border-[#333] hover:border-[#555]'
                }`}
              >
                <img
                  src={avatar.url}
                  alt={avatar.name}
                  className="w-full h-full object-cover"
                />
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
