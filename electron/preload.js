const { contextBridge, ipcRenderer } = require('electron')

// ============================================================
// ChapCam Desktop - Preload
//
// Deux roles :
//   1. Exposer une API sure (electronAPI) a la page web (contextBridge).
//   2. Faire tourner le MOTEUR DE CAPTURE de la sortie transformee :
//      on lit en continu le <canvas>/<video> tagge [data-chapcam-output],
//      on le redessine a la resolution cible, puis on envoie chaque frame
//      (RGBA brut) au process principal -> camera virtuelle "ChapCam Camera".
//
// La capture lit les VRAIS pixels (pas la transformation CSS -scale-x-100),
// donc la camera virtuelle n'est PAS miroir cote interlocuteurs.
// ============================================================

// ---- Etat du moteur de capture (vit dans le contexte isole du preload) ----
const capture = {
  running: false,
  rafId: null,
  width: 1280,
  height: 720,
  fps: 30,
  lastSentAt: 0,
  scratch: null, // canvas hors-ecran reutilise
  ctx: null,
  missWarned: false,
}

function ensureScratch(w, h) {
  if (!capture.scratch) {
    capture.scratch = document.createElement('canvas')
    capture.ctx = capture.scratch.getContext('2d', { willReadFrequently: true })
  }
  if (capture.scratch.width !== w || capture.scratch.height !== h) {
    capture.scratch.width = w
    capture.scratch.height = h
  }
}

// Trouve la source a diffuser : priorite au tag explicite, sinon plus grand
// canvas/video visible de la page.
function findSource() {
  const tagged = document.querySelector('[data-chapcam-output]')
  if (tagged && isUsable(tagged)) return tagged

  let best = null
  let bestArea = 0
  const candidates = [
    ...document.querySelectorAll('canvas'),
    ...document.querySelectorAll('video'),
  ]
  for (const el of candidates) {
    if (!isUsable(el)) continue
    const w = el.videoWidth || el.width || el.clientWidth || 0
    const h = el.videoHeight || el.height || el.clientHeight || 0
    const area = w * h
    if (area > bestArea) {
      bestArea = area
      best = el
    }
  }
  return best
}

function isUsable(el) {
  if (!el) return false
  if (el.tagName === 'VIDEO') {
    return el.readyState >= 2 && el.videoWidth > 0 && el.videoHeight > 0
  }
  if (el.tagName === 'CANVAS') {
    return el.width > 0 && el.height > 0
  }
  return false
}

function srcDims(el) {
  if (el.tagName === 'VIDEO') return { w: el.videoWidth, h: el.videoHeight }
  return { w: el.width, h: el.height }
}

// Dessine la source dans le scratch en "contain" (letterbox) pour garder
// le ratio sans deformer le visage, fond noir autour.
function drawContain(ctx, el, sw, sh, dw, dh) {
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, dw, dh)
  const scale = Math.min(dw / sw, dh / sh)
  const w = Math.round(sw * scale)
  const h = Math.round(sh * scale)
  const x = Math.round((dw - w) / 2)
  const y = Math.round((dh - h) / 2)
  ctx.drawImage(el, x, y, w, h)
}

function tick() {
  if (!capture.running) return

  const now = performance.now()
  const minInterval = 1000 / capture.fps
  if (now - capture.lastSentAt >= minInterval) {
    const src = findSource()
    if (src) {
      capture.missWarned = false
      const { w: sw, h: sh } = srcDims(src)
      if (sw > 0 && sh > 0) {
        ensureScratch(capture.width, capture.height)
        try {
          drawContain(capture.ctx, src, sw, sh, capture.width, capture.height)
          const img = capture.ctx.getImageData(0, 0, capture.width, capture.height)
          // Buffer transferable -> evite une copie supplementaire
          ipcRenderer.send('vcam:frame', {
            width: capture.width,
            height: capture.height,
            buffer: img.data.buffer,
          })
          capture.lastSentAt = now
        } catch (e) {
          // getImageData peut lever si la source est "tainted" (cross-origin).
          // Le flux ChapCam est same-origin/WebRTC donc OK ; on log une fois.
          if (!capture.missWarned) {
            console.warn('[ChapCam][capture] frame illisible:', e.message)
            capture.missWarned = true
          }
        }
      }
    } else if (!capture.missWarned) {
      console.warn('[ChapCam][capture] aucune source video transformee trouvee')
      capture.missWarned = true
    }
  }

  capture.rafId = requestAnimationFrame(tick)
}

