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
  /** Materiel reel confirme (identifiant USB dans le nom ou peripherique Windows PnP). */
  isPhysical: boolean
}

const STORAGE_KEY = 'chapcam.camera.sourceDeviceId'
export const CAMERA_CHANGED_EVENT = 'chapcam:camera-changed'

const CHAPCAM_PATTERN = /chapcam/i
const VIRTUAL_PATTERN =
  /virtual|\bobs\b|manycam|xsplit|snap camera|splitcam|droidcam|\bndi\b|\bcamo\b|mmhmm|nvidia broadcast|e2esoft|\bvcam\b|youcam|unity video capture|screen capture|iriun|epoccam|ivcam|camtwist|vmix|streamlabs|elgato virtual|webcamoid|avatarify/i
const INFRARED_PATTERN = /\bir\b|infrared|infrarouge|depth|windows hello/i
// Chromium ajoute "(vid:pid)" au nom des webcams USB/integrees : ex. "HP HD Camera (04f2:b6ab)".
// Les cameras virtuelles (pilotes logiciels) n'ont jamais cet identifiant materiel.
const USB_ID_PATTERN = /\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i
const PHYSICAL_HINT_PATTERN = /\bhd\b|webcam|camera|cam[eé]ra|integrated|int[eé]gr[eé]e|\busb\b|facetime|logitech|\bhp\b|lenovo|dell|asus|acer|realtek|chicony|azurewave|sunplus|microdia|quanta|bison|syntek|razer|creative/i

/** Noms des cameras materielles connues de Windows (API Electron, absente sur le web). */
let nativePhysicalNames: string[] | null = null

async function loadNativePhysicalNames(): Promise<string[]> {
  if (nativePhysicalNames) return nativePhysicalNames
  const api = (window as unknown as { electronAPI?: { listPhysicalCameras?: () => Promise<string[]> } }).electronAPI
  try {
    nativePhysicalNames = api?.listPhysicalCameras ? ((await api.listPhysicalCameras()) ?? []) : []
  } catch {
    nativePhysicalNames = []
  }
  return nativePhysicalNames
}

const normalize = (s: string) => s.replace(USB_ID_PATTERN, '').trim().toLowerCase()

function describe(info: MediaDeviceInfo, native: string[]): CameraDevice {
  const label = info.label || ''
  const isChapCam = CHAPCAM_PATTERN.test(label)
  const isInfrared = INFRARED_PATTERN.test(label)
  const name = normalize(label)
  const inNative = !!name && native.some(n => n && (name === n || name.startsWith(n) || n.startsWith(name)))
  const hasUsbId = USB_ID_PATTERN.test(label)
  // Sur Windows, une camera absente de la liste materielle est un pilote logiciel.
  const notInHardwareList = native.length > 0 && !!label && !inNative && !hasUsbId
  return {
    deviceId: info.deviceId,
    label,
    isChapCam,
    isInfrared,
    isPhysical: !isChapCam && !isInfrared && (hasUsbId || inNative),
    isVirtual: isChapCam || VIRTUAL_PATTERN.test(label) || notInHardwareList,
  }
}

export function isUsableSource(cam: CameraDevice | undefined | null): boolean {
  return !!cam && !cam.isChapCam
}

/** La selection automatique ne prend QUE des webcams physiques couleur. */
function isAutoCandidate(cam: CameraDevice): boolean {
  return !cam.isVirtual && !cam.isInfrared
}

const FRONT_PATTERN = /front|avant|frontale|facetime|user|selfie/i

function autoRank(cam: CameraDevice): number {
  const tier = cam.isPhysical ? 0 : PHYSICAL_HINT_PATTERN.test(cam.label) ? 1 : 2
  // Sur telephone, la camera frontale passe avant la camera arriere.
  return tier * 2 + (FRONT_PATTERN.test(cam.label) ? 0 : 1)
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
      return "Accès à la caméra refusé. Autorise la caméra pour ChapCam (réglages du navigateur, ou Paramètres Windows > Confidentialité > Caméra), puis réessaie."
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
  const [all, native] = await Promise.all([navigator.mediaDevices.enumerateDevices(), loadNativePhysicalNames()])
  return all.filter(d => d.kind === 'videoinput' && d.deviceId).map(d => describe(d, native))
}

/**
 * Liste les cameras. Sans autorisation prealable, le navigateur cache les noms :
 * avec `unlockLabels`, on ouvre brievement une camera pour les obtenir.
 */
