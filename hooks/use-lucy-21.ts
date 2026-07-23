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

  // --- Retour temps reel Lucy 2.5 ---
  // Secondes de generation ecoulees, remontees precisement par le serveur.
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  // Verdict de qualite reseau : 'good' | 'fair' | 'poor' | 'critical' | null.
  const [connectionQuality, setConnectionQuality] = useState<string | null>(null)
  // Facteur limitant (latence, bande passante, pertes...), pour l'info-bulle.
  const [qualityFactor, setQualityFactor] = useState<string | null>(null)
  // Position dans la file d'attente quand les serveurs sont satures.
  const [queuePosition, setQueuePosition] = useState<{ position: number; queueSize: number } | null>(null)
  // Resolution reellement active (720p ou 1080p) pour l'afficher a l'ecran.
  const [activeResolution, setActiveResolution] = useState<'720p' | '1080p'>('720p')

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const realtimeClientRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // Garde-fou : la session n'est consideree "active" (et donc facturee cote
  // page) qu'a la 1ere vraie image transformee recue, JAMAIS pendant la chauffe
  // du modele (ecran noir). Evite de debiter le client pour rien.
  const firstFrameRef = useRef(false)
  const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [])

  const disconnect = useCallback(() => {
    // Annuler le garde-fou de demarrage et reinitialiser l'etat 1ere image.
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current)
      connectTimeoutRef.current = null
    }
    firstFrameRef.current = false

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

    // 3. Couper egalement les tracks attaches aux elements video (flux local
    //    et flux affiche) pour eteindre le voyant camera et liberer la
    //    ressource dans tous les cas.
    const localStream = localVideoRef.current?.srcObject as MediaStream | null
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
    }
    const remoteStream = remoteVideoRef.current?.srcObject as MediaStream | null
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop())
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

    setIsConnected(false)
    setIsConnecting(false)
    setConnectionState('disconnected')
    setError(null)
    setElapsedSeconds(0)
    setConnectionQuality(null)
    setQualityFactor(null)
    setQueuePosition(null)
  }, [])

  const connect = useCallback(async (
    avatarImageUrl: string,
    options?: {
      // true = 1080p (reserve VIP cote page). Sinon 720p.
      hd?: boolean
      // Codec video prefere : h264 (compatibilite max), vp8, vp9 (meilleure compression).
      codec?: 'h264' | 'vp8' | 'vp9'
    },
  ) => {
    disconnect()
    setIsConnecting(true)
    setError(null)
    setConnectionState('connecting')

    const useHd = options?.hd === true
    const resolution: '720p' | '1080p' = useHd ? '1080p' : '720p'
    setActiveResolution(resolution)

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
        // Capture en 1080p pour le mode HD (VIP), sinon 720p. On demande la
        // resolution "ideale" pour degrader proprement si la camera ne suit pas.
        const camWidth = useHd ? 1920 : 1280
        const camHeight = useHd ? 1080 : 720
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: camWidth },
            height: { ideal: camHeight },
            frameRate: { ideal: 30 },
          },
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

      // Marque la session reellement active : appele UNIQUEMENT a la 1ere vraie
      // image transformee. C'est ce qui declenche la facturation cote page
      // (l'effet de facturation est cale sur isConnected). Tant qu'on est en
      // chauffe (ecran noir), on reste "isConnecting" => aucun debit.
      const markLive = () => {
        if (firstFrameRef.current) return
        firstFrameRef.current = true
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current)
          connectTimeoutRef.current = null
        }
        setIsConnected(true)
        setIsConnecting(false)
        setConnectionState('connected')
      }

      const realtimeClient = await client.realtime.connect(stream, {
        model: models.realtime('lucy-2.5'),
        // IMPORTANT : on DESACTIVE le miroir interne du SDK.
        // Avec `mirror: 'auto'`, le SDK enveloppe la camera dans un pipeline
        // MediaStreamTrackProcessor dont le dispose n'annule pas le flux de
        // lecture : la camera reste alors ALLUMEE apres l'arret du swap
        // (voyant actif) jusqu'au rechargement de la page. En publiant
        // directement le flux camera brut, `disconnect()` (qui coupe les
        // tracks) eteint reellement la camera. L'effet miroir "selfie" est
        // reproduit en pur CSS (scaleX(-1)) sur les deux videos de la page.
        mirror: false,
        // Resolution : 1080p en mode HD (VIP), 720p sinon.
        resolution,
        // Codec video prefere si fourni (sinon negociation par defaut du SDK).
        ...(options?.codec ? { preferredVideoCodec: options.codec } : {}),

        // Qualite reseau en direct : verdict lisse + facteur limitant.
        onConnectionQuality: (report: any) => {
          setConnectionQuality(report?.quality ?? null)
          setQualityFactor(
            report?.limitingFactor && report.limitingFactor !== 'none'
              ? report.limitingFactor
              : null,
          )
        },
        // Position dans la file d'attente quand les serveurs sont satures.
        onQueuePosition: (qp: any) => {
          setQueuePosition(
            qp ? { position: qp.position, queueSize: qp.queueSize } : null,
          )
        },

        // IMPORTANT : on passe l'avatar (image + prompt) via `initialState`.
        // Ainsi le SDK applique l'etat initial pendant le handshake de
        // connexion, une fois la WebSocket de signalisation reellement ouverte.
        // Appeler `set()` juste apres `connect()` provoquait l'erreur
        // "WebSocket is not open" (l'etat LiveKit est "connected" mais la
        // WebSocket de signalisation ne l'est pas encore).
        initialState: {
          image: avatarBlob,
          prompt: {
            text: 'Full body swap. Replace the person with the one in the reference image. Keep natural movements and expressions.',
            enhance: true,
          },
        },

        // Affichage direct du flux transforme renvoye par Decart, sans aucun
        // traitement intermediaire. Le badge natif "AI Generated" de Decart
        // reste visible, c'est normal et attendu.
        onRemoteStream: (transformedStream: MediaStream) => {
          const el = remoteVideoRef.current
          if (!el) return
          el.srcObject = transformedStream
          // Forcer la lecture (corrige l'ecran noir si l'autoplay ne demarre pas).
          el.play().catch(() => {})

          // Detecter la 1ere image reellement peinte avant de facturer.
          const elAny = el as HTMLVideoElement & {
            requestVideoFrameCallback?: (cb: () => void) => number
          }
          if (typeof elAny.requestVideoFrameCallback === 'function') {
            elAny.requestVideoFrameCallback(() => markLive())
          } else {
            el.onplaying = () => markLive()
          }
        },
      })

      realtimeClientRef.current = realtimeClient

      // L'avatar de reference est deja transmis via `initialState` ci-dessus :
      // aucun appel `set()` immediat ici (cela declenchait "WebSocket is not
      // open" car la WebSocket de signalisation n'etait pas encore ouverte).

      // On NE facture PAS sur 'connected'/'generating' : ces etats signifient que
      // la connexion WebRTC est etablie, pas que l'image transformee est affichee.
      // La facturation demarre via markLive() (1ere vraie image).
      realtimeClient.on('connectionChange', (state: string) => {
        setConnectionState(state)
      })

      // Timer PRECIS de generation : le serveur remonte les secondes reellement
      // consommees. Bien plus fiable que notre estimation locale pour afficher
      // la duree et caler les points.
      realtimeClient.on('generationTick', (tick: { seconds: number }) => {
        if (typeof tick?.seconds === 'number') setElapsedSeconds(tick.seconds)
      })

      // Fin de session cote serveur : on connait la RAISON (solde epuise,
      // inactivite, erreur serveur...) pour afficher un message clair.
      realtimeClient.on('generationEnded', (ended: { seconds: number; reason: string }) => {
        const reason = ended?.reason || ''
        const friendly =
          /quota|credit|point|balance|insufficient/i.test(reason)
            ? 'Session terminee : points epuises.'
            : /idle|inactiv|timeout/i.test(reason)
              ? 'Session terminee pour inactivite.'
              : /server|internal|error/i.test(reason)
                ? 'Session interrompue par le serveur. Reessaie dans un instant.'
                : 'Session de transformation terminee.'
        setError(friendly)
        disconnect()
      })

      // Alerte reseau (evenement brut) : on garde le dernier verdict a jour meme
      // si onConnectionQuality n'a pas encore ete appele.
      realtimeClient.on('connectionQuality', (report: any) => {
        setConnectionQuality(report?.quality ?? null)
      })

      // Garde-fou : si aucune image transformee n'arrive en 20s, on coupe et on
      // previent l'utilisateur, sans jamais l'avoir facture pour l'ecran noir.
      connectTimeoutRef.current = setTimeout(() => {
        if (!firstFrameRef.current) {
          setError("La transformation n'a pas demarre. Reessaie dans un instant.")
          disconnect()
        }
      }, 20000)

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
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current)
        connectTimeoutRef.current = null
      }
      firstFrameRef.current = false
      setIsConnected(false)
      setConnectionState('error')
      setError(err.message || 'Erreur de connexion')
      setIsConnecting(false)
    }
  }, [disconnect])

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

  // Appliquer un prompt Lucy 2.5 A CHAUD pendant le live (decor, style, effets,
  // arriere-plans...) sans couper la session ni la camera. C'est la
  // fonctionnalite phare de Lucy 2.5 : le rendu change en direct.
  // Reserve aux offres VIP cote UI ; ici on expose juste la capacite technique.
  const setLivePrompt = useCallback(async (prompt: string, enhance = true) => {
    const client = realtimeClientRef.current
    if (!client || !prompt.trim()) return
    try {
      // setPrompt(text, { enhance }) est l'API temps reel du SDK Decart.
      await client.setPrompt(prompt.trim(), { enhance })
    } catch (err) {
      console.error('[Lucy 2.5] Erreur application prompt live:', err)
      // Repli : certaines versions du SDK n'exposent que set().
      try {
        await client.set({ prompt: prompt.trim(), enhance })
      } catch (err2) {
        console.error('[Lucy 2.5] Repli set() echoue:', err2)
      }
    }
  }, [])

  return {
    isConnected,
    isConnecting,
    connectionState,
    error,
    localVideoRef,
    remoteVideoRef,
    connect,
    disconnect,
    updateAvatar,
    setLivePrompt,
    // Retour temps reel Lucy 2.5
    elapsedSeconds,
    connectionQuality,
    qualityFactor,
    queuePosition,
    activeResolution,
  }
}
