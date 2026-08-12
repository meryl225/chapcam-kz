'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
// NOTE : le SDK Decart (@decartai/sdk) embarque tout le pipeline temps reel
// WebRTC/WebCodecs, ce qui alourdit fortement le bundle. Il etait importe
// statiquement ici, donc inclus dans le chunk INITIAL de la page Live Swap :
// sur les reseaux instables (ou apres un redeploiement qui invalide les
// hashes de chunks), ce gros chunk echouait a se telecharger -> ChunkLoadError
// -> l'Error Boundary s'affichait "des le chargement" de la page.
// On le charge desormais A LA DEMANDE (dynamic import) juste avant la connexion,
// pour que la page se charge legere et instantanement, et qu'un eventuel souci
// d'import du SDK n'impacte que le moment ou l'utilisateur clique "Demarrer".

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
  // Reference serveur reutilisable de l'avatar (client.files.upload().id).
  // Permet de RENVOYER l'image de reference a chaque changement de scene sans
  // re-uploader les octets : c'est ce qui conserve le face swap en direct.
  const avatarRefIdRef = useRef<string | null>(null)
  // Garde-fou : la session n'est consideree "active" (et donc facturee cote
  // page) qu'a la 1ere vraie image transformee recue, JAMAIS pendant la chauffe
  // du modele (ecran noir). Evite de debiter le client pour rien.
  const firstFrameRef = useRef(false)
  const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // --- Enregistrement de la sortie transformee (le "swap" rendu par Decart) ---
  // outputStreamRef = flux transforme recu de Decart (memorise dans onRemoteStream).
  // On enregistre CE flux directement via MediaRecorder pour produire un fichier
  // video telechargeable du resultat du swap (camera OU video importee).
  const outputStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const [isRecording, setIsRecording] = useState(false)
  // URL objet du dernier enregistrement pret a etre telecharge (ou null).
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  // Etat de la piste camera : true = active, false = coupee (pause camera).
  const [cameraEnabled, setCameraEnabled] = useState(true)

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
    setCameraEnabled(true)

    // 0. Si un enregistrement est en cours, on l'arrete proprement : le
    //    handler onstop du MediaRecorder finalisera le fichier telechargeable.
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch {}
    }
    outputStreamRef.current = null

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
      // Flux video source personnalise (ex: capture d'une VIDEO IMPORTEE via
      // videoElement.captureStream()). Si fourni, on l'utilise a la place de la
      // camera (pas d'appel getUserMedia, donc pas de demande d'acces camera).
      sourceStream?: MediaStream
      // Identifiant unique du swap, genere par l'appelant AVANT connect(). Envoye
      // au serveur pour lier la reservation de warmup et les heartbeats a UNE
      // seule ligne swap_sessions.
      sessionId?: string
      // Callback appele quand le serveur a effectivement reserve des points de
      // warmup a l'emission du token (permet a l'UI de refleter le solde a jour).
      onReserved?: (reservedPoints: number) => void
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

      // On transmet l'origine EXACTE de la page (window.location.origin) au
      // serveur : c'est cette meme origine que le navigateur enverra dans
      // l'en-tete Origin du WebSocket vers Decart. Le serveur l'ajoute aux
      // allowedOrigins du token, ce qui garantit la correspondance et evite
      // l'erreur "Origin not allowed" sur les previews / domaines non listes.
      const pageOrigin =
        typeof window !== 'undefined' ? window.location.origin : ''
      // On transmet le session_id pour que le serveur cree la ligne de
      // reservation de warmup rattachee a CE swap.
      const sessionParam = options?.sessionId
        ? `&sessionId=${encodeURIComponent(options.sessionId)}`
        : ''
      const tokenRes = await fetch(
        `/api/decart-token?origin=${encodeURIComponent(pageOrigin)}${sessionParam}`,
      )
      const tokenData = await tokenRes.json().catch(() => null)
      const clientToken = tokenData?.token
      // Refleter immediatement les points reserves pour le warmup dans l'UI.
      if (tokenData?.reservedPoints > 0 && options?.onReserved) {
        options.onReserved(tokenData.reservedPoints)
      }
      if (!tokenRes.ok || !clientToken) {
        // Afficher la vraie raison renvoyee par le serveur (abonnement inactif,
        // points insuffisants, plafond quotidien...) plutot qu'un message
        // generique de "service indisponible" qui laisse croire a une panne.
        // Seul un 5xx (vraie indisponibilite) garde le message generique.
        const serverMsg = typeof tokenData?.error === 'string' ? tokenData.error : null
        if (serverMsg && tokenRes.status < 500) {
          throw new Error(serverMsg)
        }
        throw new Error('Service de transformation indisponible pour le moment. Reessaie dans un instant.')
      }

      let stream: MediaStream
      if (options?.sourceStream) {
        // Source = VIDEO IMPORTEE (flux capture d'un <video>). Aucun acces
        // camera requis. Le flux est fourni et gere par l'appelant (page).
        stream = options.sourceStream
      } else {
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
      }

      streamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const avatarRes = await fetch(avatarImageUrl)
      const avatarBlob = await avatarRes.blob()

      // Chargement a la demande du SDK Decart (voir note en haut du fichier).
      const { createDecartClient, models } = await import('@decartai/sdk')

      const client = createDecartClient({ apiKey: clientToken })

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
          // Memorise le flux transforme pour permettre l'enregistrement
          // (MediaRecorder) du resultat du swap en fichier telechargeable.
          outputStreamRef.current = transformedStream
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

  // Demarre l'enregistrement du flux transforme (resultat du swap) en fichier.
  // A appeler quand le swap est actif (outputStreamRef renseigne).
  const startRecording = useCallback(() => {
    const stream = outputStreamRef.current
    if (!stream || typeof MediaRecorder === 'undefined') return
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') return

    // Nettoyer un enregistrement precedent (libere la memoire du blob).
    setRecordedUrl((prev) => {
      if (prev) { try { URL.revokeObjectURL(prev) } catch {} }
      return null
    })
    recordedChunksRef.current = []

    // On choisit le meilleur conteneur/codec supporte par le navigateur.
    const candidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ]
    const mimeType = candidates.find((t) => MediaRecorder.isTypeSupported?.(t)) || ''

    try {
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const type = mimeType || 'video/webm'
        const blob = new Blob(recordedChunksRef.current, { type })
        recordedChunksRef.current = []
        const url = URL.createObjectURL(blob)
        setRecordedUrl(url)
        setIsRecording(false)
        mediaRecorderRef.current = null
      }
      // Emet un chunk par seconde : evite de tout perdre si l'onglet se ferme.
      recorder.start(1000)
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch (err) {
      console.error('[Lucy 2.5] Enregistrement impossible:', err)
    }
  }, [])

  // Arrete l'enregistrement : le handler onstop finalise le fichier + l'URL.
  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current
    if (rec && rec.state !== 'inactive') {
      try { rec.stop() } catch {}
    }
  }, [])

  // Efface l'enregistrement disponible (apres telechargement par ex.).
  const clearRecording = useCallback(() => {
    setRecordedUrl((prev) => {
      if (prev) { try { URL.revokeObjectURL(prev) } catch {} }
      return null
    })
  }, [])

  // Coupe / reactive la piste VIDEO envoyee au swap. On agit sur track.enabled :
  // quand c'est false, le navigateur envoie des frames noires a Decart (le swap
  // se met en pause visuellement) sans fermer la session ni la camera. Utile
  // comme "pause camera" pendant un live. Sans effet sur une video importee.
  const toggleCamera = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return
    const videoTracks = stream.getVideoTracks()
    if (videoTracks.length === 0) return
    const nextEnabled = !videoTracks[0].enabled
    videoTracks.forEach((t) => { t.enabled = nextEnabled })
    setCameraEnabled(nextEnabled)
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
    // Controle de la piste camera pendant le swap
    cameraEnabled,
    toggleCamera,
    // Enregistrement du resultat du swap
    isRecording,
    recordedUrl,
    startRecording,
    stopRecording,
    clearRecording,
    // Retour temps reel Lucy 2.5
    elapsedSeconds,
    connectionQuality,
    qualityFactor,
    queuePosition,
    activeResolution,
  }
}