let lastUnlockError: unknown = null

export async function listCameras(unlockLabels = false): Promise<CameraDevice[]> {
  if (!hasMediaDevices()) return []
  lastUnlockError = null
  let cams = await enumerate()
  // Safari iOS renvoie des cameras sans deviceId ni nom avant autorisation :
  // la liste parait vide, il faut donc demander l'acces pour la remplir.
  if (unlockLabels && (cams.length === 0 || cams.every(c => !c.label))) {
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      tmp.getTracks().forEach(t => t.stop())
      cams = await enumerate()
    } catch (err) {
      lastUnlockError = err
    }
  }
  return cams
}

/** Webcam physique couleur choisie automatiquement (ex. "HP HD Camera"). */
export function pickAutoCamera(cams: CameraDevice[]): CameraDevice | null {
  const candidates = cams.filter(isAutoCandidate)
  if (candidates.length === 0) return null
  return [...candidates].sort((a, b) => autoRank(a) - autoRank(b))[0]
}

/**
 * Camera qui sera reellement utilisee : choix manuel memorise (jamais ChapCam
 * Camera), sinon la webcam physique automatique.
 */
export function resolveSourceCamera(cams: CameraDevice[]): CameraDevice | null {
  const saved = getSavedCameraId()
  const savedCam = saved ? cams.find(c => c.deviceId === saved) : undefined
  if (isUsableSource(savedCam)) return savedCam!
  return pickAutoCamera(cams)
}

function isTrackRejected(stream: MediaStream, manual: boolean): boolean {
  const label = trackLabel(stream)
  if (CHAPCAM_PATTERN.test(label)) return true
  // En automatique, on refuse aussi toute camera virtuelle qui aurait repondu.
  return !manual && VIRTUAL_PATTERN.test(label)
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
  else video.facingMode = 'user'
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
    const name = (lastUnlockError as { name?: string } | null)?.name
    if (lastUnlockError && name !== 'NotFoundError' && name !== 'DevicesNotFoundError') {
      throw new CameraSourceError(
        name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unknown',
        cameraErrorMessage(lastUnlockError),
      )
    }
    throw new CameraSourceError('not-found', 'Aucune webcam détectée. Branche une webcam puis réessaie.')
  }
  if (cams.every(c => c.label) && !cams.some(c => !c.isChapCam)) {
    throw new CameraSourceError('only-virtual', 'Seule la caméra virtuelle ChapCam Camera est détectée. Branche ou active ta webcam physique : ChapCam Camera sert uniquement à diffuser le résultat.')
  }

  const labelsKnown = cams.every(c => c.label)
  if (labelsKnown && !opts.deviceId && !getSavedCameraId() && !cams.some(isAutoCandidate)) {
    throw new CameraSourceError('only-virtual', "Aucune webcam physique détectée : seules des caméras virtuelles ou infrarouges sont présentes. Branche ou active la webcam de l'ordinateur, ou choisis une caméra dans Paramètres > Caméra.")
  }

  const savedId = getSavedCameraId()
  const manualIds = new Set<string>()
  if (opts.deviceId) manualIds.add(opts.deviceId)
  else if (savedId) manualIds.add(savedId)

  const ordered: CameraDevice[] = []
  const push = (c: CameraDevice | null | undefined) => {
    if (c && isUsableSource(c) && !ordered.some(o => o.deviceId === c.deviceId)) ordered.push(c)
  }
  if (opts.deviceId) push(cams.find(c => c.deviceId === opts.deviceId))
  else push(resolveSourceCamera(cams))
  // Repli automatique : uniquement les webcams physiques couleur, les plus sures d'abord.
  if (!opts.deviceId) [...cams].filter(isAutoCandidate).sort((a, b) => autoRank(a) - autoRank(b)).forEach(push)

  let lastError: unknown = null
  for (const cam of ordered) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: buildVideo(opts, cam.deviceId),
        audio: opts.audio ?? false,
      })
      if (isTrackRejected(stream, manualIds.has(cam.deviceId))) {
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
    if (!isTrackRejected(stream, false)) return stream
    stream.getTracks().forEach(t => t.stop())
    throw new CameraSourceError('only-virtual', 'ChapCam Camera ne peut pas être utilisée comme source. Choisis ta webcam physique dans Paramètres > Caméra.')
  }

  throw new CameraSourceError('unknown', cameraErrorMessage(lastError))
}
