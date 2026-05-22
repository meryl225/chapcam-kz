'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Camera, Zap, Clock, Coins, Plus, Check, AlertCircle } from 'lucide-react'

const SUPABASE_URL = 'https://ojmzqokffbptmcktnwdy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbXpxb2tmZmJwdG1ja3Rud2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTAzNTYsImV4cCI6MjA5NDg4NjM1Nn0.e9sk4b_15ge2LIIQwFpXC3n_q48ctu9IJ6oJxV85kgw'

interface Avatar {
  id: string
  name: string
  image_url: string
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

  // Load avatars from Supabase
  useEffect(() => {
    const loadAvatars = async () => {
      try {
        const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) return

        // Load user points
        const { data: userData } = await supabase
          .from('users')
          .select('points')
          .eq('id', user.id)
          .single()
        
        if (userData) {
          setUserPoints(userData.points || 0)
        }

        // Load avatars
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

  // Start camera
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
      setError('Impossible d\'accéder à la caméra')
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  // Deduct points every second during swap
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

  // Capture and swap frame
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
          targetImage: selectedAvatar.image_url,
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

  // Start swap loop
  const startSwap = async () => {
    if (!selectedAvatar) {
      setError('Sélectionne un avatar d\'abord')
      return
    }
    if (userPoints < 2) {
      setError('
