/**
 * Voice Swap - Service main-process (ARCHITECTURE / SCAFFOLDING)
 * =============================================================
 * Conversion de voix en temps reel pour ChapCam Desktop.
 *
 * ETAT : SQUELETTE D'ARCHITECTURE UNIQUEMENT.
 * Aucun audio n'est capture, envoye ou lu ici pour l'instant. Ce service pose
 * la structure (singleton, etat, monitoring, IPC) qui accueillera plus tard
 * l'integration reelle du streaming par chunks vers ElevenLabs et la sortie
 * vers le micro virtuel VB-Cable.
 *
 * Pattern : calque sur electron/virtual-camera.js (singleton + setup IPC), pour
 * rester coherent avec le reste de l'app de bureau. Le systeme de licence/auth
 * n'est PAS touche.
 *
 * Pipeline cible (a implementer) :
 *   micro -> PCM 16k mono -> chunks -> ElevenLabs Voice Changer Stream
 *   -> reponse audio en flux -> VB-Cable -> WhatsApp/Telegram/Discord
 */

const { ipcMain } = require('electron')

// ---- Constantes du pipeline (miroir de lib/voice-swap.ts) ----
const DEFAULT_FORMAT = { sampleRate: 16000, channels: 1, bitDepth: 16, encoding: 'pcm_s16le' }
const DEFAULT_CHUNKING = { chunkDurationMs: 100, maxBufferedChunks: 32, targetJitterBufferMs: 200 }

// Nom du micro virtuel cible (VB-Audio Virtual Cable).
const VIRTUAL_MIC_HINT = 'CABLE'

function log(msg) {
  console.log(`[VoiceSwap] ${msg}`)
}

/**
 * Gere l'etat d'une session de conversion de voix.
 *
 * Les methodes start/stop/updateSettings existent mais ne demarrent PAS encore
 * de flux audio : elles ne font que faire evoluer l'etat et le diffuser a l'UI.
 * Les sous-systemes de monitoring (latence, sante connexion, buffering) sont
 * prepares pour etre alimentes par la future implementation du streaming.
 */
class VoiceSwapService {
  constructor() {
    /** Fenetre principale pour pousser l'etat vers l'UI web. */
    this._window = null

    // ---- Etat runtime (forme = VoiceSwapState cote TS) ----
    this.phase = 'idle' // idle | connecting | running | reconnecting | error | stopping
    this.voiceId = null
    this.error = null

    // Config de session courante (defauts)
    this.config = {
      format: { ...DEFAULT_FORMAT },
      chunking: { ...DEFAULT_CHUNKING },
      conversion: {
        voiceId: '',
        modelId: 'eleven_multilingual_sts_v2',
        stability: 0.5,
        similarityBoost: 0.75,
        removeBackgroundNoise: true,
      },
      inputDeviceId: null,
      outputDeviceId: null,
    }

    // ---- Monitoring : latence ----
    this.latency = { captureMs: 0, networkRttMs: 0, playbackMs: 0, endToEndMs: 0 }

    // ---- Monitoring : sante de connexion ----
    this.health = {
      quality: 'unknown',
      connected: false,
      reconnectAttempts: 0,
      droppedChunks: 0,
      lastResponseAt: null,
    }

    // ---- Monitoring : buffering ----
    this.buffer = { bufferedChunks: 0, bufferedMs: 0, underruns: 0, overruns: 0 }

    // Handles internes (timers/sockets/process) reserves pour plus tard.
    this._healthTimer = null
    this._stream = null // futur: connexion ElevenLabs (ws/http stream)
    this._capture = null // futur: process/flux de capture micro
    this._playback = null // futur: process/flux vers VB-Cable
  }

  /** Enregistre la fenetre cible pour les push d'etat. */
  attachWindow(win) {
    this._window = win
  }

  /** Construit l'objet d'etat complet (= VoiceSwapState). */
  getStatus() {
    return {
      phase: this.phase,
      active: this.phase === 'running',
      voiceId: this.voiceId,
      latency: { ...this.latency },
      health: { ...this.health },
      buffer: { ...this.buffer },
      virtualMicAvailable: this.isVirtualMicAvailable(),
      error: this.error,
    }
  }

  /** Pousse l'etat courant vers l'UI web (canal 'voice-swap-state'). */
  _pushState() {
    if (this._window && !this._window.isDestroyed()) {
      this._window.webContents.send('voice-swap-state', this.getStatus())
    }
  }

  /**
   * Liste les peripheriques audio.
   * SCAFFOLDING : l'enumeration reelle (entrees/sorties) sera faite plus tard
   * cote renderer via navigator.mediaDevices, ou via un addon natif. On renvoie
   * une liste vide pour ne rien casser cote UI.
   */
  async listDevices() {
    return []
  }

  /**
   * Liste les voix cibles.
   * SCAFFOLDING : sera alimente par l'API ElevenLabs (catalogue de voix).
   */
  async listVoices() {
    return []
  }

  /** Heuristique : VB-Cable installe ? (a affiner avec l'enum reelle). */
  isVirtualMicAvailable() {
    // SCAFFOLDING : sans enumeration de peripheriques, on ne peut pas confirmer.
    // La future implementation cherchera un peripherique contenant VIRTUAL_MIC_HINT.
    return false
  }

