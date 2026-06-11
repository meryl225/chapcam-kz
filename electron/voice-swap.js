/**
 * Voice Swap - Service main-process (IMPLEMENTATION REELLE)
 * ========================================================
 * Conversion de voix en temps reel pour ChapCam Desktop.
 *
 * Repartition des roles (contrainte Electron) :
 *   - Le MICRO et la LECTURE audio vivent dans le RENDERER (getUserMedia /
 *     Web Audio + setSinkId). Le process Node n'a pas acces aux peripheriques.
 *   - Ce SERVICE MAIN garde la cle API ElevenLabs cote serveur et effectue les
 *     vrais appels reseau : catalogue de voix + conversion speech-to-speech.
 *
 * Pipeline reel :
 *   [renderer] micro -> PCM 16k mono -> WAV par segment
 *     -> IPC 'voice-swap:convert'
 *   [main] POST https://api.elevenlabs.io/v1/speech-to-speech/{voice_id}/stream
 *     -> PCM 16k converti (retour IPC)
 *   [renderer] lecture du PCM converti -> peripherique de sortie (VB-Cable)
 *     -> WhatsApp / Telegram / Discord
 *
 * NB : ElevenLabs voice-changer N'EXPOSE PAS de WebSocket temps reel ; le
 * "temps reel" est obtenu en segmentant le micro et en convertissant chaque
 * segment via l'endpoint HTTP streaming (optimize_streaming_latency=4).
 * Le systeme de licence/auth n'est PAS touche.
 */

const { ipcMain } = require('electron')

// ---- Constantes du pipeline (miroir de lib/voice-swap.ts) ----
const DEFAULT_FORMAT = { sampleRate: 16000, channels: 1, bitDepth: 16, encoding: 'pcm_s16le' }
const DEFAULT_CHUNKING = { chunkDurationMs: 100, maxBufferedChunks: 32, targetJitterBufferMs: 200 }

// Nom du micro virtuel cible (VB-Audio Virtual Cable).
const VIRTUAL_MIC_HINT = 'CABLE'

// ElevenLabs
const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'
// Format de sortie PCM 16 kHz (pcm_16000) pour rester aligne avec le pipeline.
const STS_OUTPUT_FORMAT = 'pcm_16000'

function log(msg) {
  console.log(`[VoiceSwap] ${msg}`)
}

function getApiKey() {
  return process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY || ''
}

/**
 * Construit un fichier WAV (PCM 16 bits) a partir d'un buffer PCM brut.
 * ElevenLabs accepte le multipart avec un conteneur WAV : on emballe le PCM
 * recu du renderer pour que l'API reconnaisse le format.
 */
function pcmToWav(pcmBuffer, sampleRate = 16000, channels = 1, bitDepth = 16) {
  const blockAlign = (channels * bitDepth) / 8
  const byteRate = sampleRate * blockAlign
  const dataSize = pcmBuffer.length
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // taille du sous-bloc fmt
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitDepth, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)
  return Buffer.concat([header, pcmBuffer])
}

/**
 * Gere l'etat d'une session de conversion de voix et les appels ElevenLabs.
 */
class VoiceSwapService {
  constructor() {
    this._window = null

    this.phase = 'idle' // idle | connecting | running | reconnecting | error | stopping
    this.voiceId = null
    this.error = null

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

    this.latency = { captureMs: 0, networkRttMs: 0, playbackMs: 0, endToEndMs: 0 }
    this.health = {
      quality: 'unknown',
      connected: false,
      reconnectAttempts: 0,
      droppedChunks: 0,
      lastResponseAt: null,
    }
    this.buffer = { bufferedChunks: 0, bufferedMs: 0, underruns: 0, overruns: 0 }

    // Fenetre glissante des derniers RTT pour lisser la mesure de latence.
    this._rttSamples = []
    this._healthTimer = null
    // Indique si la sortie selectionnee cote renderer est VB-Cable.
    this._virtualMicSelected = false
    // Catalogue de voix mis en cache.
    this._voicesCache = null
  }

  attachWindow(win) {
    this._window = win
  }

  getStatus() {
    return {
      phase: this.phase,
      active: this.phase === 'running',
      voiceId: this.voiceId,
      latency: { ...this.latency },
      health: { ...this.health },
      buffer: { ...this.buffer },
      virtualMicAvailable: this._virtualMicSelected,
      error: this.error,
    }
  }

