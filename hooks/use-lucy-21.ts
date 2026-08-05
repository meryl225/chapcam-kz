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

  // --- Diagnostic reseau (preflight + in-session) ---
  // Transport WebRTC negocie : 'udp' (direct, ideal), 'relay' (via TURN, +latence),
  // 'failed' (aucun chemin -> c'est l'origine du "could not establish pc connection").
  const [networkTransport, setNetworkTransport] = useState<'udp' | 'relay' | 'failed' | null>(null)
  // RTT reseau mesure au preflight, pour afficher une latence reelle avant de connecter.
  const [preflightRttMs, setPreflightRttMs] = useState<number | null>(null)
  // Latence de bout en bout live (RTT) exposee par les stats WebRTC en session.
  const [liveRttMs, setLiveRttMs] = useState<number | null>(null)
  // FPS reellement rendu par le flux transforme (indicateur de fluidite reelle).
  const [liveFps, setLiveFps] = useState<number | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const realtimeClientRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // Reference serveur reutilisable de l'avatar (client.files.upload().id).
  // Permet de RENVOYER l'image de reference a chaque changement de scene sans
  // re-uploader les octets : c'est ce qui conserve le face swap en direct.
  const avatarRefIdRef = useRef<string | null>(null)
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
    avatarRefIdRef.current = null

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
    setNetworkTransport(null)
    setPreflightRttMs(null)
    setLiveRttMs(null)
    setLiveFps(null)
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
      // ------------------------------------------------------------------
      // DEMARRAGE PARALLELE (optimisation latence de connexion)
      // ------------------------------------------------------------------
      // Avant, ces 4 etapes s'enchainaient sequentiellement : on additionnait
      // la latence reseau de chacune (points -> token -> camera -> avatar) avant
      // meme de lancer le WebRTC. On les lance desormais EN PARALLELE : le temps
      // de demarrage devient celui de la plus lente, pas la somme. La camera
      // (autorisation navigateur) est generalement le facteur limitant, et elle
      // tourne pendant que les fetch reseau se font.
      const camWidth = useHd ? 1920 : 1280
      const camHeight = useHd ? 1080 : 720

      const pointsPromise = fetch('/api/points')
        .then((r) => r.json())
        .catch(() => null)

      const tokenPromise = fetch('/api/decart-token')
        .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => null) }))
        .catch(() => ({ ok: false, data: null as any }))

      const cameraPromise = navigator.mediaDevices
        .getUserMedia({
          video: {
            width: { ideal: camWidth },
            height: { ideal: camHeight },
            frameRate: { ideal: 30 },
          },
        })
        .then((s) => ({ stream: s as MediaStream, error: null as any }))
        .catch((e) => ({ stream: null as any, error: e }))

      const avatarPromise = fetch(avatarImageUrl)
        .then((r) => r.blob())
        .catch(() => null)

      const [pointsData, tokenResult, cameraResult, avatarBlob] = await Promise.all([
        pointsPromise,
        tokenPromise,
        cameraPromise,
        avatarPromise,
      ])

      // 1) Points : au moins 1 palier (5s) pour demarrer.
      const minToStart = POINTS_PER_SECOND * DEDUCTION_INTERVAL // 10 points = 5s
      if (!pointsData?.success || (pointsData?.points ?? 0) < minToStart) {
        cameraResult.stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop())
        throw new Error('Points insuffisants. Recharge ton compte pour utiliser le swap.')
      }

      // 2) Token de transformation.
      const clientToken = tokenResult?.data?.token
      if (!tokenResult?.ok || !clientToken) {
        cameraResult.stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop())
        throw new Error('Service de transformation indisponible pour le moment. Reessaie dans un instant.')
      }

      // 3) Camera : messages d'erreur clairs selon la cause.
      if (cameraResult.error || !cameraResult.stream) {
        const camError = cameraResult.error || { name: '', message: 'inconnue' }
        if (camError.name === 'NotAllowedError') {
          throw new Error('Acces camera refuse. Autorise ChapCam a acceder a ta camera dans les parametres du navigateur.')
        } else if (camError.name === 'NotFoundError') {
          throw new Error('Aucune camera detectee. Connecte une webcam et reessaie.')
        } else if (camError.name === 'NotReadableError') {
          throw new Error('Camera deja utilisee par une autre application. Ferme les autres apps utilisant la camera.')
        } else {
          throw new Error('Impossible de demarrer la camera: ' + (camError.message || 'erreur inconnue'))
        }
      }
      const stream: MediaStream = cameraResult.stream

      // 4) Avatar de reference.
      if (!avatarBlob) {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop())
        throw new Error("Impossible de charger l'avatar de reference. Reessaie.")
      }

      streamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const client = createDecartClient({ apiKey: clientToken })

      // ------------------------------------------------------------------
      // PREFLIGHT RESEAU (corrige "could not establish pc connection")
      // ------------------------------------------------------------------
      // On teste la joignabilite WebRTC AVANT de lancer la vraie session : un
      // mini peer connection jetable contre un STUN public, sans cout ni
      // session. On sait ainsi immediatement si le reseau bloque le WebRTC
      // (pare-feu / UDP bloque / NAT symetrique -> transport 'failed'), au lieu
      // d'attendre 20s pour tomber sur le message cryptique "could not
      // establish pc connection". Si le preflight lui-meme echoue, on n'annule
      // PAS la connexion (il peut y avoir un faux negatif) : on tente quand meme.
      try {
        const report = await client.realtime.checkConnectivity({ iceGatherTimeoutMs: 4000 })
        const transport = report?.metrics?.transport ?? null
        setNetworkTransport(transport as any)
        setPreflightRttMs(
          typeof report?.metrics?.rttMs === 'number' ? Math.round(report.metrics.rttMs) : null,
        )

        if (transport === 'failed' || report?.quality === 'critical') {
          stream.getTracks().forEach((t: MediaStreamTrack) => t.stop())
          throw new Error(
            'Connexion impossible : ton reseau bloque la video temps reel (pare-feu, VPN ou reseau d\'entreprise). '
              + 'Essaie un autre reseau (partage de connexion mobile) ou desactive ton VPN, puis reessaie.',
          )
        }
      } catch (preflightErr: any) {
        // Si c'est notre erreur "reseau bloque", on la propage telle quelle.
        if (preflightErr?.message?.startsWith('Connexion impossible')) throw preflightErr
        // Sinon (echec du preflight lui-meme) : on log et on continue quand meme.
        console.warn('[Lucy 2.5] Preflight indisponible, on tente la connexion directe:', preflightErr)
      }

      // Upload de l'avatar en reference serveur reutilisable. On recupere un
      // `ref.id` (file_...) que l'on renverra a CHAQUE changement de scene pour
      // que le face swap persiste sans re-uploader les octets. Si l'upload
      // echoue, on retombe sur l'envoi direct du blob.
      let avatarImageRef: string | Blob = avatarBlob
      try {
        const uploaded = await client.files.upload(avatarBlob)
        if (uploaded?.id) {
          avatarRefIdRef.current = uploaded.id
          avatarImageRef = uploaded.id
        }
      } catch (uploadErr) {
        console.error('[Lucy 2.5] Upload avatar (files.upload) echoue, fallback blob:', uploadErr)
      }

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

        // Qualite reseau en direct : verdict lisse + facteur limitant + metriques
        // reelles (RTT, FPS). Ces metriques permettent d'afficher une latence et
        // une fluidite VRAIES a l'ecran, et de comprendre ce qui bride le rendu.
        onConnectionQuality: (report: any) => {
          setConnectionQuality(report?.quality ?? null)
          setQualityFactor(
            report?.limitingFactor && report.limitingFactor !== 'none'
              ? report.limitingFactor
              : null,
          )
          const m = report?.metrics
          if (m) {
            if (typeof m.rttMs === 'number') setLiveRttMs(Math.round(m.rttMs))
            if (typeof m.fps === 'number') setLiveFps(Math.round(m.fps))
          }
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
          image: avatarImageRef,
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
        const m = report?.metrics
        if (m) {
          if (typeof m.rttMs === 'number') setLiveRttMs(Math.round(m.rttMs))
          if (typeof m.fps === 'number') setLiveFps(Math.round(m.fps))
        }
      })

      // Diagnostic de performance du SDK : decompose le temps de demarrage par
      // phase (signalisation, negociation ICE, 1ere image...). On le logge pour
      // reperer precisement quelle phase est lente si la connexion traine.
      realtimeClient.on('diagnostic', (evt: any) => {
        console.log('[Lucy 2.5][diagnostic]', evt?.phase ?? evt?.type ?? '', evt)
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
    const client = realtimeClientRef.current
    if (!client) return
    try {
      const avatarRes = await fetch(avatarImageUrl)
      const avatarBlob = await avatarRes.blob()

      // On uploade le nouvel avatar en reference serveur reutilisable et on met
      // a jour avatarRefIdRef pour que les changements de scene suivants
      // conservent CE nouvel avatar.
      let imageRef: string | Blob = avatarBlob
      try {
        const uploaded = await client.files.upload(avatarBlob)
        if (uploaded?.id) {
          avatarRefIdRef.current = uploaded.id
          imageRef = uploaded.id
        }
      } catch (uploadErr) {
        console.error('[Lucy 2.5] Upload nouvel avatar echoue, fallback blob:', uploadErr)
      }

      await client.set({
        image: imageRef,
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

    // CORRECTIF FACE SWAP : d'apres la doc du SDK Decart, pour changer la scene
    // TOUT EN conservant le swap, il faut RENVOYER l'image de reference en meme
    // temps que le nouveau prompt -> `set({ image, prompt })`. Avec `setPrompt`
    // seul, le modele perd la reference et reaffiche la personne reelle.
    // On reutilise le `ref.id` uploade au connect (leger, pas de re-upload).
    const avatarRef = avatarRefIdRef.current
    try {
      if (avatarRef) {
        await client.set({ image: avatarRef, prompt: prompt.trim(), enhance })
      } else {
        // Pas de reference disponible : on met au moins le prompt a jour.
        await client.setPrompt(prompt.trim(), { enhance })
      }
    } catch (err) {
      console.error('[Lucy 2.5] Erreur application prompt live:', err)
      // Repli : envoyer juste le texte si set({image,prompt}) echoue.
      try {
        await client.setPrompt(prompt.trim(), { enhance })
      } catch (err2) {
        console.error('[Lucy 2.5] Repli setPrompt() echoue:', err2)
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
    // Diagnostic reseau (preflight + live)
    networkTransport,
    preflightRttMs,
    liveRttMs,
    liveFps,
  }
}