  /**
   * Demarre une session de conversion.
   * SCAFFOLDING : valide/merge la config et passe l'etat a 'running' SANS
   * ouvrir de flux audio. La logique reelle (capture -> chunks -> ElevenLabs
   * -> VB-Cable) sera branchee ici.
   */
  async start(config = {}) {
    if (this.phase === 'running' || this.phase === 'connecting') {
      log('Session deja active')
      return this.getStatus()
    }
    this.error = null
    this._mergeConfig(config)
    this.voiceId = this.config.conversion.voiceId || null

    // Transition d'etat (placeholder, pas de reseau reel).
    this.phase = 'connecting'
    this._pushState()
    log(`start() demande (voiceId=${this.voiceId || 'aucune'}) - streaming non encore implemente`)

    // TODO(futur): ouvrir le flux ElevenLabs, demarrer capture + playback,
    // puis passer phase a 'running' une fois le 1er chunk converti recu.
    this.phase = 'running'
    this.health.connected = false // pas de vraie connexion tant que non implemente
    this._startHealthMonitor()
    this._pushState()
    return this.getStatus()
  }

  /**
   * Arrete la session et libere les ressources (placeholders aujourd'hui).
   */
  async stop() {
    if (this.phase === 'idle') return this.getStatus()
    this.phase = 'stopping'
    this._pushState()

    this._stopHealthMonitor()
    // TODO(futur): fermer le flux ElevenLabs, stopper capture + playback.
    this._stream = null
    this._capture = null
    this._playback = null

    this._resetMonitoring()
    this.phase = 'idle'
    log('Session arretee')
    this._pushState()
    return this.getStatus()
  }

  /** Met a jour les reglages de conversion a chaud. */
  async updateSettings(settings = {}) {
    this.config.conversion = { ...this.config.conversion, ...settings }
    if (settings.voiceId !== undefined) this.voiceId = settings.voiceId || null
    log('Reglages de conversion mis a jour')
    // TODO(futur): si une session tourne, renegocier le flux avec les nouveaux reglages.
    this._pushState()
    return this.getStatus()
  }

  // -------------------------------------------------------------------------
  // Monitoring : sante de connexion (boucle d'echantillonnage)
  // -------------------------------------------------------------------------

  _startHealthMonitor() {
    this._stopHealthMonitor()
    // Echantillonne periodiquement l'etat de sante et le pousse a l'UI.
    // SCAFFOLDING : valeurs inertes tant que le streaming n'existe pas.
    this._healthTimer = setInterval(() => {
      this._recomputeQuality()
      this._pushState()
    }, 1000)
  }

  _stopHealthMonitor() {
    if (this._healthTimer) {
      clearInterval(this._healthTimer)
      this._healthTimer = null
    }
  }

  /** Recalcule la qualite de connexion (miroir de deriveConnectionQuality). */
  _recomputeQuality() {
    const rtt = this.latency.networkRttMs
    const dropped = this.health.droppedChunks
    if (rtt <= 0) this.health.quality = 'unknown'
    else if (rtt < 150 && dropped === 0) this.health.quality = 'good'
    else if (rtt < 400 && dropped < 5) this.health.quality = 'degraded'
    else this.health.quality = 'poor'
  }

  _resetMonitoring() {
    this.latency = { captureMs: 0, networkRttMs: 0, playbackMs: 0, endToEndMs: 0 }
    this.health = {
      quality: 'unknown',
      connected: false,
      reconnectAttempts: 0,
      droppedChunks: 0,
      lastResponseAt: null,
    }
    this.buffer = { bufferedChunks: 0, bufferedMs: 0, underruns: 0, overruns: 0 }
  }

  _mergeConfig(config) {
    if (!config || typeof config !== 'object') return
    if (config.format) this.config.format = { ...this.config.format, ...config.format }
    if (config.chunking) this.config.chunking = { ...this.config.chunking, ...config.chunking }
    if (config.conversion) this.config.conversion = { ...this.config.conversion, ...config.conversion }
    if (config.inputDeviceId !== undefined) this.config.inputDeviceId = config.inputDeviceId
    if (config.outputDeviceId !== undefined) this.config.outputDeviceId = config.outputDeviceId
  }
}

// ---- Singleton ----
let instance = null
function getVoiceSwap() {
  if (!instance) instance = new VoiceSwapService()
  return instance
}

// ---- IPC ----
function setupVoiceSwapIPC(mainWindow) {
  const svc = getVoiceSwap()
  if (mainWindow) svc.attachWindow(mainWindow)

  ipcMain.handle('voice-swap-status', async () => svc.getStatus())
  ipcMain.handle('voice-swap-list-devices', async () => svc.listDevices())
  ipcMain.handle('voice-swap-list-voices', async () => svc.listVoices())
  ipcMain.handle('voice-swap-start', async (_e, config) => svc.start(config || {}))
  ipcMain.handle('voice-swap-stop', async () => svc.stop())
  ipcMain.handle('voice-swap-update-settings', async (_e, settings) => svc.updateSettings(settings || {}))

  // Canal pour les futurs chunks audio captures par le renderer (send/on,
  // comme 'vcam:frame'). Ignore pour l'instant.
  ipcMain.on('voice-swap:chunk', () => {
    // TODO(futur): transmettre le chunk PCM au flux ElevenLabs.
  })
}

module.exports = {
  VoiceSwapService,
  getVoiceSwap,
  setupVoiceSwapIPC,
  DEFAULT_FORMAT,
  DEFAULT_CHUNKING,
  VIRTUAL_MIC_HINT,
}
