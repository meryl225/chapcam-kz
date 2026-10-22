// Selection de la camera SOURCE (webcam physique) pour tous les flux ChapCam.
//
// Regle absolue : "ChapCam Camera" (la camera virtuelle) ne sert qu'a diffuser
// le resultat du Live Swap. Elle ne doit jamais etre lue comme entree, sinon
// ChapCam se filme lui-meme (ecran noir ou boucle). Les autres cameras
// virtuelles (OBS, ManyCam...) et les capteurs infrarouges Windows Hello sont
// aussi ecartes de la selection automatique.

export interface CameraDevice {
  deviceId: string
  label: string
  isVirtual: boolean
  isChapCam: boolean
  isInfrared: boolean
}

const STORAGE_KEY = 'chapcam.camera.sourceDeviceId'
export const CAMERA_CHANGED_EVENT = 'chapcam:camera-changed'

const CHAPCAM_PATTERN = /chapcam/i
const VIRTUAL_PATTERN =
  /virtual|obs|manycam|xsplit|snap camera|splitcam|droidcam|ndi|camo|mmhmm|nvidia broadcast|e2esoft|vcam|youcam|unity video capture|screen capture/i
const INFRARED_PATTERN = /\bir\b|infrared|infrarouge|depth|windows hello/i
const PHYSICAL_HINT_PATTERN = /hd|webcam|camera|cam[eé]ra|integrated|int[eé]gr[eé]e|usb|facetime|logitech|hp|lenovo|dell|asus|acer|realtek|chicony|azurewave|sunplus/i

function describe(info: MediaDeviceInfo): CameraDevice {
  const label = info.label || ''
  const isChapCam = CHAPCAM_PATTERN.test(label)
  return {
    deviceId: info.deviceId,
    label,
    isChapCam,
    isVirtual: isChapCam || VIRTUAL_PATTERN.test(label),
    isInfrared: INFRARED_PATTERN.test(label),
  }
}

export function isUsableSource(cam: CameraDevice | undefined | null): boolean {
  return !!cam && !cam.isChapCam
}

function isAutoCandidate(cam: CameraDevice): boolean {
  return !cam.isVirtual && !cam.isInfrared
}

export class CameraSourceError extends Error {
  code: 'denied' | 'not-found' | 'busy' | 'only-virtual' | 'overconstrained' | 'unsupported' | 'unknown'
  constructor(code: CameraSourceError['code'], message: string) {
    super(message)
    this.name = 'CameraSourceError'
    this.code = code
  }
}

export function cameraErrorMessage(err: unknown): string {
  if (err instanceof CameraSourceError) return err.message
  const e = err as { name?: string; message?: string }
  switch (e?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return "Accès à la caméra refusé. Autorise ChapCam dans Paramètres Windows > Confidentialité > Caméra, puis réessaie."
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Aucune webcam détectée. Branche une webcam ou choisis-en une autre dans Paramètres > Caméra.'
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'Cette caméra est déjà utilisée par une autre application (Zoom, Teams, navigateur...). Ferme-la ou choisis une autre caméra dans Paramètres > Caméra.'
    case 'OverconstrainedError':
      return "La caméra choisie n'est plus disponible. Choisis une autre caméra dans Paramètres > Caméra."
    default:
      return `Impossible de démarrer la caméra${e?.message ? ` : ${e.message}` : ''}. Choisis une autre caméra dans Paramètres > Caméra.`
  }
}

export function getSavedCameraId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function saveCameraId(deviceId: string | null) {
  try {
    if (deviceId) window.localStorage.setItem(STORAGE_KEY, deviceId)
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {}
  window.dispatchEvent(new CustomEvent(CAMERA_CHANGED_EVENT, { detail: deviceId }))
}

function hasMediaDevices() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

async function enumerate(): Promise<CameraDevice[]> {
  const all = await navigator.mediaDevices.enumerateDevices()
  return all.filter(d => d.kind === 'videoinput' && d.deviceId).map(describe)
}

/**
 * Liste les cameras. Sans autorisation prealable, le navigateur cache les noms :
 * avec `unlockLabels`, on ouvre brievement une camera pour les obtenir.
 */
export async function listCameras(unlockLabels = false): Promise<CameraDevice[]> {
  if (!hasMediaDevices()) return []
  let cams = await enumerate()
  if (unlockLabels && cams.length > 0 && cams.every(c => !c.label)) {
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      tmp.getTracks().forEach(t => t.stop())
      cams = await enumerate()
    } catch {}
  }
  return cams
}

