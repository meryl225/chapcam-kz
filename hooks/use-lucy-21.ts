'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createDecartClient, models } from '@decartai/sdk'

// Fonction pour masquer le watermark en temps reel via Canvas
function createWatermarkRemovalStream(
  sourceVideo: HTMLVideoElement,
  outputCanvas: HTMLCanvasElement
): MediaStream {
  const ctx = outputCanvas.getContext('2d', { willReadFrequently: true })!
  
  // Zone de recherche du watermark (scan toute la video)
  const scanRegions = [
    { x: 0.6, y: 0, w: 0.4, h: 0.15 },      // Haut droite
    { x: 0, y: 0, w: 0.4, h: 0.15 },         // Haut gauche
    { x: 0.3, y: 0, w: 0.4, h: 0.15 },       // Haut centre
    { x: 0.6, y: 0.85, w: 0.4, h: 0.15 },    // Bas droite
    { x: 0, y: 0.85, w: 0.4, h: 0.15 },      // Bas gauche
  ]

  let lastWatermarkRegion: { x: number, y: number, w: number, h: number } | null = null
  let frameCount = 0

  function processFrame() {
    if (sourceVideo.paused || sourceVideo.ended) {
      requestAnimationFrame(processFrame)
      return
    }

    const vw = sourceVideo.videoWidth || 640
    const vh = sourceVideo.videoHeight || 480
    
    if (outputCanvas.width !== vw) outputCanvas.width = vw
    if (outputCanvas.height !== vh) outputCanvas.height = vh

    // Dessiner la frame originale
    ctx.drawImage(sourceVideo, 0, 0, vw, vh)

    // Detecter le watermark toutes les 10 frames pour economiser les performances
    frameCount++
    if (frameCount % 10 === 0 || !lastWatermarkRegion) {
      lastWatermarkRegion = detectWatermark(ctx, vw, vh, scanRegions)
    }

    // Masquer le watermark si detecte
    if (lastWatermarkRegion) {
      applyBlur(ctx, lastWatermarkRegion, vw, vh)
    }

    requestAnimationFrame(processFrame)
  }

  function detectWatermark(
    ctx: CanvasRenderingContext2D, 
    vw: number, 
    vh: number,
    regions: Array<{ x: number, y: number, w: number, h: number }>
  ): { x: number, y: number, w: number, h: number } | null {
    // Chercher le texte blanc/gris clair sur fond variable
    for (const region of regions) {
      const rx = Math.floor(region.x * vw)
      const ry = Math.floor(region.y * vh)
      const rw = Math.floor(region.w * vw)
      const rh = Math.floor(region.h * vh)

      try {
        const imageData = ctx.getImageData(rx, ry, rw, rh)
        const data = imageData.data

        // Detecter des pixels clairs (texte blanc/gris)
        let lightPixelCount = 0
        let lightPixelSum = { x: 0, y: 0 }
        let minX = rw, maxX = 0, minY = rh, maxY = 0

        for (let y = 0; y < rh; y++) {
          for (let x = 0; x < rw; x++) {
            const i = (y * rw + x) * 4
            const r = data[i], g = data[i + 1], b = data[i + 2]
            
            // Detecter les pixels gris/blanc (texte du watermark)
            const brightness = (r + g + b) / 3
            const isGrayish = Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30
            
            if (brightness > 180 && isGrayish) {
              lightPixelCount++
              lightPixelSum.x += x
              lightPixelSum.y += y
              minX = Math.min(minX, x)
              maxX = Math.max(maxX, x)
              minY = Math.min(minY, y)
              maxY = Math.max(maxY, y)
            }
          }
        }

        // Si on detecte assez de pixels clairs alignes (potentiel texte)
        if (lightPixelCount > 50 && (maxX - minX) > 50 && (maxY - minY) < 40) {
          return {
            x: rx + minX - 10,
            y: ry + minY - 5,
            w: (maxX - minX) + 20,
            h: (maxY - minY) + 15
          }
        }
      } catch (e) {
        // Ignore les erreurs de getImageData
      }
    }
    return null
  }

  function applyBlur(
    ctx: CanvasRenderingContext2D,
    region: { x: number, y: number, w: number, h: number },
    vw: number,
    vh: number
  ) {
    // Clamp les valeurs
    const x = Math.max(0, region.x)
    const y = Math.max(0, region.y)
    const w = Math.min(region.w, vw - x)
    const h = Math.min(region.h, vh - y)

    // Sauvegarder le contexte
    ctx.save()

    // Appliquer un flou sur la zone detectee
    ctx.filter = 'blur(8px)'
    ctx.drawImage(
      ctx.canvas,
      x, y, w, h,
      x, y, w, h
    )

    ctx.restore()
  }

  // Demarrer le traitement
  requestAnimationFrame(processFrame)

  // Retourner le stream du canvas
  return outputCanvas.captureStream(30)
}

