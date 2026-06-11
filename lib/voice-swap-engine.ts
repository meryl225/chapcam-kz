/**
 * ChapCam Desktop - Voice Swap : moteur audio (RENDERER)
 * ======================================================
 * Implementation reelle de la capture micro, du decoupage en segments PCM
 * 16 kHz mono, de l'appel de conversion (ElevenLabs via le main process) et de
 * la lecture du resultat vers le peripherique de sortie (idealement VB-Cable).
 *
 * Pourquoi cote renderer ? Sous Electron, seul le process de rendu a acces aux
 * peripheriques audio (navigator.mediaDevices.getUserMedia / Web Audio /
 * HTMLMediaElement.setSinkId). Le main process garde la cle API et fait l'appel
 * reseau ; il ne touche jamais au micro ni aux haut-parleurs.
 *
 * Flux : getUserMedia -> AudioContext -> downsample 16k mono -> segmentation
 * par activite vocale (VAD energie) -> electronAPI.voiceSwap.convert(pcm)
 * -> PCM converti -> file de lecture -> <audio>.setSinkId(VB-Cable).
 */

import {
  getVoiceSwapAPI,
  type ConvertResult,
  type RendererMetrics,
} from '@/lib/voice-swap'

const TARGET_SAMPLE_RATE = 16000
// Duree max d'un segment avant envoi force (ms) meme si la personne parle encore.
const MAX_SEGMENT_MS = 1200
// Duree de silence qui cloture un segment (ms).
const SILENCE_HANG_MS = 350
// Seuil d'energie RMS (0..1) au-dessus duquel on considere qu'il y a de la voix.
const VAD_RMS_THRESHOLD = 0.012
// Taille du buffer du ScriptProcessor (puissance de 2).
const PROCESSOR_BUFFER = 2048

export interface VoiceSwapEngineCallbacks {
  /** Appele quand une erreur runtime survient. */
  onError?: (message: string) => void
  /** Appele quand l'etat de capture change (true = capture active). */
  onCaptureChange?: (capturing: boolean) => void
  /** Appele quand le solde de minutes restant est connu (mode web). */
  onSecondsRemaining?: (seconds: number) => void
}

/**
 * Convertit un Float32 [-1,1] en PCM 16-bit signe little-endian.
 */
function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const out = new DataView(new ArrayBuffer(input.length * 2))
  for (let i = 0; i < input.length; i++) {
    let s = Math.max(-1, Math.min(1, input[i]))
    s = s < 0 ? s * 0x8000 : s * 0x7fff
    out.setInt16(i * 2, s, true)
  }
  return out.buffer
}

/**
 * Reechantillonne lineairement un Float32 d'une frequence source vers 16 kHz.
 */
function downsampleTo16k(input: Float32Array, inputRate: number): Float32Array {
  if (inputRate === TARGET_SAMPLE_RATE) return input
  const ratio = inputRate / TARGET_SAMPLE_RATE
  const newLen = Math.round(input.length / ratio)
  const result = new Float32Array(newLen)
  let pos = 0
  for (let i = 0; i < newLen; i++) {
    const idx = i * ratio
    const i0 = Math.floor(idx)
    const i1 = Math.min(i0 + 1, input.length - 1)
    const frac = idx - i0
    result[i] = input[i0] * (1 - frac) + input[i1] * frac
    pos = i1
  }
  void pos
  return result
}

/** Decode un PCM 16-bit LE (ArrayBuffer) en Float32 pour la lecture Web Audio. */
function pcm16ToFloat32(buffer: ArrayBuffer): Float32Array {
  const view = new DataView(buffer)
  const len = Math.floor(buffer.byteLength / 2)
  const out = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    out[i] = view.getInt16(i * 2, true) / 0x8000
  }
  return out
}

/**
 * Moteur audio temps reel. Une instance = une session de conversion.
 */
export class VoiceSwapEngine {
  private cb: VoiceSwapEngineCallbacks
  private inputDeviceId: string | null
  private outputDeviceId: string | null
  private outputIsVirtual: boolean
  /** Voix cible (utilisee par le mode web via la route API). */
  private voiceId: string | null
  /** true = pas d'API Electron : on convertit via les routes web. */
  private webMode: boolean

  private stream: MediaStream | null = null
  private ctx: AudioContext | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null

  // Accumulation du segment courant (Float32 a 16k).
  private segment: Float32Array[] = []
  private segmentSamples = 0
  private voiceActive = false
  private lastVoiceTs = 0
  private segmentStartTs = 0

  // Lecture : contexte de sortie + file de buffers convertis.
  private playCtx: AudioContext | null = null
  private playEl: HTMLAudioElement | null = null
  private playDest: MediaStreamAudioDestinationNode | null = null
  private playQueueTime = 0
  private bufferedMs = 0
  private underruns = 0

  private running = false
  private metricsTimer: ReturnType<typeof setInterval> | null = null

