/**
 * ChapCam Desktop - Voice Swap (ARCHITECTURE / CONTRATS)
 * ======================================================
 * Module de conversion de voix en TEMPS REEL pour l'application de bureau.
 *
 * IMPORTANT : ce fichier ne fait QUE definir l'architecture (types, interfaces,
 * contrats d'API et helpers d'acces). AUCUN streaming audio n'est implemente
 * ici pour l'instant -- l'integration reelle viendra plus tard.
 *
 * Pipeline cible (a implementer plus tard) :
 *   Micro physique
 *     -> capture PCM 16 kHz mono
 *     -> decoupage en chunks
 *     -> ElevenLabs Voice Changer Stream API (websocket/HTTP stream)
 *     -> reception du flux audio converti
 *     -> sortie vers micro virtuel (VB-Cable)
 *     -> WhatsApp / Telegram / Discord
 *
 * Ce module est PARALLELE a la camera virtuelle (voir lib/electron.ts et
 * electron/virtual-camera.js) et suit volontairement le meme pattern :
 *   service main-process (singleton + IPC) -> preload -> window.electronAPI
 *   -> hook React. Le systeme de licence/auth existant n'est PAS modifie.
 */

// ----------------------------------------------------------------------------
// Format audio du pipeline temps reel
// ----------------------------------------------------------------------------

/** Parametres de capture/lecture audio (defauts adaptes a ElevenLabs). */
export interface AudioFormat {
  /** Frequence d'echantillonnage en Hz. ElevenLabs Voice Changer : 16000. */
  sampleRate: number
  /** Nombre de canaux (1 = mono, requis par le pipeline). */
  channels: number
  /** Profondeur d'echantillon en bits (PCM 16 bits signe little-endian). */
  bitDepth: 16
  /** Encodage transmis a l'API distante. */
  encoding: 'pcm_s16le'
}

/** Format par defaut : PCM 16 kHz mono 16 bits, attendu par ElevenLabs. */
export const DEFAULT_AUDIO_FORMAT: AudioFormat = {
  sampleRate: 16000,
  channels: 1,
  bitDepth: 16,
  encoding: 'pcm_s16le',
}

/**
 * Taille de chunk cible pour le streaming. Un compromis latence/debit :
 * des chunks plus petits = latence plus faible mais plus d'overhead reseau.
 */
export interface ChunkingConfig {
  /** Duree visee d'un chunk audio, en millisecondes. */
  chunkDurationMs: number
  /** Nombre max de chunks gardes en buffer avant lecture (anti-jitter). */
  maxBufferedChunks: number
  /** Buffer cible avant de demarrer la lecture (warm-up anti-coupure). */
  targetJitterBufferMs: number
}

export const DEFAULT_CHUNKING: ChunkingConfig = {
  chunkDurationMs: 100,
  maxBufferedChunks: 32,
  targetJitterBufferMs: 200,
}

// ----------------------------------------------------------------------------
// Voix & configuration de session
// ----------------------------------------------------------------------------

/** Une voix cible disponible pour la conversion (catalogue ElevenLabs). */
export interface VoiceProfile {
  /** Identifiant de la voix cote fournisseur (ElevenLabs voice_id). */
  id: string
  /** Nom affiche dans l'UI. */
  name: string
  /** Description courte optionnelle. */
  description?: string
  /** Langue principale de la voix (BCP-47), informatif. */
  locale?: string
}

/** Reglages de conversion passes a l'API distante. */
export interface VoiceConversionSettings {
  /** Voix cible. */
  voiceId: string
  /** Modele de conversion (ex: "eleven_multilingual_sts_v2"). */
  modelId?: string
  /** Stabilite de la voix (0..1). */
  stability?: number
  /** Similarite a la voix cible (0..1). */
  similarityBoost?: number
  /** Exageration du style (0..1). */
  style?: number
  /** Renforcement de la ressemblance au locuteur cible. */
  useSpeakerBoost?: boolean
  /** Supprimer le bruit de fond du micro avant conversion. */
  removeBackgroundNoise?: boolean
}