export function useLucy21() {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionState, setConnectionState] = useState('disconnected')
  const [error, setError] = useState<string | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const realtimeClientRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => disconnect()
  }, [])

  const disconnect = useCallback(() => {
    if (realtimeClientRef.current) {
      try { realtimeClientRef.current.disconnect() } catch {}
      realtimeClientRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    if (hiddenVideoRef.current) {
      hiddenVideoRef.current.srcObject = null
      hiddenVideoRef.current.remove()
      hiddenVideoRef.current = null
    }
    if (canvasRef.current) {
      canvasRef.current.remove()
      canvasRef.current = null
    }

    setIsConnected(false)
    setIsConnecting(false)
    setConnectionState('disconnected')
    setError(null)
  }, [])

  const connect = useCallback(async (avatarImageUrl: string) => {
    disconnect()
    setIsConnecting(true)
    setError(null)
    setConnectionState('connecting')

    try {
      const tokenRes = await fetch('/api/decart-token')
      const { token: clientToken } = await tokenRes.json()

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, frameRate: 30 }
        })
      } catch (camError: any) {
        if (camError.name === 'NotAllowedError') {
          throw new Error('Acces camera refuse. Autorise ChapCam a acceder a ta camera dans les parametres du navigateur.')
        } else if (camError.name === 'NotFoundError') {
          throw new Error('Aucune camera detectee. Connecte une webcam et reessaie.')
        } else if (camError.name === 'NotReadableError') {
          throw new Error('Camera deja utilisee par une autre application. Ferme les autres apps utilisant la camera.')
        } else {
          throw new Error('Impossible de demarrer la camera: ' + camError.message)
        }
      }
      
      streamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const avatarRes = await fetch(avatarImageUrl)
      const avatarBlob = await avatarRes.blob()

      const client = createDecartClient({ apiKey: clientToken })

      const realtimeClient = await client.realtime.connect(stream, {
        model: models.realtime('lucy-2.1'),
        mirror: 'auto',
        quality: 'high',
        latencyMode: 'low',

        onRemoteStream: (transformedStream: MediaStream) => {
          // Creer un video et canvas caches pour traiter le watermark
          if (!hiddenVideoRef.current) {
            hiddenVideoRef.current = document.createElement('video')
            hiddenVideoRef.current.autoplay = true
            hiddenVideoRef.current.playsInline = true
            hiddenVideoRef.current.muted = true
            hiddenVideoRef.current.style.display = 'none'
            document.body.appendChild(hiddenVideoRef.current)
          }
          if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas')
            canvasRef.current.style.display = 'none'
            document.body.appendChild(canvasRef.current)
          }

          // Assigner le flux original au video cache
          hiddenVideoRef.current.srcObject = transformedStream

          // Attendre que le video soit pret puis creer le flux sans watermark
          hiddenVideoRef.current.onloadedmetadata = () => {
            hiddenVideoRef.current!.play()
            
            // Creer le flux "propre" via canvas
            const cleanStream = createWatermarkRemovalStream(
              hiddenVideoRef.current!,
              canvasRef.current!
            )

            // Assigner le flux propre au video visible
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = cleanStream
            }
          }
        },
      })

      realtimeClientRef.current = realtimeClient

      await realtimeClient.set({
        image: avatarBlob,
        prompt: "Full body swap. Replace the person with the one in the reference image. Keep natural movements and expressions.",
        enhance: true,
      })

      realtimeClient.on('connectionChange', (state: string) => {
        setConnectionState(state)
        if (state === 'connected' || state === 'generating') {
          setIsConnected(true)
          setIsConnecting(false)
        }
      })

      setIsConnected(true)
      setIsConnecting(false)

    } catch (err: any) {
      console.error('[Lucy 2.1]', err)
      setError(err.message || 'Erreur de connexion')
      setIsConnecting(false)
    }
  }, [disconnect])

  return {
    isConnected,
    isConnecting,
    connectionState,
    error,
    localVideoRef,
    remoteVideoRef,
    connect,
    disconnect,
  }
}
