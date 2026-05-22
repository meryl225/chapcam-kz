'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Camera, Zap, Clock, Coins, Plus, Check, AlertCircle } from 'lucide-react'

const SUPABASE_URL = 'https://ojmzqokffbptmcktnwdy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbXpxb2tmZmJwdG1ja3Rud2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTAzNTYsImV4cCI6MjA5NDg4NjM1Nn0.e9sk4b_15ge2LIIQwFpXC3n_q48ctu9IJ6oJxV85kgw'

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
  const [cameraActive, setCameraActive] = useState(false)
  const [swapActive, setSwapActive] = useState(false)
  const [duration, setDuration] = useState(0)
  const [pointsUsed, setPointsUsed] = useState(0)
  const [userPoints, setUserPoints] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const swapCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const pointsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const loadAvatars = async () => {
      try {
        const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) return

        const { data: userData } = await supabase
          .from('users')
          .select('points')
          .eq('id', user.id)
          .single()
        
        if (userData) {
          setUserPoints(userData.points || 0)
        }

        const { data, error } = await supabase
          .from('user_avatars')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        
        if (data && data.length > 0) {
          setAvatars(data)
          const activeAvatar = data.find(a => a.is_active)
          if (activeAvatar) {
            setSelectedAvatar(activeAvatar)
          }
        }
      } catch (err) {
        console.error('Error loading avatars:', err)
      }
    }

    loadAvatars()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setCameraActive(true)
      }
    } catch (err) {
      setError('Impossible d\'acceder a la camera')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  useEffect(() => {
    if (swapActive && userPoints > 0) {
      pointsIntervalRef.current = setInterval(() => {
        setPointsUsed(prev => prev + 2)
        setUserPoints(prev => {
          const newPoints = Math.max(0, prev - 2)
          if (newPoints === 0) {
            stopSwap()
          }
          return newPoints
        })
        setDuration(prev => prev + 1)
      }, 1000)
    }

    return () => {
      if (pointsIntervalRef.current) {
        clearInterval(pointsIntervalRef.current)
      }
    }
  }, [swapActive])

  const captureAndSwap = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !selectedAvatar) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    const frameDataUrl = canvas.toDataURL('image/jpeg', 0.8)

    try {
      const response = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceImage: frameDataUrl,
          targetImage: selectedAvatar.url,
        }),
      })

      const result = await response.json()
      
      if (result.success && result.image && swapCanvasRef.current) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const swapCtx = swapCanvasRef.current?.getContext('2d')
          if (swapCtx && swapCanvasRef.current) {
            swapCanvasRef.current.width = img.width
            swapCanvasRef.current.height = img.height
            swapCtx.drawImage(img, 0, 0)
          }
        }
        img.src = result.image
      }
    } catch (err) {
      console.error('Swap error:', err)
    }
  }, [selectedAvatar])

  const startSwap = async () => {
    if (!selectedAvatar) {
      setError('Selectionne un avatar d\'abord')
      return
    }
    if (userPoints < 2) {
      setError('Pas assez de points. Recharge ton compte.')
      return
    }

    await startCamera()
    setSwapActive(true)
    setIsSwapping(true)
    setError(null)
    setPointsUsed(0)
    setDuration(0)

    intervalRef.current = setInterval(captureAndSwap, 500)
  }

  const stopSwap = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (pointsIntervalRef.current) {
      clearInterval(pointsIntervalRef.current)
      pointsIntervalRef.current = null
    }

    try {
      const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('users')
          .update({ points: userPoints })
          .eq('id', user.id)
      }
    } catch (err) {
      console.error('Error saving points:', err)
    }

    setSwapActive(false)
    setIsSwapping(false)
    stopCamera()
  }

  const selectAvatar = async (avatar: Avatar) => {
    setSelectedAvatar(avatar)
    
    try {
      const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('user_avatars')
        .update({ is_active: false })
        .eq('user_id', user.id)

      await supabase
        .from('user_avatars')
        .update({ is_active: true })
        .eq('id', avatar.id)

      setAvatars(prev => prev.map(a => ({
        ...a,
        is_active: a.id === avatar.id
      })))
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#00ff88]" />
            LIVE SWAP
          </h1>
          <p className="text-gray-400 text-sm">Camera reelle a gauche, visage swappe a droite en temps reel</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-white font-bold">{userPoints}</span>
            <span className="text-gray-400 text-sm">points</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-500">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <div className="text-center text-gray-500">
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Camera inactive</p>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
          <div className="bg-[#0a0a0a] px-4 py-2 flex items-center gap-2 border-b border-[#222]">
            <Zap className="w-4 h-4 text-[#00ff88]" />
            <span className="text-white font-medium">SWAP EN DIRECT</span>
            {swapActive && (
              <span className="ml-auto flex items-center gap-1">
                <span className="w-2 h-2 bg-[#00ff88] rounded-full animate-pulse" />
                <span className="text-[#00ff88] text-xs">ACTIF</span>
              </span>
            )}
          </div>
          <div className="aspect-video bg-[#0a0a0a] relative flex items-center justify-center border-2 border-[#00ff88]/20">
            <canvas
              ref={swapCanvasRef}
              className={`w-full h-full object-cover ${swapActive ? 'block' : 'hidden'}`}
            />
            {!swapActive && (
              <div className="text-center text-gray-500">
                <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Swap inactif</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-[#111] border border-[#222] rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${swapActive ? 'bg-[#00ff88]' : 'bg-gray-500'}`} />
            <span className="text-gray-400 text-sm">{swapActive ? 'Connecte' : 'Deconnecte'}</span>
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

      <button
        onClick={isSwapping ? stopSwap : startSwap}
        disabled={!selectedAvatar && !isSwapping}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
          isSwapping
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : selectedAvatar
              ? 'bg-[#00ff88] hover:bg-[#00dd77] text-black'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isSwapping ? 'ARRETER LE SWAP' : selectedAvatar ? 'DEMARRER LE SWAP' : 'SELECTIONNE UN AVATAR'}
      </button>

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
            <Zap className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400 mb-4">Aucun avatar</p>
            <a href="/dashboard/avatars" className="inline-flex items-center gap-2 bg-[#00ff88] hover:bg-[#00dd77] text-black px-4 py-2 rounded-lg font-medium">
              <Plus className="w-4 h-4" />
              Creer mon premier avatar
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {avatars.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => selectAvatar(avatar)}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
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