export const DEFAULT_CONVERSION_SETTINGS: VoiceConversionSettings = {
  voiceId: '',
  modelId: 'eleven_multilingual_sts_v2',
  stability: 0.65,
  similarityBoost: 0.85,
  style: 0,
  useSpeakerBoost: false,
  removeBackgroundNoise: false,
}

// ----------------------------------------------------------------------------
// Modeles speech-to-speech reels (les SEULS acceptes par l'API voice-changer)
// ----------------------------------------------------------------------------

/** Les 2 modeles STS reellement disponibles cote ElevenLabs. */
export const STS_MODELS = [
  {
    id: 'eleven_multilingual_sts_v2',
    name: 'Multilingue v2',
    description: 'Toutes langues (dont francais) - qualite maximale',
  },
  {
    id: 'eleven_english_sts_v2',
    name: 'Anglais v2',
    description: 'Optimise pour l\'anglais - un peu plus rapide',
  },
] as const

export type StsModelId = (typeof STS_MODELS)[number]['id']
export const DEFAULT_STS_MODEL: StsModelId = 'eleven_multilingual_sts_v2'

/** Reglages fins d'une session : modele + segmentation + voix. */
export interface VoiceTuning {
  modelId: StsModelId
  /** 0..4 : plus haut = latence plus faible (compromis qualite). */
  optimizeStreamingLatency: number
  /** Cloture souple : au-dela, on coupe au prochain creux (frontiere de mot). */
  softMaxSegmentMs: number
  /** Filet de securite : coupe forcee meme sans pause. */
  hardMaxSegmentMs: number
  /** Silence qui cloture un segment (fin de phrase). */
  silenceHangMs: number
  /** Duree minimale d'un segment avant envoi. */
  minSegmentMs: number
  /** Avance de lecture anti-coupure. */
  jitterBufferMs: number
  stability: number
  similarityBoost: number
  style: number
  useSpeakerBoost: boolean
}

/** Un mode de streaming = un preset complet latence/qualite pret a l'emploi. */
export interface VoiceStreamMode {
  id: string
  label: string
  description: string
  /** Estimation lisible de la latence bout-en-bout. */
  estLatency: string
  /** Estimation lisible de la qualite de voix. */
  estQuality: string
  tuning: VoiceTuning
}

/**
 * Presets ordonnes de la latence la plus faible a la qualite la plus haute.
 * Tous utilisent un modele STS reel. Le decoupage respecte les frontieres de
 * mots (jamais de coupe en plein mot) pour garder des mots coherents.
 */
