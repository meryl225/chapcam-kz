'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw, RotateCcw, Play, Square } from 'lucide-react'
import {
  type CameraDevice,
  cameraErrorMessage,
  getSavedCameraId,
  listCameras,
  openSourceCamera,
  pickAutoCamera,
  resolveSourceCamera,
  saveCameraId,
} from '@/lib/camera-devices'

function cameraName(cam: CameraDevice, index: number) {
  const base = cam.label || `Caméra ${index + 1}`
  if (cam.isChapCam) return `${base} (sortie uniquement)`
  if (cam.isInfrared) return `${base} (infrarouge)`
  if (cam.isVirtual) return `${base} (virtuelle)`
  return base
}

export function CameraSettings() {
  const [cams, setCams] = useState<CameraDevice[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testOk, setTestOk] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopTest = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setTesting(false)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await listCameras(true)
      setCams(list)
      const current = resolveSourceCamera(list)
      setSelectedId(current?.deviceId ?? '')
      if (list.length === 0) setError('Aucune webcam détectée. Branche une webcam puis clique sur Actualiser.')
    } catch (err) {
      setError(cameraErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (window.location.hash === '#camera') {
      document.getElementById('camera')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  useEffect(() => {
    void refresh()
    const onChange = () => void refresh()
    navigator.mediaDevices?.addEventListener?.('devicechange', onChange)
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', onChange)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [refresh])

  const startTest = async (deviceId = selectedId) => {
    stopTest()
    setError('')
    setTestOk(false)
    setTesting(true)
    try {
      const stream = await openSourceCamera({ deviceId: deviceId || undefined, width: 1280, height: 720 })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setTestOk(true)
    } catch (err) {
      setTesting(false)
      setError(cameraErrorMessage(err))
    }
  }

  const onSelect = (deviceId: string) => {
    setSelectedId(deviceId)
    setInfo('')
    saveCameraId(deviceId)
    setInfo('Caméra enregistrée. Elle sera utilisée pour le Live Swap.')
    if (testing) void startTest(deviceId)
  }

  const onReset = async () => {
    stopTest()
    saveCameraId(null)
    setError('')
    const list = await listCameras(true)
    setCams(list)
    const auto = pickAutoCamera(list)
    setSelectedId(auto?.deviceId ?? '')
    setInfo(auto ? `Caméra réinitialisée : ${auto.label || 'webcam par défaut'} sélectionnée automatiquement.` : '')
    if (auto) void startTest(auto.deviceId)
    else setError('Aucune webcam physique détectée.')
  }

  const saved = typeof window !== 'undefined' ? getSavedCameraId() : null
  const selected = cams.find(c => c.deviceId === selectedId)

  return (
    <section id="camera" className="scroll-mt-6 rounded-3xl border border-hairline bg-card p-5 sm:p-8">
      <h2 className="mb-6 flex items-center gap-3 text-xl font-bold text-foreground">
        <Camera className="h-6 w-6 text-primary" />
        Caméra
      </h2>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="camera-source" className="text-foreground">
            Caméra source
          </label>
          <p className="text-sm leading-relaxed text-muted-foreground">
            ChapCam utilise ta webcam physique. ChapCam Camera sert uniquement à diffuser le résultat du Live Swap
            et ne peut pas être choisie comme source.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              id="camera-source"
              value={selectedId}
              disabled={loading || cams.length === 0}
              onChange={e => onSelect(e.target.value)}
              className="min-h-11 flex-1 rounded-2xl border border-hairline-strong bg-background px-4 text-foreground disabled:opacity-50"
            >
              {cams.length === 0 && <option value="">{loading ? 'Recherche des caméras…' : 'Aucune caméra'}</option>}
              {cams.map((cam, i) => (
                <option key={cam.deviceId} value={cam.deviceId} disabled={cam.isChapCam}>
                  {cameraName(cam, i)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-hairline-strong px-4 text-sm text-foreground transition-all hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {selected
              ? saved === selected.deviceId
                ? 'Choix enregistré sur cet ordinateur.'
                : 'Sélection automatique de la webcam physique.'
              : ''}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-hairline bg-muted">
          <video
            ref={videoRef}
            muted
            playsInline
            className={`aspect-video w-full -scale-x-100 object-cover ${testing ? '' : 'hidden'}`}
            aria-label="Aperçu de la caméra"
          />
          {!testing && (
            <div className="flex aspect-video w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Clique sur « Tester la caméra » pour vérifier l&apos;image.
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {!error && testOk && testing && (
          <p className="text-sm text-foreground" role="status">
            La caméra fonctionne.
          </p>
        )}
        {!error && info && !testOk && (
          <p className="text-sm text-muted-foreground" role="status">
            {info}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => (testing ? stopTest() : void startTest())}
            disabled={loading || cams.length === 0}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-hairline-strong py-3 text-foreground transition-all hover:bg-muted disabled:opacity-50"
          >
            {testing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {testing ? 'Arrêter le test' : 'Tester la caméra'}
          </button>
          <button
            type="button"
            onClick={() => void onReset()}
            disabled={loading}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-hairline-strong py-3 text-foreground transition-all hover:bg-muted disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Réinitialiser la caméra
          </button>
        </div>
      </div>
    </section>
  )
}
