'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Camera, Zap, Clock, Coins, Plus, Check, AlertCircle, Loader2, Square, Wifi, WifiOff, Monitor, Cloud, Settings, Download, Crown, CreditCard, ClipboardList, Video as VideoIcon, VideoOff, BookOpen, Maximize2, Minimize2, Sparkles, Wand2, Lock, ChevronDown, Smartphone, Film, Upload, Disc3, Trash2 } from 'lucide-react'
import { useLucy21 } from '@/hooks/use-lucy-21'
import { LUCY_PRESET_CATEGORIES, buildScenePrompt, isVipPlan } from '@/lib/lucy-presets'
import { pointsPerSecond, POINTS_PER_SECOND_SD, POINTS_PER_SECOND_HD } from '@/lib/swap-pricing'
import { InstallationRequestModal } from '@/components/dashboard/installation-request-modal'
import { VirtualCameraIndicator } from '@/components/live/virtual-camera-indicator'
import { MobileLiveOverlay } from '@/components/live/mobile-live-overlay'
import { useIsMobile } from '@/hooks/use-mobile'
import { SwapConsent, GenerateNotice } from '@/components/dashboard/swap-consent'
import { detectHardwareCapabilities, determineProcessingMode, loadProcessingPreferences, saveProcessingPreferences, type HardwareCapabilities, type UserProcessingPreferences } from '@/lib/hardware-detection'
import { useT } from '@/lib/i18n/language-provider'

const SUPABASE_URL = 'https://ojmzqokffbptmcktnwdy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbXpxb2tmZmJwdG1ja3Rud2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTAzNTYsImV4cCI6MjA5NDg4NjM1Nn0.e9sk4b_15ge2LIIQwFpXC3n_q48ctu9IJ6oJxV85kgw'

// Tarif de base (720p). Le tarif reel par tick depend de la resolution active
// et est lu depuis rateRef (voir plus bas) : 2 pts/s en 720p, 4 pts/s en 1080p.
const POINTS_PER_SECOND = POINTS_PER_SECOND_SD

// Libelle + couleur par verdict de qualite reseau (Lucy 2.5).
const QUALITY_UI: Record<string, { label: string; color: string }> = {
  good: { label: 'Connexion excellente', color: 'text-primary' },
  fair: { label: 'Connexion correcte', color: 'text-yellow-500' },
  poor: { label: 'Connexion faible', color: 'text-orange-500' },
  critical: { label: 'Connexion critique', color: 'text-red-500' },
}

// Formate des secondes en mm:ss.
function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

interface Avatar {
  id: string
  name: string
  url: string
  is_active: boolean
}