export const VOICE_STREAM_MODES: VoiceStreamMode[] = [
  {
    id: 'ultra',
    label: 'Ultra faible latence',
    description: 'Reactivite maximale pour le direct. Voix correcte.',
    estLatency: 'Tres faible (~0.6 s)',
    estQuality: 'Correcte',
    tuning: {
      modelId: 'eleven_multilingual_sts_v2',
      optimizeStreamingLatency: 4,
      softMaxSegmentMs: 1400,
      hardMaxSegmentMs: 3000,
      silenceHangMs: 300,
      // Plancher plus haut : evite les fragments minuscules convertis separement
      // (source principale de voix hachee en direct).
      minSegmentMs: 320,
      jitterBufferMs: 180,
      stability: 0.55,
      similarityBoost: 0.8,
      style: 0,
      useSpeakerBoost: false,
    },
  },
  {
    id: 'gaming',
    label: 'Gaming',
    description: 'Faible latence pour Discord/jeux, voix plus stable.',
    estLatency: 'Faible (~0.8 s)',
    estQuality: 'Bonne',
    tuning: {
      modelId: 'eleven_multilingual_sts_v2',
      optimizeStreamingLatency: 4,
      softMaxSegmentMs: 1800,
      hardMaxSegmentMs: 3500,
      silenceHangMs: 340,
      minSegmentMs: 360,
      jitterBufferMs: 220,
      stability: 0.65,
      similarityBoost: 0.85,
      style: 0,
      useSpeakerBoost: false,
    },
  },
  {
    id: 'equilibre',
    label: 'Equilibre',
    description: 'Meilleur compromis latence / voix naturelle. Recommande.',
    estLatency: 'Moyenne (~1.2 s)',
    estQuality: 'Tres bonne',
    tuning: {
      modelId: 'eleven_multilingual_sts_v2',
      optimizeStreamingLatency: 3,
      softMaxSegmentMs: 2200,
      hardMaxSegmentMs: 4500,
      silenceHangMs: 380,
      minSegmentMs: 240,
      jitterBufferMs: 160,
      stability: 0.65,
      similarityBoost: 0.85,
      style: 0,
      useSpeakerBoost: true,
    },
  },
  {
    id: 'studio',
    label: 'Studio',
    description: 'Voix soignee et reguliere. Latence plus elevee.',
    estLatency: 'Elevee (~1.8 s)',
    estQuality: 'Maximale',
    tuning: {
      modelId: 'eleven_multilingual_sts_v2',
      optimizeStreamingLatency: 2,
      softMaxSegmentMs: 3000,
      hardMaxSegmentMs: 6000,
      silenceHangMs: 500,
      minSegmentMs: 300,
      jitterBufferMs: 220,
      stability: 0.8,
      similarityBoost: 0.9,
      style: 0.1,
      useSpeakerBoost: true,
    },
  },
  {
    id: 'podcast',
    label: 'Podcast',
    description: 'Rendu le plus riche pour enregistrement. Latence elevee.',
    estLatency: 'Elevee (~2 s)',
    estQuality: 'Maximale',
    tuning: {
      modelId: 'eleven_multilingual_sts_v2',
      optimizeStreamingLatency: 2,
      softMaxSegmentMs: 3500,
      hardMaxSegmentMs: 7000,
      silenceHangMs: 600,
      minSegmentMs: 300,
      jitterBufferMs: 240,
      stability: 0.75,
      similarityBoost: 0.9,
      style: 0.15,
      useSpeakerBoost: true,
    },
  },
]

export const DEFAULT_STREAM_MODE_ID = 'equilibre'

export function getStreamMode(id: string): VoiceStreamMode {
  return VOICE_STREAM_MODES.find((m) => m.id === id) || VOICE_STREAM_MODES[2]
}

/** Traitement du micro applique a la capture (getUserMedia). */
export interface MicProcessing {
  /** Suppression du bruit de fond. */
  noiseSuppression: boolean
  /** Annulation d'echo. */
  echoCancellation: boolean
  /** Gain automatique. */
  autoGainControl: boolean
}

export const DEFAULT_MIC_PROCESSING: MicProcessing = {
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
}

/** Peripherique audio (entree micro ou sortie). */
export interface AudioDevice {
  /** Identifiant systeme du peripherique. */
  deviceId: string
  /** Nom lisible. */
  label: string
  /** Type de peripherique. */
  kind: 'audioinput' | 'audiooutput'
  /** Vrai si c'est le micro virtuel VB-Cable (cible de sortie). */
  isVirtual?: boolean
}

/** Configuration complete d'une session Voice Swap. */
export interface VoiceSwapConfig {
  format: AudioFormat
  chunking: ChunkingConfig
  conversion: VoiceConversionSettings
  /** Reglages fins (mode de streaming + segmentation). Optionnel. */
  tuning?: VoiceTuning
  /** Traitement du micro a la capture. Optionnel. */
  micProcessing?: MicProcessing
  /** Peripherique d'entree (micro physique). null = peripherique par defaut. */
  inputDeviceId: string | null
  /** Peripherique de sortie (idealement VB-Cable). null = defaut. */
  outputDeviceId: string | null
}