  _pushState() {
    if (this._window && !this._window.isDestroyed()) {
      this._window.webContents.send('voice-swap-state', this.getStatus())
    }
  }

  /**
   * Liste les voix disponibles via l'API ElevenLabs (GET /v1/voices).
   * Renvoie [] proprement si la cle manque ou en cas d'erreur reseau.
   */
  async listVoices() {
    const apiKey = getApiKey()
    if (!apiKey) {
      log('listVoices: ELEVENLABS_API_KEY absente')
      return []
    }
    if (this._voicesCache) return this._voicesCache
    try {
      const res = await fetch(`${ELEVENLABS_BASE}/voices`, {
        headers: { 'xi-api-key': apiKey },
      })
      if (!res.ok) {
        log(`listVoices: HTTP ${res.status}`)
        return []
      }
      const data = await res.json()
      const voices = (data.voices || []).map((v) => ({
        id: v.voice_id,
        name: v.name,
        description: v.labels ? Object.values(v.labels).join(', ') : v.category,
        locale: v.labels?.language,
      }))
      this._voicesCache = voices
      return voices
    } catch (e) {
      log(`listVoices erreur: ${e.message}`)
      return []
    }
  }

  /**
   * Enumeration des peripheriques : faite cote renderer (navigator.mediaDevices).
   * Le main n'y a pas acces, on renvoie [] (le hook fusionne la liste reelle).
   */
  async listDevices() {
    return []
  }

  isVirtualMicAvailable() {
    return this._virtualMicSelected
  }