/** Webcam physique couleur choisie automatiquement (ex. "HP HD Camera"). */
export function pickAutoCamera(cams: CameraDevice[]): CameraDevice | null {
  const candidates = cams.filter(isAutoCandidate)
  if (candidates.length === 0) return cams.find(c => !c.isChapCam && !c.isInfrared) ?? null
  return candidates.find(c => PHYSICAL_HINT_PATTERN.test(c.label)) ?? candidates[0]
}

/** Camera qui sera reellement utilisee : choix memorise si valide, sinon auto. */
export function resolveSourceCamera(cams: CameraDevice[]): CameraDevice | null {
  const saved = getSavedCameraId()
  const savedCam = saved ? cams.find(c => c.deviceId === saved) : undefined
  if (isUsableSource(savedCam)) return savedCam!
  return pickAutoCamera(cams)
}

export interface SourceCameraOptions {
  width?: number
  height?: number
  frameRate?: number
  audio?: boolean | MediaTrackConstraints
  /** Force une camera precise (bouton "Tester" des parametres). */
  deviceId?: string
}

function buildVideo(opts: SourceCameraOptions, deviceId?: string): MediaTrackConstraints {
  const video: MediaTrackConstraints = {}
  if (opts.width) video.width = { ideal: opts.width }
  if (opts.height) video.height = { ideal: opts.height }
  if (opts.frameRate) video.frameRate = { ideal: opts.frameRate }
  if (deviceId) video.deviceId = { exact: deviceId }
  return video
}

function trackLabel(stream: MediaStream): string {
  return stream.getVideoTracks()[0]?.label ?? ''
}

/**
 * Ouvre la webcam physique. Ordre : camera demandee/memorisee, puis la
 * meilleure webcam physique, puis les autres. Jamais ChapCam Camera.
 */
export async function openSourceCamera(opts: SourceCameraOptions = {}): Promise<MediaStream> {
  if (!hasMediaDevices()) {
    throw new CameraSourceError('unsupported', "Ce navigateur ne permet pas d'accéder à la caméra. Utilise l'application ChapCam ou Chrome/Edge à jour.")
  }

  const cams = await listCameras(true)
  if (cams.length === 0) {
    throw new CameraSourceError('not-found', 'Aucune webcam détectée. Branche une webcam puis réessaie.')
  }
  if (cams.every(c => c.label) && !cams.some(c => !c.isChapCam)) {
    throw new CameraSourceError('only-virtual', 'Seule la caméra virtuelle ChapCam Camera est détectée. Branche ou active ta webcam physique : ChapCam Camera sert uniquement à diffuser le résultat.')
  }

  const ordered: CameraDevice[] = []
  const push = (c: CameraDevice | null | undefined) => {
    if (c && isUsableSource(c) && !ordered.some(o => o.deviceId === c.deviceId)) ordered.push(c)
  }
  if (opts.deviceId) push(cams.find(c => c.deviceId === opts.deviceId))
  else push(resolveSourceCamera(cams))
  cams.filter(isAutoCandidate).forEach(push)
  cams.forEach(c => { if (!c.isInfrared) push(c) })
  cams.forEach(push)

  let lastError: unknown = null
  for (const cam of ordered) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: buildVideo(opts, cam.deviceId),
        audio: opts.audio ?? false,
      })
      if (CHAPCAM_PATTERN.test(trackLabel(stream))) {
        stream.getTracks().forEach(t => t.stop())
        continue
      }
      return stream
    } catch (err) {
      lastError = err
      const name = (err as { name?: string })?.name
      // Acces refuse : inutile d'essayer les autres cameras.
      if (name === 'NotAllowedError' || name === 'SecurityError') break
      // Une camera precise a ete demandee : on remonte son erreur telle quelle.
      if (opts.deviceId) break
    }
  }

  // Les noms etaient peut-etre caches : derniere tentative sans deviceId,
  // en refusant explicitement ChapCam Camera si c'est elle qui repond.
  if (ordered.length === 0) {
    const stream = await navigator.mediaDevices.getUserMedia({ video: buildVideo(opts), audio: opts.audio ?? false })
    if (!CHAPCAM_PATTERN.test(trackLabel(stream))) return stream
    stream.getTracks().forEach(t => t.stop())
    throw new CameraSourceError('only-virtual', 'ChapCam Camera ne peut pas être utilisée comme source. Choisis ta webcam physique dans Paramètres > Caméra.')
  }

  throw new CameraSourceError('unknown', cameraErrorMessage(lastError))
}