// ----------------------------------------------------------------------------
// Etat runtime, monitoring & sante de connexion
// ----------------------------------------------------------------------------

/** Phase de la session de conversion temps reel. */
export type VoiceSwapPhase =
  | 'idle' // rien en cours
  | 'connecting' // ouverture du flux vers ElevenLabs
  | 'running' // conversion active
  | 'reconnecting' // perte de connexion, tentative de reprise
  | 'error' // arret sur erreur
  | 'stopping' // arret demande, fermeture propre

/** Qualite de la connexion de streaming (derivee du monitoring). */
export type ConnectionQuality = 'unknown' | 'good' | 'degraded' | 'poor'

/** Mesures de latence du pipeline (en millisecondes). */
export interface LatencyMetrics {
  /** Latence capture micro -> envoi du chunk. */
  captureMs: number
  /** Aller-retour reseau vers ElevenLabs (envoi -> 1ere reponse). */
  networkRttMs: number
  /** Latence reception -> lecture (incl. jitter buffer). */
  playbackMs: number
  /** Latence bout-en-bout estimee (bouche -> sortie virtuelle). */
  endToEndMs: number
}

export const ZERO_LATENCY: LatencyMetrics = {
  captureMs: 0,
  networkRttMs: 0,
  playbackMs: 0,
  endToEndMs: 0,
}

/** Etat de sante de la connexion de streaming. */
export interface ConnectionHealth {
  quality: ConnectionQuality
  /** Connexion au flux distant ouverte ? */
  connected: boolean
  /** Nombre de reconnexions depuis le debut de la session. */
  reconnectAttempts: number
  /** Chunks perdus/droppes (back-pressure ou packet loss). */
  droppedChunks: number
  /** Horodatage (ms epoch) de la derniere reponse audio recue. */
  lastResponseAt: number | null
}

export const INITIAL_HEALTH: ConnectionHealth = {
  quality: 'unknown',
  connected: false,
  reconnectAttempts: 0,
  droppedChunks: 0,
  lastResponseAt: null,
}

/** Statistiques de buffering (anti-jitter / back-pressure). */
export interface BufferStats {
  /** Chunks actuellement en file de lecture. */
  bufferedChunks: number
  /** Millisecondes d'audio actuellement en buffer. */
  bufferedMs: number
  /** Underruns (buffer vide -> coupure son). */
  underruns: number
  /** Overruns (buffer plein -> frames jetees). */
  overruns: number
}

export const INITIAL_BUFFER_STATS: BufferStats = {
  bufferedChunks: 0,
  bufferedMs: 0,
  underruns: 0,
  overruns: 0,
}

/** Etat complet expose a l'UI (pousse par le main process). */
export interface VoiceSwapState {
  phase: VoiceSwapPhase
  /** Vrai quand phase === 'running'. Raccourci pratique pour l'UI. */
  active: boolean
  /** Voix cible courante (id), si selectionnee. */
  voiceId: string | null
  latency: LatencyMetrics
  health: ConnectionHealth
  buffer: BufferStats
  /** Le micro virtuel VB-Cable est-il detecte comme sortie ? */
  virtualMicAvailable: boolean
  /** Derniere erreur lisible, le cas echeant. */
  error: string | null
}

export const INITIAL_VOICE_SWAP_STATE: VoiceSwapState = {
  phase: 'idle',
  active: false,
  voiceId: null,
  latency: ZERO_LATENCY,
  health: INITIAL_HEALTH,
  buffer: INITIAL_BUFFER_STATS,
  virtualMicAvailable: false,
  error: null,
}

// ----------------------------------------------------------------------------
// Contrat de l'API Electron exposee a la page web (namespace voiceSwap)
// ----------------------------------------------------------------------------

/**
 * Surface d'API que le preload exposera sous window.electronAPI.voiceSwap.
 * Implementation reelle a venir : pour l'instant les services renvoient l'etat
 * et ne demarrent aucun flux audio.
 */