function startCapture(opts = {}) {
  capture.width = opts.width || 1280
  capture.height = opts.height || 720
  capture.fps = opts.fps || 30
  if (capture.running) return
  capture.running = true
  capture.lastSentAt = 0
  capture.missWarned = false
  console.log(`[ChapCam][capture] demarree ${capture.width}x${capture.height}@${capture.fps}`)
  capture.rafId = requestAnimationFrame(tick)
}

function stopCapture() {
  capture.running = false
  if (capture.rafId) cancelAnimationFrame(capture.rafId)
  capture.rafId = null
  console.log('[ChapCam][capture] arretee')
}

// Pilotage depuis le process principal (menu / tray / UI)
ipcRenderer.on('vcam:start', (_e, opts) => startCapture(opts))
ipcRenderer.on('vcam:stop', () => stopCapture())

// ============================================================
// API exposee a la page web
// ============================================================
contextBridge.exposeInMainWorld('electronAPI', {
  // Camera access
  getCameraAccess: () => ipcRenderer.invoke('get-camera-access'),
  requestCameraAccess: () => ipcRenderer.invoke('request-camera-access'),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // Camera virtuelle : controle direct depuis l'UI web
  virtualCamera: {
    start: (opts) => ipcRenderer.invoke('virtual-camera-start', opts),
    stop: () => ipcRenderer.invoke('virtual-camera-stop'),
    status: () => ipcRenderer.invoke('virtual-camera-status'),
  },

  // Evenement : le main demande d'activer/desactiver la camera virtuelle
  onVirtualCameraToggle: (callback) => {
    ipcRenderer.on('virtual-camera-toggle', (_event, enabled) => callback(enabled))
  },

  // Etat de la camera virtuelle pousse par le main (pour l'UI)
  onVirtualCameraState: (callback) => {
    ipcRenderer.on('virtual-camera-state', (_event, state) => callback(state))
  },

  // Voice Swap : conversion de voix temps reel (architecture/scaffolding).
  // Meme pattern que virtualCamera. Le streaming reel n'est pas encore branche.
  voiceSwap: {
    status: () => ipcRenderer.invoke('voice-swap-status'),
    listDevices: () => ipcRenderer.invoke('voice-swap-list-devices'),
    listVoices: () => ipcRenderer.invoke('voice-swap-list-voices'),
    start: (config) => ipcRenderer.invoke('voice-swap-start', config),
    stop: () => ipcRenderer.invoke('voice-swap-stop'),
    updateSettings: (settings) => ipcRenderer.invoke('voice-swap-update-settings', settings),
    // Etat pousse par le main process (latence, sante connexion, buffering).
    onState: (callback) => {
      ipcRenderer.on('voice-swap-state', (_event, state) => callback(state))
    },
    // Conversion d'un segment audio : envoie le PCM capture, recoit le PCM
    // converti par ElevenLabs (aller-retour reel).
    convert: (payload) => ipcRenderer.invoke('voice-swap-convert', payload),
    // Remonte les metriques mesurees cote renderer (capture/playback/buffer).
    reportMetrics: (metrics) => ipcRenderer.send('voice-swap-metrics', metrics),
  },

  // Navigation events
  onOpenPreferences: (callback) => {
    ipcRenderer.on('open-preferences', () => callback())
  },
  onOpenCameraSettings: (callback) => {
    ipcRenderer.on('open-camera-settings', () => callback())
  },

  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),

  // Platform detection
  isElectron: true,
  platform: process.platform,
})

console.log('[ChapCam] Preload script initialized')
