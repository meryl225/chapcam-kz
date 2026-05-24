'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createDecartClient, models } from '@decartai/sdk'

// Fonction pour cropper la video et eliminer les bords ou le watermark peut apparaitre
function createCroppedStream(
  sourceVideo: HTMLVideoElement,
  outputCanvas: HTMLCanvasElement
): MediaStream {
  const ctx = outputCanvas.getContext('2d')!
  
  // Pourcentage a cropper de chaque cote (12% = elimine le watermark partout)
  const cropPercent = 0.12

  function processFrame() {
    if (sourceVideo.paused || sourceVideo.ended || !sourceVideo.videoWidth) {
      requestAnimationFrame(processFrame)
      return
    }

    const vw = sourceVideo.videoWidth
    const vh = sourceVideo.videoHeight
    
    // Zone source a extraire (sans les bords)
    const cropX = Math.floor(vw * cropPercent)
    const cropY = Math.floor(vh * cropPercent)
    const cropW = Math.floor(vw * (1 - 2 * cropPercent))
    const cropH = Math.floor(vh * (1 - 2 * cropPercent))
    
    // Taille du canvas de sortie
    if (outputCanvas.width !== cropW) outputCanvas.width = cropW
    if (outputCanvas.height !== cropH) outputCanvas.height = cropH

    // Dessiner seulement la partie centrale de la video (sans watermark)
    ctx.drawImage(
      sourceVideo,
      cropX, cropY, cropW, cropH,  // Source: zone centrale
      0, 0, cropW, cropH           // Destination: canvas entier
    )

    requestAnimationFrame(processFrame)
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
            
            // Creer le flux "propre" via canvas (crop les bords)
            const cleanStream = createCroppedStream(
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