  /**
   * Conversion d'UN segment audio via ElevenLabs speech-to-speech streaming.
   * @param {Buffer} pcm  PCM 16-bit 16kHz mono capture par le renderer.
   * @returns {Promise<{ ok: boolean, pcm?: Buffer, rttMs?: number, error?: string }>}
   */
  async convertSegment(pcm) {
    const apiKey = getApiKey()
    if (!apiKey) {
      return { ok: false, error: 'Cle API ElevenLabs manquante.' }
    }
    const voiceId = this.config.conversion.voiceId
    if (!voiceId) {
      return { ok: false, error: 'Aucune voix cible selectionnee.' }
    }

    const t0 = Date.now()
    try {
      const wav = pcmToWav(pcm, this.config.format.sampleRate, 1, 16)
      const form = new FormData()
      form.append(
        'audio',
        new Blob([wav], { type: 'audio/wav' }),
        'segment.wav',
      )
      form.append('model_id', this.config.conversion.modelId || 'eleven_multilingual_sts_v2')
      form.append('remove_background_noise', String(!!this.config.conversion.removeBackgroundNoise))
      form.append(
        'voice_settings',
        JSON.stringify({
          stability: this.config.conversion.stability ?? 0.5,
          similarity_boost: this.config.conversion.similarityBoost ?? 0.75,
        }),
      )

      const url =
        `${ELEVENLABS_BASE}/speech-to-speech/${encodeURIComponent(voiceId)}/stream` +
        `?output_format=${STS_OUTPUT_FORMAT}&optimize_streaming_latency=4`

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey },
        body: form,
      })

      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        this.health.droppedChunks += 1
        return { ok: false, error: `ElevenLabs HTTP ${res.status} ${detail.slice(0, 120)}` }
      }

      const arrayBuf = await res.arrayBuffer()
      const rttMs = Date.now() - t0
      this._recordRtt(rttMs)
      this.health.connected = true
      this.health.lastResponseAt = Date.now()

      return { ok: true, pcm: Buffer.from(arrayBuf), rttMs }
    } catch (e) {
      this.health.droppedChunks += 1
      this.health.connected = false
      return { ok: false, error: e.message }
    }
  }

  _recordRtt(rttMs) {
    this._rttSamples.push(rttMs)
    if (this._rttSamples.length > 20) this._rttSamples.shift()
    const avg = Math.round(
      this._rttSamples.reduce((a, b) => a + b, 0) / this._rttSamples.length,
    )
    this.latency.networkRttMs = avg
    this.latency.endToEndMs = Math.round(
      this.latency.captureMs + avg + this.latency.playbackMs,
    )
  }

  /**
   * Demarre une session. La capture/lecture reelle est pilotee par le renderer ;
   * ici on valide la config (cle + voix) et on passe l'etat a running.
   */
  async start(config = {}) {
    if (this.phase === 'running' || this.phase === 'connecting') {
      log('Session deja active')
      return this.getStatus()
    }
    this.error = null
    this._mergeConfig(config)
    this.voiceId = this.config.conversion.voiceId || null

    if (!getApiKey()) {
      this.phase = 'error'
      this.error = 'Cle API ElevenLabs manquante (ELEVENLABS_API_KEY).'
      this._pushState()
      return this.getStatus()
    }
    if (!this.voiceId) {
      this.phase = 'error'
      this.error = 'Selectionnez une voix cible avant de demarrer.'
      this._pushState()
      return this.getStatus()
    }

    this.phase = 'connecting'
    this._resetMonitoring()
    this._pushState()

    // La connexion est validee au 1er segment converti ; on passe running et on
    // laisse le renderer envoyer les segments via 'voice-swap:convert'.
    this.phase = 'running'
    this._startHealthMonitor()
    this._pushState()
    log(`Session demarree (voiceId=${this.voiceId})`)
    return this.getStatus()
  }

  async stop() {
    if (this.phase === 'idle') return this.getStatus()
    this.phase = 'stopping'
    this._pushState()

    this._stopHealthMonitor()
    this._resetMonitoring()
    this.phase = 'idle'
    log('Session arretee')
    this._pushState()
    return this.getStatus()
  }

  async updateSettings(settings = {}) {
    this.config.conversion = { ...this.config.conversion, ...settings }
    if (settings.voiceId !== undefined) this.voiceId = settings.voiceId || null
    log('Reglages de conversion mis a jour')
    this._pushState()
    return this.getStatus()
  }

  /** Recoit les metriques mesurees cote renderer (capture/playback/buffer). */
  reportMetrics(m = {}) {
    if (typeof m.captureMs === 'number') this.latency.captureMs = Math.round(m.captureMs)
    if (typeof m.playbackMs === 'number') this.latency.playbackMs = Math.round(m.playbackMs)
    if (m.buffer) {
      this.buffer = { ...this.buffer, ...m.buffer }
    }
    if (typeof m.virtualMicSelected === 'boolean') {
      this._virtualMicSelected = m.virtualMicSelected
    }
    if (typeof m.underrun === 'boolean' && m.underrun) this.buffer.underruns += 1
    this.latency.endToEndMs = Math.round(
      this.latency.captureMs + this.latency.networkRttMs + this.latency.playbackMs,
    )
  }

  _startHealthMonitor() {
    this._stopHealthMonitor()
    this._healthTimer = setInterval(() => {
      // Connexion perdue si aucune reponse depuis > 5 s en cours de session.
      if (this.health.lastResponseAt && Date.now() - this.health.lastResponseAt > 5000) {
        this.health.connected = false
      }
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
    this._rttSamples = []
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

  // Conversion d'un segment : le renderer envoie le PCM, on renvoie le PCM converti.
  ipcMain.handle('voice-swap-convert', async (_e, payload) => {
    if (!payload || !payload.pcm) return { ok: false, error: 'Segment vide.' }
    // payload.pcm arrive en ArrayBuffer/Uint8Array via IPC.
    const buf = Buffer.from(payload.pcm)
    const result = await svc.convertSegment(buf)
    if (result.ok && result.pcm) {
      // Renvoie un ArrayBuffer transferable.
      return {
        ok: true,
        rttMs: result.rttMs,
        pcm: result.pcm.buffer.slice(result.pcm.byteOffset, result.pcm.byteOffset + result.pcm.byteLength),
      }
    }
    return { ok: false, error: result.error }
  })

  // Metriques mesurees cote renderer (capture/playback/buffer/virtual mic).
  ipcMain.on('voice-swap-metrics', (_e, m) => svc.reportMetrics(m || {}))
}

module.exports = {
  VoiceSwapService,
  getVoiceSwap,
  setupVoiceSwapIPC,
  pcmToWav,
  DEFAULT_FORMAT,
  DEFAULT_CHUNKING,
  VIRTUAL_MIC_HINT,
}