  constructor(opts: {
    inputDeviceId?: string | null
    outputDeviceId?: string | null
    outputIsVirtual?: boolean
    voiceId?: string | null
    callbacks?: VoiceSwapEngineCallbacks
  }) {
    this.inputDeviceId = opts.inputDeviceId ?? null
    this.outputDeviceId = opts.outputDeviceId ?? null
    this.outputIsVirtual = opts.outputIsVirtual ?? false
    this.voiceId = opts.voiceId ?? null
    this.cb = opts.callbacks ?? {}
    // Sans pont Electron, on bascule sur la conversion via routes web.
    this.webMode = getVoiceSwapAPI() === null
  }

  /** Demarre la capture, la segmentation et la lecture. */
  async start(): Promise<void> {
    if (this.running) return

    // 1. Capture micro (desactive les traitements navigateur pour un PCM propre).
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: this.inputDeviceId ? { exact: this.inputDeviceId } : undefined,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    })

    // 2. Graphe d'analyse/capture.
    this.ctx = new AudioContext()
    const inputRate = this.ctx.sampleRate
    this.source = this.ctx.createMediaStreamSource(this.stream)
    this.processor = this.ctx.createScriptProcessor(PROCESSOR_BUFFER, 1, 1)

    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)
      this.handleCaptureFrame(input, inputRate)
    }
    this.source.connect(this.processor)
    // Connexion a la destination (gain 0) pour que onaudioprocess soit appele.
    const sink = this.ctx.createGain()
    sink.gain.value = 0
    this.processor.connect(sink)
    sink.connect(this.ctx.destination)

    // 3. Chaine de lecture vers le peripherique de sortie (VB-Cable).
    await this.setupPlayback()

    this.running = true
    this.cb.onCaptureChange?.(true)
    this.startMetricsLoop()
    console.log(
      `[v0] VoiceSwap engine demarre - capture micro OK (inputRate=${inputRate}Hz, sortie=${this.outputDeviceId || 'defaut'}, virtuel=${this.outputIsVirtual})`,
    )
  }

  /** Construit la sortie audio routee vers outputDeviceId (setSinkId). */
  private async setupPlayback(): Promise<void> {
    this.playCtx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE })
    this.playDest = this.playCtx.createMediaStreamDestination()
    this.playEl = new Audio()
    this.playEl.srcObject = this.playDest.stream
    this.playEl.autoplay = true

    // Router vers le peripherique de sortie choisi (ex: "CABLE Input").
    const el = this.playEl as HTMLAudioElement & {
      setSinkId?: (id: string) => Promise<void>
    }
    if (this.outputDeviceId && typeof el.setSinkId === 'function') {
      try {
        await el.setSinkId(this.outputDeviceId)
      } catch (err) {
        this.cb.onError?.(
          `Impossible de router vers la sortie selectionnee: ${(err as Error).message}`,
        )
      }
    }
    await this.playEl.play().catch(() => {})
    this.playQueueTime = this.playCtx.currentTime
  }

  /**
   * Traite une frame capturee : downsample, VAD, accumulation puis envoi du
   * segment quand la personne fait une pause (ou apres MAX_SEGMENT_MS).
   */
  private handleCaptureFrame(input: Float32Array, inputRate: number) {
    const ds = downsampleTo16k(input, inputRate)

    // Energie RMS pour la detection d'activite vocale.
    let sum = 0
    for (let i = 0; i < ds.length; i++) sum += ds[i] * ds[i]
    const rms = Math.sqrt(sum / ds.length)
    const now = performance.now()

    if (rms >= VAD_RMS_THRESHOLD) {
      if (!this.voiceActive) {
        this.voiceActive = true
        this.segmentStartTs = now
      }
      this.lastVoiceTs = now
      this.segment.push(new Float32Array(ds))
      this.segmentSamples += ds.length
    } else if (this.voiceActive) {
      // Toujours en segment : on garde le silence court (queue de phrase).
      this.segment.push(new Float32Array(ds))
      this.segmentSamples += ds.length
    }

    const segMs = (this.segmentSamples / TARGET_SAMPLE_RATE) * 1000
    const silenceMs = now - this.lastVoiceTs
    const shouldFlush =
      this.voiceActive && (silenceMs >= SILENCE_HANG_MS || segMs >= MAX_SEGMENT_MS)

    if (shouldFlush) {
      this.flushSegment(now)
    }
  }

  /** Assemble le segment courant et lance sa conversion. */
  private flushSegment(now: number) {
    if (this.segmentSamples === 0) {
      this.voiceActive = false
      return
    }
    // Concatene les frames en un seul Float32.
    const merged = new Float32Array(this.segmentSamples)
    let off = 0
    for (const part of this.segment) {
      merged.set(part, off)
      off += part.length
    }
    const captureMs = Math.round(now - this.segmentStartTs)
    const pcm = floatTo16BitPCM(merged)

    const segMs = Math.round((merged.length / TARGET_SAMPLE_RATE) * 1000)
    console.log(`[v0] VoiceSwap segment capture: ${segMs}ms d'audio -> envoi a ElevenLabs`)

    // Reset du segment pour la suite.
    this.segment = []
    this.segmentSamples = 0
    this.voiceActive = false

    void this.convertAndPlay(pcm, captureMs)
  }

  /** Envoie le PCM au main (ElevenLabs) puis joue le resultat. */
  private async convertAndPlay(pcm: ArrayBuffer, captureMs: number) {
    if (this.webMode) {
      await this.convertAndPlayWeb(pcm, captureMs)
      return
    }
    const api = getVoiceSwapAPI()
    if (!api) return
    try {
      const result: ConvertResult = await api.convert({ pcm })
      if (!result.ok || !result.pcm) {
        console.log(`[v0] VoiceSwap conversion ECHEC: ${result.error || 'aucun audio renvoye'}`)
        if (result.error) this.cb.onError?.(result.error)
        return
      }
      const playbackMs = this.enqueuePlayback(result.pcm)
      console.log(
        `[v0] VoiceSwap voix convertie recue (RTT ElevenLabs=${result.rttMs ?? '?'}ms) -> lecture vers ${this.outputIsVirtual ? 'VB-Cable' : 'sortie'} (buffer=${playbackMs}ms)`,
      )
      this.reportMetrics({ captureMs, playbackMs })
    } catch (err) {
      this.cb.onError?.((err as Error).message)
    }
  }

  /** Conversion via la route web /api/voice-swap/convert (cle ElevenLabs cote serveur). */
  private async convertAndPlayWeb(pcm: ArrayBuffer, _captureMs: number) {
    if (!this.voiceId) {
      this.cb.onError?.('Aucune voix cible selectionnee.')
      return
    }
    try {
      const res = await fetch(`/api/voice-swap/convert?voiceId=${encodeURIComponent(this.voiceId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: pcm,
      })
      if (!res.ok) {
        if (res.status === 402) {
          this.cb.onSecondsRemaining?.(0)
          this.cb.onError?.('Minutes epuisees. Recharge une offre ChapVoice.')
          return
        }
        const data = await res.json().catch(() => ({}))
        this.cb.onError?.(data.error || `Conversion HTTP ${res.status}`)
        return
      }
      const remaining = res.headers.get('X-Seconds-Remaining')
      if (remaining !== null) this.cb.onSecondsRemaining?.(Number(remaining))
      const buf = await res.arrayBuffer()
      const playbackMs = this.enqueuePlayback(buf)
      console.log(
        `[v0] VoiceSwap (web) voix convertie -> lecture vers ${this.outputIsVirtual ? 'VB-Cable' : 'sortie'} (buffer=${playbackMs}ms)`,
      )
    } catch (err) {
      this.cb.onError?.((err as Error).message)
    }
  }

  /**
   * Place le PCM converti dans la file de lecture (ordonnancement sans recouvrement)
   * et renvoie la latence de lecture estimee (ms d'audio deja en file).
   */
  private enqueuePlayback(pcmBuf: ArrayBuffer): number {
    if (!this.playCtx || !this.playDest) return 0
    const float = pcm16ToFloat32(pcmBuf)
    const durationS = float.length / TARGET_SAMPLE_RATE

    const audioBuf = this.playCtx.createBuffer(1, float.length, TARGET_SAMPLE_RATE)
    audioBuf.getChannelData(0).set(float)
    const src = this.playCtx.createBufferSource()
    src.buffer = audioBuf
    src.connect(this.playDest)

    const nowT = this.playCtx.currentTime
    // Si la file est vide (retard pris), on repart de maintenant (underrun).
    if (this.playQueueTime < nowT) {
      if (this.playQueueTime > 0) this.underruns += 1
      this.playQueueTime = nowT
    }
    src.start(this.playQueueTime)
    this.playQueueTime += durationS

    this.bufferedMs = Math.max(0, Math.round((this.playQueueTime - nowT) * 1000))
    return this.bufferedMs
  }

  /** Boucle de remontee des metriques renderer vers le main process. */
  private startMetricsLoop() {
    const api = getVoiceSwapAPI()
    if (!api) return
    const virtualMicSelected = this.isOutputVirtual()
    this.metricsTimer = setInterval(() => {
      this.reportMetrics({
        buffer: { bufferedMs: this.bufferedMs, underruns: this.underruns },
        virtualMicSelected,
      })
    }, 1000)
  }

  private reportMetrics(m: RendererMetrics) {
    getVoiceSwapAPI()?.reportMetrics?.(m)
  }

  /** Heuristique : la sortie choisie ressemble-t-elle a VB-Cable ? */
  private isOutputVirtual(): boolean {
    return this.outputIsVirtual
  }

  /** Arrete tout, libere micro/contextes/timers. */
  async stop(): Promise<void> {
    this.running = false
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer)
      this.metricsTimer = null
    }
    if (this.processor) {
      this.processor.onaudioprocess = null
      this.processor.disconnect()
      this.processor = null
    }
    if (this.source) {
      this.source.disconnect()
      this.source = null
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
    if (this.ctx) {
      await this.ctx.close().catch(() => {})
      this.ctx = null
    }
    if (this.playEl) {
      this.playEl.pause()
      this.playEl.srcObject = null
      this.playEl = null
    }
    if (this.playCtx) {
      await this.playCtx.close().catch(() => {})
      this.playCtx = null
    }
    this.segment = []
    this.segmentSamples = 0
    this.cb.onCaptureChange?.(false)
  }
}
