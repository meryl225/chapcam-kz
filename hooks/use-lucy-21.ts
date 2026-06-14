'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createDecartClient, models } from '@decartai/sdk'

// 2 points = 1 seconde de swap
const POINTS_PER_SECOND = 2
// Intervalle d'envoi de la deduction au serveur (en secondes).
// Plus court = arret plus precis a l'epuisement, moins de points "perdus".
const DEDUCTION_INTERVAL = 5

export function useLucy21() {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionState, setConnectionState] = useState('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [pointsUsed, setPointsUsed] = useState(0)
  const [sessionDuration, setSessionDuration] = useState(0)
  // Flux brut renvoye par Decart (avec watermark), expose separement de
  // remoteVideoRef. C'est ce flux qui doit etre consomme par tout traitement
  // (ex: retrait de watermark) - remoteVideoRef ne doit recevoir QUE le
  // resultat final a afficher, jamais directement ecrit par Decart, pour
  // eviter toute course d'ecriture concurrente sur srcObject.
  const [remoteRawStream, setRemoteRawStream] = useState<MediaStream | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const realtimeClientRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sessionStartRef = useRef<number | null>(null)
  const pointsIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Deduire les points toutes les secondes pendant le swap
  const startPointsDeduction = useCallback(() => {
    if (pointsIntervalRef.current) {
      clearInterval(pointsIntervalRef.current)
    }

    sessionStartRef.current = Date.now()
    setPointsUsed(0)
    setSessionDuration(0)

    // Deduire 2 points par seconde (affichage local chaque seconde)
    pointsIntervalRef.current = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - (sessionStartRef.current || Date.now())) / 1000)
      const points = elapsed * POINTS_PER_SECOND
      setSessionDuration(elapsed)
      setPointsUsed(points)

      // Envoyer la deduction au serveur a chaque palier (toutes les 5s)
      if (elapsed > 0 && elapsed % DEDUCTION_INTERVAL === 0) {
        try {
          const res = await fetch('/api/points', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pointsToDeduct: DEDUCTION_INTERVAL * POINTS_PER_SECOND,
              sessionDuration: DEDUCTION_INTERVAL,
            }),
          })
          const data = await res.json().catch(() => null)

          // Plus de points OU solde epuise par cette deduction -> couper le swap.
          // Si la reponse est illisible/undefined, on coupe aussi par securite.
          if (!data?.success || data?.depleted) {
            disconnect()
          }
        } catch (err) {
          console.error('[Lucy 2.1] Points deduction error:', err)
        }
      }
    }, 1000)
  }, [])

  const stopPointsDeduction = useCallback(async () => {
    if (pointsIntervalRef.current) {
      clearInterval(pointsIntervalRef.current)
      pointsIntervalRef.current = null
    }

    // Deduire les secondes restantes non encore facturees (< 1 palier)
    if (sessionStartRef.current) {
      const totalSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000)
      const remainingSeconds = totalSeconds % DEDUCTION_INTERVAL // Secondes non encore deduites

      if (remainingSeconds > 0) {
        try {
          await fetch('/api/points', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pointsToDeduct: remainingSeconds * POINTS_PER_SECOND,
              sessionDuration: remainingSeconds
            })
          })
        } catch (err) {
          console.error('[Lucy 2.1] Final points deduction error:', err)
        }
      }
    }

    sessionStartRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
      stopPointsDeduction()
    }
  }, [])

  const disconnect = useCallback(() => {
    // Arreter la deduction de points
    stopPointsDeduction()

    // 1. Fermer la session Decart (arrete la facturation cote serveur)
    if (realtimeClientRef.current) {
      try {
        realtimeClientRef.current.disconnect()
      } catch (e) {
        console.error('[Lucy 2.1] Erreur disconnect Decart:', e)
      }
      realtimeClientRef.current = null
    }

    // 2. Couper la camera locale (tous les tracks du flux capture)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // 3. Couper egalement les tracks attaches aux elements video et au flux
    //    brut Decart expose (flux local, flux brut Decart, flux affiche)
    //    pour eteindre le voyant camera et liberer la ressource dans tous
    //    les cas.
    const localStream = localVideoRef.current?.srcObject as MediaStream | null
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
    }
    const remoteStream = remoteVideoRef.current?.srcObject as MediaStream | null
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop())
    }
    if (remoteRawStream) {
      remoteRawStream.getTracks().forEach((track) => track.stop())
    }

    // 4. Detacher et mettre en pause les elements video
    if (localVideoRef.current) {
      localVideoRef.current.pause()
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.pause()
      remoteVideoRef.current.srcObject = null
    }

    setRemoteRawStream(null)
    setIsConnected(false)
    setIsConnecting(false)
    setConnectionState('disconnected')
    setError(null)
  }, [stopPointsDeduction, remoteRawStream])

  const connect = useCallback(async (avatarImageUrl: string) => {
    disconnect()
    setIsConnecting(true)
    setError(null)
    setConnectionState('connecting')

    try {
      // Verifier les points disponibles avant de commencer.
      // Il suffit d'avoir au moins 1 palier de points (5s) pour demarrer ;
      // le client pourra ensuite swaper jusqu'a epuisement total du solde.
      const pointsRes = await fetch('/api/points')
      const pointsData = await pointsRes.json().catch(() => null)

      const minToStart = POINTS_PER_SECOND * DEDUCTION_INTERVAL // 10 points = 5s
      if (!pointsData?.success || (pointsData?.points ?? 0) < minToStart) {
        throw new Error('Points insuffisants. Recharge ton compte pour utiliser le swap.')
      }

      const tokenRes = await fetch('/api/decart-token')
      const tokenData = await tokenRes.json().catch(() => null)
      const clientToken = tokenData?.token
      if (!tokenRes.ok || !clientToken) {
        throw new Error('Service de transformation indisponible pour le moment. Reessaie dans un instant.')
      }

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
        resolution: '720p',

        // IMPORTANT : on n'ecrit JAMAIS directement sur remoteVideoRef ici.
        // On expose le flux brut via remoteRawStream (etat React). C'est au
        // consommateur (page) de decider quoi afficher dans remoteVideoRef
        // (flux brut tel quel, ou flux nettoye du watermark).
        // Cela evite une course d'ecriture sur srcObject si Decart rappelle
        // onRemoteStream plusieurs fois (renegociation) alors qu'un
        // traitement externe a deja remplace le srcObject affiche.
        onRemoteStream: (transformedStream: MediaStream) => {
          setRemoteRawStream(transformedStream)
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
          // Demarrer la deduction de points quand connecte
          startPointsDeduction()
        }
      })

      setIsConnected(true)
      setIsConnecting(false)

    } catch (err: any) {
      console.error('[Lucy 2.1]', err)
      // Nettoyage complet : couper la camera et fermer toute session Decart
      // ouverte avant l'echec, pour ne pas laisser la camera allumee ni
      // facturer Decart inutilement.
      if (realtimeClientRef.current) {
        try {
          realtimeClientRef.current.disconnect()
        } catch {}
        realtimeClientRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      const localStream = localVideoRef.current?.srcObject as MediaStream | null
      if (localStream) localStream.getTracks().forEach((track) => track.stop())
      if (localVideoRef.current) {
        localVideoRef.current.pause()
        localVideoRef.current.srcObject = null
      }
      setRemoteRawStream(null)
      stopPointsDeduction()
      setIsConnected(false)
      setConnectionState('error')
      setError(err.message || 'Erreur de connexion')
      setIsConnecting(false)
    }
  }, [disconnect, startPointsDeduction, stopPointsDeduction])

  // Changer d'avatar a chaud, sans couper la session Decart en cours.
  const updateAvatar = useCallback(async (avatarImageUrl: string) => {
    if (!realtimeClientRef.current) return
    try {
      const avatarRes = await fetch(avatarImageUrl)
      const avatarBlob = await avatarRes.blob()
      await realtimeClientRef.current.set({
        image: avatarBlob,
        prompt: "Full body swap. Replace the person with the one in the reference image. Keep natural movements and expressions.",
        enhance: true,
      })
    } catch (err) {
      console.error('[Lucy 2.1] Erreur changement avatar:', err)
    }
  }, [])

  return {
    isConnected,
    isConnecting,
    connectionState,
    error,
    localVideoRef,
    remoteVideoRef,
    remoteRawStream,
    connect,
    disconnect,
    updateAvatar,
    pointsUsed,
    sessionDuration,
  }
}