export interface VoiceSwapAPI {
  /** Etat courant de la session. */
  status: () => Promise<VoiceSwapState>
  /** Liste les peripheriques audio (entrees + sorties). */
  listDevices: () => Promise<AudioDevice[]>
  /** Liste les voix cibles disponibles (catalogue distant). */
  listVoices: () => Promise<VoiceProfile[]>
  /** Demarre une session de conversion (no-op tant que non implemente). */
  start: (config: Partial<VoiceSwapConfig>) => Promise<VoiceSwapState>
  /** Arrete la session en cours. */
  stop: () => Promise<VoiceSwapState>
  /** Met a jour les reglages de conversion a chaud. */
  updateSettings: (settings: Partial<VoiceConversionSettings>) => Promise<VoiceSwapState>
  /** Abonnement aux mises a jour d'etat poussees par le main process. */
  onState: (callback: (state: VoiceSwapState) => void) => void
  /**
   * Convertit un segment audio (PCM 16-bit 16kHz mono) via ElevenLabs et
   * renvoie le PCM converti. Appele en boucle par le moteur audio du renderer.
   */
  convert: (payload: { pcm: ArrayBuffer }) => Promise<ConvertResult>
  /** Remonte au main les metriques mesurees cote renderer. */
  reportMetrics: (metrics: RendererMetrics) => void
}

/** Resultat d'une conversion de segment renvoye par le main process. */
export interface ConvertResult {
  ok: boolean
  /** PCM 16-bit 16kHz mono converti (present si ok). */
  pcm?: ArrayBuffer
  /** Aller-retour reseau ElevenLabs en ms. */
  rttMs?: number
  /** Message d'erreur si la conversion a echoue. */
  error?: string
}

/** Metriques mesurees cote renderer et remontees au main process. */
export interface RendererMetrics {
  /** Latence de capture micro -> segment pret, en ms. */
  captureMs?: number
  /** Latence reception -> lecture (incl. jitter buffer), en ms. */
  playbackMs?: number
  /** Statistiques de buffer courantes. */
  buffer?: Partial<BufferStats>
  /** La sortie selectionnee est-elle le micro virtuel VB-Cable ? */
  virtualMicSelected?: boolean
  /** Vrai si un underrun de buffer vient de se produire. */
  underrun?: boolean
}

// ----------------------------------------------------------------------------
// Helpers d'acces (web-safe : ne plantent pas hors Electron)
// ----------------------------------------------------------------------------

/**
 * Recupere l'API Voice Swap si elle est disponible dans l'app de bureau.
 * Renvoie null sur le web ou sur une ancienne version sans Voice Swap.
 */
export function getVoiceSwapAPI(): VoiceSwapAPI | null {
  if (typeof window === 'undefined') return null
  const api = (window as unknown as { electronAPI?: { voiceSwap?: VoiceSwapAPI } }).electronAPI
  if (!api || typeof api.voiceSwap?.status !== 'function') return null
  return api.voiceSwap
}

/** Indique si la fonctionnalite Voice Swap est disponible (app de bureau a jour). */
export function isVoiceSwapAvailable(): boolean {
  return getVoiceSwapAPI() !== null
}

/** Estime la latence bout-en-bout a partir des composantes mesurees. */
export function computeEndToEndLatency(m: Omit<LatencyMetrics, 'endToEndMs'>): number {
  return Math.round(m.captureMs + m.networkRttMs + m.playbackMs)
}

/** Derive une qualite de connexion a partir du RTT et des pertes. */
export function deriveConnectionQuality(rttMs: number, droppedChunks: number): ConnectionQuality {
  if (rttMs <= 0) return 'unknown'
  if (rttMs < 150 && droppedChunks === 0) return 'good'
  if (rttMs < 400 && droppedChunks < 5) return 'degraded'
  return 'poor'
}