export default function DashboardPage() {
  const t = useT()
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null)
  const [userPoints, setUserPoints] = useState(0)
  const [maxPoints, setMaxPoints] = useState(0)
  const [plan, setPlan] = useState<string>('free')
  const [userId, setUserId] = useState<string | null>(null)

  // --- Studio Lucy 2.5 (prompts en direct, reserve VIP) ---
  const isVip = isVipPlan(plan)
  const [livePrompt, setLivePromptText] = useState('')
  const [enhancePrompt, setEnhancePrompt] = useState(true)
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  const [isApplyingPrompt, setIsApplyingPrompt] = useState(false)
  // Sections repliables : desencombrer la page pour tout voir d'un coup.
  const [studioOpen, setStudioOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Qualite HD 1080p : reservee VIP. DESACTIVEE par defaut -> tous les forfaits
  // demarrent en 720p (2 pts/s). Le VIP doit l'activer manuellement (4 pts/s).
  const [hdEnabled, setHdEnabled] = useState(false)
  // Codec video prefere (avance) : undefined = negociation par defaut du SDK.
  const [videoCodec, setVideoCodec] = useState<'h264' | 'vp8' | 'vp9' | ''>('')
  const [duration, setDuration] = useState(0)
  const [pointsUsed, setPointsUsed] = useState(0)
  const [isSyncingPoints, setIsSyncingPoints] = useState(false)
  // Refs miroir : utilisees dans les intervalles / handlers de fermeture pour
  // eviter les closures perimees (bug qui empechait toute deduction).
  const durationRef = useRef(0)          // duree totale du swap en cours (s)
  const pointsUsedRef = useRef(0)        // total points consommes ce swap
  const pendingSyncRef = useRef(0)       // points consommes NON encore envoyes au serveur
  const remainingRef = useRef(0)         // solde restant estime (pour couper a 0)
  const sessionStartRef = useRef<string | null>(null) // horodatage ISO du debut du swap en cours
  // Identifiant unique du swap en cours : envoye a CHAQUE appel /api/points pour
  // que le serveur cree/incremente UNE seule ligne swap_sessions (upsert). C'est
  // ce qui elimine les sessions "fantomes" quand le client se ferme brutalement.
  const sessionIdRef = useRef<string | null>(null)
  // Avatar du swap en cours (capture au demarrage) : permet aux lignes heartbeat
  // de porter l'avatar meme si la session n'est jamais finalisee.
  const sessionAvatarRef = useRef<{ id: string | null; name: string | null }>({ id: null, name: null })
  // Tarif points/seconde du swap en cours (2 en 720p, 4 en 1080p VIP). En ref
  // pour eviter toute closure perimee dans les intervalles / handlers de flush.
  const rateRef = useRef(POINTS_PER_SECOND_SD)
  // Certification d'usage responsable, requise avant chaque demarrage de swap.
  const [swapConsent, setSwapConsent] = useState(false)

  // Detection hardware et mode de traitement
  const [hardware, setHardware] = useState<HardwareCapabilities | null>(null)
  // IMPORTANT : on initialise avec les MEMES valeurs par defaut que le rendu
  // serveur. Lire localStorage ici (pendant le rendu) provoquait un mismatch
  // d'hydratation (React #418) qui faisait planter toute la page Live.
  // Les vraies preferences sont chargees apres le montage dans un useEffect.
  const [preferences, setPreferences] = useState<UserProcessingPreferences>({
    mode: 'auto',
    maxLocalFPS: 25,
    preferQuality: true,
    forceCloud: false,
  })
  const [processingMode, setProcessingMode] = useState<'local' | 'cloud'>('cloud')
  const [networkQuality, setNetworkQuality] = useState<'good' | 'medium' | 'poor'>('good')
  const [showModeSettings, setShowModeSettings] = useState(false)
  const [stats, setStats] = useState({ fps: 0, latency: 0, resolution: '720p' })
  const [showInstallModal, setShowInstallModal] = useState(false)

  // Reglages visuels (modernisation UI uniquement - n'affecte pas la logique du swap)
  const [renderQuality, setRenderQuality] = useState<'standard' | 'hd' | 'ultra'>('ultra')
  const [stability, setStability] = useState(80)
  const [smoothing, setSmoothing] = useState(70)
  const [noiseReduction, setNoiseReduction] = useState(60)
  const [faceOrientation, setFaceOrientation] = useState<'left' | 'center' | 'right'>('center')
  const [colorCorrection, setColorCorrection] = useState(true)

  // --- Source du swap : camera en direct OU video importee (fichier) ---
  const [swapSource, setSwapSource] = useState<'camera' | 'video'>('camera')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  // <video> masque qui lit le fichier importe ; on capture son flux
  // (captureStream) pour l'envoyer a Decart comme n'importe quel MediaStream.
  const uploadVideoRef = useRef<HTMLVideoElement | null>(null)
  const uploadObjectUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Agrandissement de la camera ChapCam (plein ecran natif pour faciliter le cadrage / OBS)
  const chapCamRef = useRef<HTMLDivElement | null>(null)
  const [isCamFullscreen, setIsCamFullscreen] = useState(false)

  const toggleCamFullscreen = useCallback(() => {
    const el = chapCamRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const onFsChange = () => setIsCamFullscreen(document.fullscreenElement === chapCamRef.current)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // La page s'est chargee avec succes : on efface le garde-fou de
  // rechargement anti-ChunkLoadError (voir app/dashboard/live-swap/error.tsx)
  // pour qu'un futur echec de chunk (ex: apres un prochain deploiement) puisse
  // a nouveau declencher l'auto-recuperation.
  useEffect(() => {
  try { sessionStorage.removeItem('chapcam_liveswap_chunk_reload') } catch {}
  }, [])

  const {
    isConnected,
    isConnecting,
    error,
    localVideoRef,
    remoteVideoRef,
    connect,
    disconnect,
    updateAvatar,
    setLivePrompt,
    cameraEnabled,
    toggleCamera,
    elapsedSeconds,
    connectionQuality,
    qualityFactor,
    queuePosition,
    activeResolution,
    isRecording,
    recordedUrl,
    startRecording,
    stopRecording,
    clearRecording,
  } = useLucy21()

  // Quand le swap n'est plus actif, on met en pause la video importee (qui
  // tourne en boucle en arriere-plan pendant le swap) pour liberer les ressources.
  useEffect(() => {
    if (!isConnected && !isConnecting && uploadVideoRef.current) {
      try { uploadVideoRef.current.pause() } catch {}
    }
  }, [isConnected, isConnecting])

  // Le tarif suit la resolution reellement active : 4 pts/s en 1080p (VIP),
  // 2 pts/s en 720p. Mis a jour des que Decart confirme la resolution.
  useEffect(() => {
    rateRef.current = pointsPerSecond(activeResolution)
  }, [activeResolution])

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Mode plein ecran mobile immersif : uniquement sur telephone ET une fois le
  // swap connecte. Sur desktop, isMobile reste false -> aucun changement.
  const isMobile = useIsMobile()
  // Plein ecran declenche manuellement via le bouton (utile desktop/tablette).
  const [manualFullscreen, setManualFullscreen] = useState(false)

  // Charger les preferences sauvegardees uniquement cote client (apres montage)
  // pour eviter tout mismatch d'hydratation avec le rendu serveur.
  useEffect(() => {
    setPreferences(loadProcessingPreferences())
  }, [])

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
        const pointsData = await pointsRes.json().catch(() => null)
        if (pointsData?.success) {
          setUserPoints(pointsData.points ?? 0)
          setMaxPoints(pointsData.maxPoints ?? 0)
          setPlan(pointsData.plan ?? 'free')
          remainingRef.current = pointsData.points ?? 0
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

  // Envoie au serveur les points consommes mais pas encore synchronises.
  // Utilise des refs -> aucune closure perimee. Rejoue le lot en cas d'echec.
  const syncPendingPoints = useCallback(async () => {
    const chunk = pendingSyncRef.current
    if (chunk <= 0) return
    pendingSyncRef.current = 0
    try {
      const res = await fetch('/api/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true, // permet a la requete d'aboutir meme si l'onglet se ferme
        body: JSON.stringify({
          pointsToDeduct: chunk,
          sessionDuration: Math.max(1, Math.round(chunk / rateRef.current)),
          // Derive de rateRef (ref toujours a jour) pour eviter une closure perimee.
          resolution: rateRef.current >= POINTS_PER_SECOND_HD ? '1080p' : '720p',
          // Cle d'upsert + metadonnees : la session existe des le 1er heartbeat.
          sessionId: sessionIdRef.current,
          avatarId: sessionAvatarRef.current.id,
          avatarName: sessionAvatarRef.current.name,
          startedAt: sessionStartRef.current,
        }),
      })
      const data = await res.json().catch(() => null)
      if (data?.success) {
        setMaxPoints(data.maxPoints ?? 0)
        if (typeof data.currentPoints === 'number') {
          remainingRef.current = data.currentPoints
          setUserPoints(data.currentPoints)
        }
        if (data.depleted) handleStopSwapAndSave()
      } else {
        // Echec -> on remet le lot en attente pour re-essayer au prochain tick.
        pendingSyncRef.current += chunk
      }
    } catch (err) {
      console.error('Erreur sync points:', err)
      pendingSyncRef.current += chunk
    }
  }, [])

  // Track points usage en temps reel + synchronisation serveur periodique.
  useEffect(() => {
    if (!isConnected) return
    const SYNC_EVERY_SECONDS = 10
    const interval = setInterval(() => {
      const rate = rateRef.current // 2 pts/s (720p) ou 4 pts/s (1080p VIP)
      durationRef.current += 1
      pointsUsedRef.current += rate
      pendingSyncRef.current += rate
      remainingRef.current = Math.max(0, remainingRef.current - rate)

      setDuration(durationRef.current)
      setPointsUsed(pointsUsedRef.current)
      setUserPoints(remainingRef.current)

      // Synchronisation reguliere : on ne perd jamais plus de ~10s de conso.
      if (durationRef.current % SYNC_EVERY_SECONDS === 0) {
        void syncPendingPoints()
      }

      // Solde epuise -> couper le swap et sauvegarder le reste.
      if (remainingRef.current <= 0) {
        handleStopSwapAndSave()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [isConnected, syncPendingPoints])

  // Flush de securite quand l'onglet se ferme / passe en arriere-plan / navigation.
  // sendBeacon garantit l'envoi meme pendant la fermeture de la page.
  useEffect(() => {
    const flushBeacon = () => {
      const chunk = pendingSyncRef.current
      if (chunk <= 0) return
      pendingSyncRef.current = 0
      try {
        const blob = new Blob([JSON.stringify({
          pointsToDeduct: chunk,
          sessionDuration: Math.max(1, Math.round(chunk / rateRef.current)),
          resolution: rateRef.current >= POINTS_PER_SECOND_HD ? '1080p' : '720p',
          // Meme cle d'upsert : ce dernier flush s'attache a la bonne session.
          sessionId: sessionIdRef.current,
          avatarId: sessionAvatarRef.current.id,
          avatarName: sessionAvatarRef.current.name,
          startedAt: sessionStartRef.current,
        })], { type: 'application/json' })
        navigator.sendBeacon?.('/api/points', blob)
      } catch {
        pendingSyncRef.current += chunk
      }
    }
    const onVisibility = () => { if (document.visibilityState === 'hidden') flushBeacon() }
    window.addEventListener('pagehide', flushBeacon)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flushBeacon)
      document.removeEventListener('visibilitychange', onVisibility)
      flushBeacon() // flush au demontage (navigation interne vers une autre page)
    }
  }, [])

  // Arrete le swap et sauvegarde le reste des points consommes.
  const handleStopSwapAndSave = useCallback(async () => {
    disconnect()
    if (!isSyncingPoints) {
      setIsSyncingPoints(true)
      try {
        await syncPendingPoints()
      } finally {
        setIsSyncingPoints(false)
      }
    }

    // On capture les totaux de CE swap avant tout reset.
    const sessionSeconds = durationRef.current
    const sessionPoints = pointsUsedRef.current
    const startedAt = sessionStartRef.current
    const sessionId = sessionIdRef.current
    // Empeche un double enregistrement (l'arret manuel + l'epuisement peuvent
    // tous deux appeler cette fonction).
    sessionStartRef.current = null
    sessionIdRef.current = null

    // Enregistre UNE session complete dans l'historique (avatar, duree, points).
    if (sessionSeconds > 0) {
      try {
        await fetch('/api/points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            saveSession: true,
            // Finalise la ligne heartbeat existante (pas de 2e ligne creee).
            sessionId,
            avatarId: selectedAvatar?.id ?? null,
            avatarName: selectedAvatar?.name ?? null,
            sessionDuration: sessionSeconds,
            pointsToDeduct: sessionPoints,
            resolution: rateRef.current >= POINTS_PER_SECOND_HD ? '1080p' : '720p',
            startedAt,
          }),
        })
      } catch (err) {
        console.error('Erreur enregistrement session:', err)
      }
    }

    // Reset des compteurs de session
    setPointsUsed(0)
    setDuration(0)
    pointsUsedRef.current = 0
    durationRef.current = 0
  }, [disconnect, isSyncingPoints, syncPendingPoints, selectedAvatar])

  // === TRACKING UTILISATEURS ACTIFS ===
  useEffect(() => {
    const trackActivity = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Le tracking d'activite est purement "best effort" : si la table
        // user_activity n'existe pas / n'a pas de contrainte unique sur
        // user_id (erreur 400), on ignore silencieusement pour ne JAMAIS
        // faire planter la page Live.
        const { error: activityError } = await supabase
          .from('user_activity')
          .upsert({
            user_id: user.id,
            last_active: new Date().toISOString(),
            current_page: window.location.pathname,
          }, {
            onConflict: 'user_id',
          })

        if (activityError) {
          console.warn('[live-swap] Suivi activite ignore:', activityError.message)
        }
      } catch (err) {
        console.warn('[live-swap] Suivi activite indisponible:', err)
      }
    }

    trackActivity()
    const interval = setInterval(trackActivity, 30000)

    return () => clearInterval(interval)
  }, [])

  // Selection d'un fichier video comme source du swap.
  const handleSelectVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) return
    setVideoFile(file)
    setSwapSource('video')
  }

  // Retire la video importee et repasse en source camera.
  const clearVideoFile = () => {
    setVideoFile(null)
    setSwapSource('camera')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Libere l'URL objet de la video importee quand elle change / au demontage.
  useEffect(() => {
    if (uploadObjectUrlRef.current) {
      try { URL.revokeObjectURL(uploadObjectUrlRef.current) } catch {}
      uploadObjectUrlRef.current = null
    }
    if (!videoFile) return
    const url = URL.createObjectURL(videoFile)
    uploadObjectUrlRef.current = url
    if (uploadVideoRef.current) uploadVideoRef.current.src = url
    return () => {
      try { URL.revokeObjectURL(url) } catch {}
      if (uploadObjectUrlRef.current === url) uploadObjectUrlRef.current = null
    }
  }, [videoFile])

  // Prepare la video importee et capture son flux (video uniquement, comme la
  // camera) pour l'envoyer a Decart. La video est mise en boucle afin de nourrir
  // le swap en continu ; l'utilisateur arrete quand il veut.
  const buildVideoSourceStream = async (): Promise<MediaStream> => {
    const el = uploadVideoRef.current
    if (!el) throw new Error("Lecteur video indisponible. Reessaie.")
    el.muted = true
    el.loop = true
    el.playsInline = true
    // Attendre que les dimensions soient connues avant de capturer le flux.
    if (el.readyState < 2) {
      await new Promise<void>((resolve, reject) => {
        const onReady = () => { cleanup(); resolve() }
        const onErr = () => { cleanup(); reject(new Error("Impossible de lire cette video. Essaie un autre fichier (MP4 recommande).")) }
        const cleanup = () => {
          el.removeEventListener('loadeddata', onReady)
          el.removeEventListener('error', onErr)
        }
        el.addEventListener('loadeddata', onReady)
        el.addEventListener('error', onErr)
        el.load()
      })
    }
    try { await el.play() } catch {}
    const elAny = el as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream }
    const capture = elAny.captureStream || elAny.mozCaptureStream
    if (!capture) throw new Error("Ton navigateur ne permet pas d'utiliser une video importee. Utilise Chrome ou Edge a jour.")
    const captured = capture.call(el)
    // On ne garde que la piste video (pas d'audio), comme pour la camera.
    const videoOnly = new MediaStream(captured.getVideoTracks())
    return videoOnly
  }

  const handleStartSwap = async () => {
    if (!selectedAvatar || userPoints < POINTS_PER_SECOND || !swapConsent) return
    if (swapSource === 'video' && !videoFile) return
    // Journalisation de l'acceptation de la certification d'usage responsable.
    console.log('[v0] swap-consent accepted', {
      type: 'live-face-swap',
      userId,
      avatarId: selectedAvatar.id,
      acceptedAt: new Date().toISOString(),
    })
    setDuration(0)
    setPointsUsed(0)
    // Init des refs de suivi pour cette session (evite toute closure perimee).
    durationRef.current = 0
    pointsUsedRef.current = 0
    pendingSyncRef.current = 0
    remainingRef.current = userPoints
    sessionStartRef.current = new Date().toISOString()
    // Nouvel identifiant unique pour CE swap + capture de l'avatar : les
    // heartbeats creeront/incrementeront une seule ligne swap_sessions.
    sessionIdRef.current =
      (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    sessionAvatarRef.current = { id: selectedAvatar?.id ?? null, name: selectedAvatar?.name ?? null }

    // Source video importee : on capture le flux du fichier avant de connecter.
    let sourceStream: MediaStream | undefined
    if (swapSource === 'video') {
      try {
        sourceStream = await buildVideoSourceStream()
      } catch (err) {
        console.error('[v0] video-source error', err)
        return
      }
    }

    // 1080p uniquement pour les VIP ayant laisse le HD active ; codec avance optionnel.
    await connect(selectedAvatar.url, {
      hd: isVip && hdEnabled,
      codec: videoCodec || undefined,
      sourceStream,
      sessionId: sessionIdRef.current ?? undefined,
      // Le serveur a debite le warmup a l'emission du token : on decremente le
      // solde local pour que l'affichage reste juste avant le 1er heartbeat.
      onReserved: (reservedPoints) => {
        remainingRef.current = Math.max(0, remainingRef.current - reservedPoints)
        pointsUsedRef.current += reservedPoints
        setUserPoints(remainingRef.current)
        setPointsUsed(pointsUsedRef.current)
      },
    })
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

  // Appliquer une scene preset (decor / style / effet / arriere-plan) A CHAUD.
  const handleApplyPreset = useCallback(async (presetId: string, presetPrompt: string) => {
    if (!isVip || !isConnected || isApplyingPrompt) return
    setIsApplyingPrompt(true)
    setActivePresetId(presetId)
    try {
      // Le swap est conserve via l'intention de swap incluse dans le prompt
      // (l'avatar de reference reste memorise cote serveur, on ne le renvoie pas).
      await setLivePrompt(buildScenePrompt(presetPrompt), enhancePrompt)
    } finally {
      setIsApplyingPrompt(false)
    }
  }, [isVip, isConnected, isApplyingPrompt, enhancePrompt, setLivePrompt])

  // Appliquer un prompt libre saisi par l'utilisateur VIP.
  const handleApplyFreePrompt = useCallback(async () => {
    if (!isVip || !isConnected || isApplyingPrompt || !livePrompt.trim()) return
    setIsApplyingPrompt(true)
    setActivePresetId(null)
    try {
      // Le swap est conserve via l'intention de swap incluse dans le prompt.
      await setLivePrompt(buildScenePrompt(livePrompt), enhancePrompt)
    } finally {
      setIsApplyingPrompt(false)
    }
  }, [isVip, isConnected, isApplyingPrompt, livePrompt, enhancePrompt, setLivePrompt])

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

  const canStart = !!selectedAvatar && userPoints >= POINTS_PER_SECOND && swapConsent && (swapSource === 'camera' || !!videoFile)

  return (
    <div className="mx-auto w-full max-w-[1280px] p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 md:text-3xl">
            <Zap className="w-6 h-6 text-primary" />
            Live Swap
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Transformez votre apparence en temps réel avec l'IA.")}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {/* Guide d'utilisation */}
          <Link
            href="/dashboard/mes-demandes"
            className="hidden items-center gap-2 rounded-lg border border-hairline bg-muted px-4 py-2 text-sm font-semibold text-foreground backdrop-blur-md transition-colors hover:border-hairline-strong sm:flex"
          >
            <BookOpen className="h-4 w-4" />
            {t('Mes demandes')}
          </Link>

          {/* Recharger (orange) */}
          <Link
            href="/dashboard/plans"
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-colors hover:bg-orange-600"
          >
            <CreditCard className="h-4 w-4" />
            {t('Recharger')}
          </Link>

          {/* Demande d'installation (bleu) */}
          <button
            onClick={() => setShowInstallModal(true)}
            className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-colors hover:bg-[#1d4ed8]"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t("Demande d'installation")}</span>
            <span className="sm:hidden">{t('Installation')}</span>
          </button>

          {/* Credits restants */}
          <div className="flex items-center gap-2 rounded-lg border border-hairline bg-muted px-4 py-2 backdrop-blur-md">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-foreground font-bold">{userPoints.toLocaleString()}</span>
            <span className="text-muted-foreground text-sm">{t('points')}</span>
            {isConnected && (
              <span
                className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  activeResolution === '1080p'
                    ? 'bg-yellow-500/15 text-yellow-500'
                    : 'bg-primary/15 text-primary'
                }`}
                title={activeResolution === '1080p' ? t('Tarif Full HD 1080p') : t('Tarif HD 720p')}
              >
                {pointsPerSecond(activeResolution)} pts/s
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Source du swap : camera en direct OU video importee (fichier).
          (Remplace l'ancienne barre de statut Mode/Qualite/Latence.) */}
      <div className="rounded-xl border border-hairline bg-muted px-5 py-3 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Film className="h-4 w-4 text-primary" />
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">{t('Source du swap')}</span>
              <span className="text-[11px] text-muted-foreground">
                {t('Ta caméra en direct, ou une vidéo que tu importes.')}
              </span>
            </span>
          </span>
          <div className="flex items-center gap-3">
            {isConnected && (
              <span className="flex items-center gap-1.5 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-mono font-medium text-foreground tabular-nums">
                  {formatDuration(elapsedSeconds)}
                </span>
              </span>
            )}
            <div className="flex items-center gap-1 rounded-lg bg-black/50 p-1">
              <button
                type="button"
                disabled={isConnected || isConnecting}
                onClick={() => setSwapSource('camera')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  swapSource === 'camera' ? 'bg-primary text-black' : 'text-foreground/60 hover:text-foreground'
                }`}
              >
                <Camera className="h-3.5 w-3.5" />
                {t('Caméra')}
              </button>
              <button
                type="button"
                disabled={isConnected || isConnecting}
                onClick={() => {
                  setSwapSource('video')
                  if (!videoFile) fileInputRef.current?.click()
                }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  swapSource === 'video' ? 'bg-primary text-black' : 'text-foreground/60 hover:text-foreground'
                }`}
              >
                <Film className="h-3.5 w-3.5" />
                {t('Vidéo')}
              </button>
            </div>
          </div>
        </div>

        {/* Zone d'import de fichier (visible quand la source = video) */}
        {swapSource === 'video' && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleSelectVideoFile}
              className="hidden"
            />
            <button
              type="button"
              disabled={isConnected || isConnecting}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-hairline bg-black/40 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload className="h-3.5 w-3.5" />
              {videoFile ? t('Changer de vidéo') : t('Importer une vidéo')}
            </button>
            {videoFile ? (
              <span className="flex min-w-0 items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="max-w-[180px] truncate">{videoFile.name}</span>
                {!isConnected && !isConnecting && (
                  <button
                    type="button"
                    onClick={clearVideoFile}
                    aria-label="Retirer la vidéo"
                    className="shrink-0 text-foreground/50 transition-colors hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">{t('MP4 recommandé.')}</span>
            )}
          </div>
        )}
      </div>

      {/* File d'attente Lucy 2.5 : affichee quand les serveurs sont satures */}
      {queuePosition && queuePosition.position > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-yellow-500" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t('File d\'attente : position')} {queuePosition.position} {t('sur')} {queuePosition.queueSize}
            </p>
            <p className="mt-0.5 text-xs text-foreground/60">
              {t('Les serveurs sont très demandés. Ta session démarre dès qu\'une place se libère.')}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Main layout : contenu + panneau de reglages.
          minmax(0,1fr) + min-w-0 : empeche la colonne principale de deborder
          horizontalement (la piste 1fr a sinon un minimum = taille du contenu). */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Colonne principale */}
        <div className="min-w-0 space-y-6">
          {/* Cameras avec cercle IA — la camera ChapCam est volontairement plus grande
              pour faciliter la capture en fenetre dans OBS */}
          <div className="relative grid gap-6 md:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
            {/* Camera reelle */}
            <div className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-2 border-b border-hairline bg-muted px-4 py-2.5 backdrop-blur-md">
                <Camera className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-foreground">{t('Caméra réelle')}</span>
                {isConnected && (
                  <span className="ml-auto flex items-center gap-1.5 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> {t('EN DIRECT')}
                  </span>
                )}
              </div>
              <div className="relative aspect-video bg-background">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {!isConnected && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-text-faint">
                    <Camera className="mb-2 h-12 w-12 opacity-50" />
                    <p className="text-sm">{t('Caméra inactive')}</p>
                  </div>
                )}
                {/* Controle camera : coupe / reactive la piste video envoyee au
                    swap. Visible uniquement pendant un swap actif (sinon le bouton
                    n'aurait aucun flux sur lequel agir). */}
                {isConnected && (
                  <div className="absolute inset-x-3 bottom-3 z-20 flex items-center gap-2">
                    <button
                      onClick={toggleCamera}
                      aria-label={cameraEnabled ? t('Couper la caméra') : t('Activer la caméra')}
                      title={cameraEnabled ? t('Couper la caméra') : t('Activer la caméra')}
                      className="flex h-9 items-center gap-2 rounded-lg border border-hairline bg-black/50 px-3 text-xs font-medium text-foreground/90 backdrop-blur-md transition-colors hover:bg-black/70"
                    >
                      {cameraEnabled ? (
                        <>
                          <VideoIcon className="h-4 w-4" />
                          {t('Caméra active')}
                        </>
                      ) : (
                        <>
                          <VideoOff className="h-4 w-4 text-red-400" />
                          {t('Caméra coupée')}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Camera ChapCam */}
            <div className="overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-[0_8px_40px_rgba(0,255,136,0.12)]">
              <div className="flex items-center gap-2 border-b border-primary/20 bg-muted px-4 py-2.5 backdrop-blur-md">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{t('Caméra ChapCam')}</span>
                <div className="ml-auto flex items-center gap-2 text-[11px]">
                  {isConnected && (
                    <>
                      <span className="font-semibold text-primary">{stats.fps} FPS</span>
                      <span className="text-foreground/30">|</span>
                      <span className="text-foreground/60">{stats.resolution}</span>
                      <span className="text-foreground/30">|</span>
                      <span className="flex items-center gap-1 text-foreground/60">
                        <Clock className="h-3 w-3" />
                        {formatDuration(duration)}
                      </span>
                    </>
                  )}
                  {isConnected && (
                    <button
                      onClick={() => setManualFullscreen(true)}
                      aria-label={t('Mode plein écran immersif')}
                      title={t('Mode plein écran immersif (façon mobile)')}
                      className="flex h-7 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 text-primary transition-colors hover:bg-primary/20"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-medium">{t('Plein écran')}</span>
                    </button>
                  )}
                  <button
                    onClick={toggleCamFullscreen}
                    aria-label={isCamFullscreen ? t('Réduire la caméra') : t('Agrandir la caméra')}
                    title={isCamFullscreen ? t('Réduire') : t('Agrandir en plein écran')}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                  >
                    {isCamFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div ref={chapCamRef} className="cc-cam-stage relative aspect-video bg-background">
                <video
                  ref={remoteVideoRef}
                  data-chapcam-output="true"
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />

                {/* Spinner de connexion uniquement (transient, sans texte) pour
                    garder la scene parfaitement vierge cote OBS. */}
                {isConnecting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
              </div>

              {/* Indicateur d'etat de la camera virtuelle ChapCam (app de bureau uniquement) */}
              <VirtualCameraIndicator className="m-3" />
            </div>

          </div>

          {/* Avatars */}
          <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
            {/* Avatar selectionne */}
            <div className="rounded-2xl border border-hairline bg-muted p-4 backdrop-blur-xl">
              <p className="mb-3 text-sm font-semibold text-foreground">{t('Avatar sélectionné')}</p>
              {selectedAvatar ? (
                <div className="flex items-center gap-3">
                  <img
                    src={selectedAvatar.url || '/placeholder.svg'}
                    alt={selectedAvatar.name}
                    className="h-14 w-14 rounded-xl border border-primary/40 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{selectedAvatar.name}</p>
                    <p className="text-xs text-foreground/40">{t('Actif')}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground/40">{t('Aucun avatar sélectionné')}</p>
              )}
            </div>

            {/* Mes avatars */}
            <div className="min-w-0 rounded-2xl border border-hairline bg-muted p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{t('Mes avatars')}</p>
                <Link href="/dashboard/avatars" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <Plus className="h-3.5 w-3.5" />
                  {t('Ajouter')}
                </Link>
              </div>

              {avatars.length === 0 ? (
                <div className="flex items-center gap-3 py-2">
                  <Link
                    href="/dashboard/avatars"
                    className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-hairline-strong text-foreground/50 transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Plus className="h-5 w-5" />
                  </Link>
                  <p className="text-sm text-foreground/40">{t('Créez votre premier avatar')}</p>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {avatars.map(avatar => (
                    <button
                      key={avatar.id}
                      onClick={() => handleSelectAvatar(avatar)}
                      className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                        selectedAvatar?.id === avatar.id
                          ? 'border-primary shadow-[0_0_20px_rgba(0,255,136,0.3)]'
                          : 'border-hairline hover:border-white/30'
                      }`}
                    >
                      <img src={avatar.url || '/placeholder.svg'} alt={avatar.name} className="h-full w-full object-cover" />
                      {selectedAvatar?.id === avatar.id && (
                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-black" />
                        </span>
                      )}
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                        <span className="block truncate text-[10px] font-medium text-foreground">{avatar.name}</span>
                      </span>
                    </button>
                  ))}
                  <Link
                    href="/dashboard/avatars"
                    className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-hairline-strong text-foreground/50 transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-[10px]">{t('Ajouter')}</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Studio CHAPCAM : prompts en direct (reserve VIP PRO / VIP DEBOUT).
              Contenu organise en 2 colonnes pour un rendu equilibre et pro. */}
          <div className="relative mb-4 w-full overflow-hidden rounded-2xl border border-hairline bg-muted p-5 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setStudioOpen(v => !v)}
              className={`flex w-full flex-wrap items-center justify-between gap-2 ${studioOpen ? 'mb-4 border-b border-hairline pb-4' : ''}`}
            >
              <span className="flex items-center gap-2 text-left">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-[#8b5cf6]/20">
                  <Sparkles className="h-5 w-5 text-primary" />
                </span>
                <span className="block">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">Studio CHAPCAM</span>
                    <span className="rounded-full bg-gradient-to-r from-primary to-[#8b5cf6] px-2 py-0.5 text-[10px] font-bold text-black">
                      VIP
                    </span>
                  </span>
                  <span className="block text-[11px] text-foreground/50">
                    {t('Décors, styles, effets et arrière-plans en direct, sans couper la caméra.')}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-2">
                {isVip && (
                  <span className="hidden items-center gap-1 rounded-full border border-hairline bg-background/40 px-2.5 py-1 text-[11px] text-foreground/60 sm:flex">
                    <Crown className="h-3.5 w-3.5 text-primary" />
                    {t('Sans watermark')}
                  </span>
                )}
                <ChevronDown
                  className={`h-5 w-5 text-foreground/50 transition-transform ${studioOpen ? 'rotate-180' : ''}`}
                />
              </span>
            </button>

            {studioOpen && (
            <>
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Colonne gauche : reglages qualite + prompt personnalise */}
              <div className="space-y-4">
            {/* Codec video avance (le choix de resolution 720p/1080p est desormais
                un menu deroulant place juste au-dessus du bouton Demarrer). */}
            <div className="space-y-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="codec-select" className="text-xs text-foreground/60">
                  {t('Codec vidéo (avancé)')}
                </label>
                <select
                  id="codec-select"
                  value={videoCodec}
                  disabled={!isVip || isConnected}
                  onChange={e => setVideoCodec(e.target.value as typeof videoCodec)}
                  className="rounded-lg border border-hairline bg-black/40 px-2.5 py-1.5 text-xs font-medium text-foreground outline-none focus:border-yellow-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">{t('Auto')}</option>
                  <option value="h264">H.264 ({t('compatible')})</option>
                  <option value="vp9">VP9 ({t('net')})</option>
                  <option value="vp8">VP8</option>
                </select>
              </div>
            </div>

            {/* Prompt libre + Enhance */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-foreground/40">
                {t('Prompt personnalisé')}
              </label>
              <textarea
                value={livePrompt}
                onChange={e => setLivePromptText(e.target.value)}
                disabled={!isVip}
                rows={3}
                placeholder={t('Ex: dans un manoir gothique éclairé aux bougies, style cinématique...')}
                className="w-full resize-none rounded-xl border border-hairline bg-background/60 p-3 text-sm text-foreground placeholder:text-foreground/30 focus:border-primary/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
              />
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={!isVip}
                  onClick={() => setEnhancePrompt(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-foreground/60 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      enhancePrompt ? 'border-primary bg-primary' : 'border-hairline-strong'
                    }`}
                  >
                    {enhancePrompt && <Check className="h-3 w-3 text-black" />}
                  </span>
                  {t('Enhance (améliore le prompt)')}
                </button>
                <button
                  type="button"
                  disabled={!isVip || !isConnected || isApplyingPrompt || !livePrompt.trim()}
                  onClick={handleApplyFreePrompt}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] px-4 py-2 text-xs font-bold text-black transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isApplyingPrompt ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  {t('Appliquer')}
                </button>
              </div>
            </div>
              </div>

              {/* Colonne droite : presets par categorie */}
              <div className="space-y-3">
                {LUCY_PRESET_CATEGORIES.map(category => {
                  // Une categorie est "visuelle" si ses presets ont une image d'apercu
                  // (Decors, Arriere-plans) -> grille de cartes photo. Sinon (Styles,
                  // Effets) -> pastilles compactes, ce sont des filtres.
                  const isVisual = category.presets.some(p => p.image)
                  return (
                    <div key={category.id}>
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/40">
                        {t(category.label)}
                      </p>
                      {isVisual ? (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {category.presets.map(preset => {
                            const isActive = activePresetId === preset.id
                            const disabled = !isVip || !isConnected || isApplyingPrompt
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => handleApplyPreset(preset.id, preset.prompt)}
                                title={t(preset.label)}
                                className={`group relative aspect-video overflow-hidden rounded-xl border text-left transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                                  isActive
                                    ? 'border-primary shadow-[0_0_16px_rgba(0,255,136,0.35)]'
                                    : 'border-hairline hover:border-primary/50'
                                }`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={preset.image || '/placeholder.svg'}
                                  alt={t(preset.label)}
                                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                                <span className="absolute inset-x-0 bottom-0 p-2 text-[11px] font-semibold leading-tight text-white">
                                  {t(preset.label)}
                                </span>
                                {isActive && (
                                  <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-black">
                                    <Check className="h-3 w-3" />
                                  </span>
                                )}
                                {isApplyingPrompt && isActive && (
                                  <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {category.presets.map(preset => (
                            <button
                              key={preset.id}
                              type="button"
                              disabled={!isVip || !isConnected || isApplyingPrompt}
                              onClick={() => handleApplyPreset(preset.id, preset.prompt)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                                activePresetId === preset.id
                                  ? 'border-primary bg-primary/15 text-primary shadow-[0_0_16px_rgba(0,255,136,0.25)]'
                                  : 'border-hairline text-foreground/70 hover:border-primary/40 hover:text-foreground'
                              }`}
                            >
                              {t(preset.label)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {isVip && !isConnected && (
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-foreground/40">
                <AlertCircle className="h-3.5 w-3.5" />
                {t('Démarre le Live Swap pour appliquer des scènes en direct.')}
              </p>
            )}
            </>
            )}

            {/* Verrou upsell pour les comptes non-VIP */}
            {!isVip && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/80 p-6 text-center backdrop-blur-sm">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-primary to-[#8b5cf6]">
                  <Lock className="h-6 w-6 text-black" />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">{t('Fonctionnalité VIP')}</p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground/60">
                    {t('Débloque les prompts Studio CHAPCAM en direct et le rendu sans watermark avec VIP PRO ou VIP DEBOUT.')}
                  </p>
                </div>
                <Link
                  href="/dashboard/plans"
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-[#8b5cf6] px-5 py-2.5 text-sm font-bold text-black transition-all hover:shadow-[0_0_24px_rgba(139,92,246,0.45)]"
                >
                  <Crown className="h-4 w-4" />
                  {t('Passer VIP')}
                </Link>
              </div>
            )}
          </div>

          {/* Selecteur de resolution (720p / 1080p) — choix manuel, cout affiche.
              Par defaut 720p pour tous. Le 1080p (4 pts/s) est reserve VIP. */}
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-hairline bg-black/40 px-4 py-3">
            <span className="flex items-center gap-2">
              <Maximize2 className="h-4 w-4 text-primary" />
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">{t('Résolution')}</span>
                <span className="text-[11px] text-foreground/50">
                  {hdEnabled && isVip
                    ? `1080p Full HD — ${POINTS_PER_SECOND_HD} pts/s`
                    : `720p — ${POINTS_PER_SECOND_SD} pts/s${isVip ? '' : ` (${t('1080p réservé VIP')})`}`}
                </span>
              </span>
            </span>
            <select
              aria-label={t('Choisir la résolution du live swap')}
              value={hdEnabled && isVip ? '1080p' : '720p'}
              disabled={isConnected}
              onChange={e => setHdEnabled(e.target.value === '1080p')}
              className="rounded-lg border border-hairline bg-black/60 px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="720p">720p · {POINTS_PER_SECOND_SD} pts/s</option>
              <option value="1080p" disabled={!isVip}>
                1080p · {POINTS_PER_SECOND_HD} pts/s{isVip ? '' : ' (VIP)'}
              </option>
            </select>
          </div>

          {/* Certification d'usage responsable (avant demarrage) */}
          {!isConnected && (
            <SwapConsent checked={swapConsent} onChange={setSwapConsent} className="mb-3" />
          )}

          {/* Bouton Demarrer (degrade vert -> violet) */}
          <button
            onClick={isConnected ? handleStopSwap : handleStartSwap}
            disabled={!canStart && !isConnected}
            className={`group relative w-full overflow-hidden rounded-2xl py-5 text-lg font-bold transition-all ${
              isConnected
                ? 'bg-red-500 text-white hover:bg-red-600'
                : isConnecting
                ? 'cursor-wait bg-yellow-500 text-black'
                : canStart
                ? 'bg-gradient-to-r from-primary via-[#1ec8d8] to-[#8b5cf6] text-foreground shadow-[0_0_40px_rgba(0,255,136,0.35)] hover:shadow-[0_0_60px_rgba(139,92,246,0.45)]'
                : 'cursor-not-allowed bg-gray-700 text-muted-foreground'
            }`}
          >
            <span className="flex flex-col items-center justify-center gap-0.5">
              {isConnecting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connexion en cours...
                </span>
              ) : isConnected ? (
                <span className="flex items-center gap-2">
                  <Square className="h-5 w-5" />
                  Arrêter le Live Swap
                </span>
              ) : (
                <>
                  <span className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Démarrer le Live Swap
                  </span>
                  <span className="text-xs font-normal opacity-80">
                    La transformation commencera en temps réel
                  </span>
                </>
              )}
            </span>
          </button>

          {/* Enregistrement du resultat du swap (camera OU video importee) */}
          {(isConnected || recordedUrl) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-black/40 px-4 py-3">
              {isConnected && (
                <button
                  type="button"
                  onClick={() => (isRecording ? stopRecording() : startRecording())}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white/10 text-foreground hover:bg-white/20'
                  }`}
                >
                  {isRecording ? <Square className="h-4 w-4" /> : <Disc3 className="h-4 w-4 text-red-400" />}
                  {isRecording ? "Arrêter l'enregistrement" : 'Enregistrer le swap'}
                </button>
              )}
              {isRecording && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-red-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> REC
                </span>
              )}
              {recordedUrl && !isRecording && (
                <>
                  <a
                    href={recordedUrl}
                    download={`chapcam-swap-${Date.now()}.webm`}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                  >
                    <Download className="h-4 w-4" />
                    Télécharger l&apos;enregistrement
                  </a>
                  <button
                    type="button"
                    onClick={clearRecording}
                    aria-label="Supprimer l'enregistrement"
                    className="flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-2 text-xs text-foreground/60 transition-colors hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Supprimer
                  </button>
                </>
              )}
            </div>
          )}

          {!isConnected && <GenerateNotice className="mt-3" />}

          {/* Lecteur masque : lit la video importee pour capturer son flux. */}
          <video ref={uploadVideoRef} muted playsInline className="hidden" aria-hidden="true" />
        </div>

        {/* Panneau de reglages */}
        <aside className="h-fit space-y-6 rounded-2xl border border-hairline bg-muted p-5 backdrop-blur-xl lg:sticky lg:top-6">
          <button
            type="button"
            onClick={() => setSettingsOpen(v => !v)}
            className="flex w-full items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <span className="text-base font-bold text-foreground">Réglages du swap</span>
            </span>
            <ChevronDown
              className={`h-5 w-5 text-foreground/50 transition-transform ${settingsOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {settingsOpen && (
          <>
          {/* Qualite de rendu */}
          <div>
            <p className="mb-2 text-xs font-medium text-foreground/60">Qualité de rendu</p>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/40 p-1">
              {([
                { id: 'standard', label: 'Standard' },
                { id: 'hd', label: 'HD' },
                { id: 'ultra', label: 'Ultra HD' },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setRenderQuality(opt.id)}
                  className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                    renderQuality === opt.id ? 'bg-primary text-black' : 'text-foreground/60 hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          {([
            { label: 'Stabilité', value: stability, set: setStability },
            { label: 'Lissage', value: smoothing, set: setSmoothing },
            { label: 'Réduction du bruit', value: noiseReduction, set: setNoiseReduction },
          ]).map(s => (
            <div key={s.label}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-foreground/60">{s.label}</span>
                <span className="text-xs font-semibold text-primary">{s.value}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={s.value}
                onChange={e => s.set(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
            </div>
          ))}

          {/* Orientation du visage */}
          <div>
            <p className="mb-2 text-xs font-medium text-foreground/60">Orientation du visage</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'left', label: 'Gauche' },
                { id: 'center', label: 'Centre' },
                { id: 'right', label: 'Droite' },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFaceOrientation(opt.id)}
                  className={`flex flex-col items-center gap-1 rounded-lg border py-2.5 text-[10px] transition-colors ${
                    faceOrientation === opt.id
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-hairline bg-black/30 text-foreground/50 hover:border-hairline-strong'
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Correction des couleurs */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground/60">Correction des couleurs</span>
            <button
              onClick={() => setColorCorrection(v => !v)}
              role="switch"
              aria-checked={colorCorrection}
              aria-label="Correction des couleurs"
              className={`relative h-6 w-11 rounded-full transition-colors ${
                colorCorrection ? 'bg-primary' : 'bg-white/15'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  colorCorrection ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Mode de traitement */}
          <div>
            <p className="mb-2 text-xs font-medium text-foreground/60">Mode de traitement</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleModeChange('cloud')}
                disabled={hardware?.isGamingPC}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  processingMode === 'cloud'
                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                    : 'border-hairline bg-black/30 text-foreground/50 hover:border-hairline-strong'
                }`}
              >
                <Cloud className="h-4 w-4" />
                Cloud
              </button>
              <button
                onClick={() => handleModeChange('local')}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${
                  processingMode === 'local'
                    ? 'border-green-500/50 bg-green-500/10 text-green-400'
                    : 'border-hairline bg-black/30 text-foreground/50 hover:border-hairline-strong'
                }`}
              >
                <Monitor className="h-4 w-4" />
                Local
              </button>
            </div>
            {hardware?.isGamingPC && (
              <p className="mt-2 text-[10px] text-green-400/70">
                PC Gaming détecté — mode local forcé pour des performances optimales.
              </p>
            )}
          </div>

          {/* Session info */}
          <div className="space-y-2 rounded-xl border border-hairline bg-black/30 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-foreground/50">Durée session</span>
              <span className="font-medium text-foreground">{formatDuration(duration)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground/50">Points utilisés</span>
              <span className="font-medium text-foreground">{pointsUsed} pts</span>
            </div>
          </div>
          </>
          )}
        </aside>
      </div>

      <InstallationRequestModal
        open={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />

      {/* Mode plein ecran mobile immersif (facon FaceTime / TikTok Live).
          N'apparait que sur telephone quand le swap est connecte ; reutilise
          les memes flux video, sans recreer de connexion. */}
      <MobileLiveOverlay
        active={isConnected && (isMobile || manualFullscreen)}
        remoteVideoRef={remoteVideoRef}
        localVideoRef={localVideoRef}
        stats={stats}
        connectionQuality={connectionQuality}
        duration={duration}
        formatDuration={formatDuration}
        userPoints={userPoints}
        avatars={avatars}
        selectedAvatar={selectedAvatar}
        onSelectAvatar={handleSelectAvatar}
        onStop={handleStopSwap}
        onExitFullscreen={manualFullscreen ? () => setManualFullscreen(false) : undefined}
      />
    </div>
  )
}
