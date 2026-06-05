'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  UserRound,
  Camera,
  Play,
  Eye,
  Power,
  Radio,
  Upload,
  Cpu,
  Sparkles,
  Circle,
} from 'lucide-react'

type Status = 'loading' | 'ready' | 'running'

const STATUS_LABEL: Record<Status, string> = {
  loading: 'Chargement du modele InSwapper...',
  ready: 'Pret',
  running: 'En cours...',
}

const INITIAL_LOGS = [
  'ChapCam PC 2.0 — Subscribers Edition',
  'Detection du materiel...',
  'GPU detecte : NVIDIA GeForce RTX 4060 Laptop GPU',
  'CUDA 13.0 · PyTorch 2.10 · execution provider = CUDAExecutionProvider',
  'Modeles charges depuis ./models',
]

export function DesktopStudio() {
  const [status, setStatus] = useState<Status>('loading')
  const [faceUrl, setFaceUrl] = useState<string | null>(null)
  const [faceName, setFaceName] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const [previewOn, setPreviewOn] = useState(false)
  const [logs, setLogs] = useState<string[]>(INITIAL_LOGS)
  const [fps, setFps] = useState(0)

  const [toggles, setToggles] = useState({
    faceEnhancer: true,
    showFps: true,
    manyFaces: false,
    poissonBlend: true,
  })
  const [sharpness, setSharpness] = useState(60)
  const [mouthMask, setMouthMask] = useState(35)
  const [model] = useState('inswapper_128')
  const [camera, setCamera] = useState('Integrated Camera')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const pushLog = useCallback((line: string) => {
    const t = new Date().toLocaleTimeString('fr-FR', { hour12: false })
    setLogs((prev) => [...prev.slice(-40), `[${t}] ${line}`])
  }, [])

  // Simulation du chargement initial du modele.
  useEffect(() => {
    const id = setTimeout(() => {
      setStatus('ready')
      pushLog('InSwapper pret. En attente d\'un visage de reference.')
    }, 1800)
    return () => clearTimeout(id)
  }, [pushLog])

  // Compteur FPS factice quand le swap tourne.
  useEffect(() => {
    if (status !== 'running') {
      setFps(0)
      return
    }
    const id = setInterval(() => setFps(26 + Math.floor(Math.random() * 8)), 700)
    return () => clearInterval(id)
  }, [status])

  // Auto-scroll du terminal.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setPreviewOn(true)
      pushLog('Flux camera ouvert.')
      return true
    } catch {
      setPreviewOn(true) // on bascule sur le placeholder anime
      pushLog('Camera indisponible — apercu de demonstration affiche.')
      return false
    }
  }, [pushLog])

  useEffect(() => () => stopStream(), [stopStream])

  const onSelectFace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFaceUrl(URL.createObjectURL(file))
    setFaceName(file.name)
    pushLog(`Visage de reference charge : ${file.name}`)
  }

  const handleStart = async () => {
    if (!faceUrl) {
      pushLog('Selectionnez d\'abord un visage de reference.')
      return
    }
    await startCamera()
    setStatus('running')
    pushLog('Face swap demarre.')
  }

  const handlePreview = async () => {
    await startCamera()
    pushLog('Apercu active.')
  }

  const handleDestroy = () => {
    stopStream()
    setPreviewOn(false)
    setLive(false)
    setStatus('ready')
    pushLog('Session arretee. Ressources liberees.')
  }

  const toggleLive = () => {
    setLive((v) => {
      const next = !v
      pushLog(next ? 'Camera virtuelle ChapCam ACTIVEE (visible dans WhatsApp, Zoom...).' : 'Camera virtuelle desactivee.')
      return next
    })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200">
      {/* Barre de titre facon fenetre logicielle */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0d0d0d] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#00ff88]/15">
            <Sparkles className="h-4 w-4 text-[#00ff88]" />
          </div>
          <span className="text-sm font-semibold text-white">ChapCam PC</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-400">
            2.0 — Subscribers Edition
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-yellow-500/70" aria-hidden />
          <span className="h-3 w-3 rounded-full bg-white/20" aria-hidden />
          <span className="h-3 w-3 rounded-full bg-red-500/70" aria-hidden />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
        {/* Zone principale : reference / controles / apercu */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(220px,260px)_1fr]">
          {/* Visage de reference */}
          <Panel title="Visage de reference" icon={UserRound}>
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black">
              {faceUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={faceUrl || "/placeholder.svg"} alt="Visage de reference selectionne" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-600">
                  <UserRound className="h-12 w-12" />
                  <span className="text-xs">Aucun visage selectionne</span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onSelectFace} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#00ff88] px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#00dd77]"
            >
              <Upload className="h-4 w-4" />
              Selectionner un visage
            </button>
            {faceName && <p className="mt-2 truncate text-center text-xs text-gray-500">{faceName}</p>}
          </Panel>

          {/* Controles centraux */}
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-white/10 bg-[#111] p-4">
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleStart}
                  disabled={status === 'loading'}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00ff88] px-4 py-3 text-sm font-bold text-black transition-colors hover:bg-[#00dd77] disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  Start
                </button>
                <button
                  onClick={handlePreview}
                  disabled={status === 'loading'}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-200 transition-colors hover:border-white/30 disabled:opacity-50"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </button>
                <button
                  onClick={handleDestroy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20"
                >
                  <Power className="h-4 w-4" />
                  Destroy
                </button>
              </div>
            </div>

            {/* Camera + Live */}
            <div className="rounded-xl border border-white/10 bg-[#111] p-4">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <Camera className="h-3.5 w-3.5" />
                Camera
              </label>
              <select
                value={camera}
                onChange={(e) => setCamera(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#00ff88]"
              >
                <option>Integrated Camera</option>
                <option>USB Webcam</option>
                <option>OBS Virtual Camera</option>
              </select>
              <button
                onClick={toggleLive}
                className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-colors ${
                  live
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'border border-[#00ff88]/40 bg-[#00ff88]/10 text-[#00ff88] hover:bg-[#00ff88]/20'
                }`}
              >
                <Radio className="h-4 w-4" />
                {live ? 'Camera virtuelle ACTIVE' : 'Live'}
              </button>
            </div>

            {/* Modele */}
            <div className="rounded-xl border border-white/10 bg-[#111] p-4">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <Cpu className="h-3.5 w-3.5" />
                Face Swapper Model
              </label>
              <select
                value={model}
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-gray-300 outline-none"
              >
                <option>{model}</option>
              </select>
            </div>
          </div>

          {/* Apercu en direct */}
          <Panel title="Apercu en direct" icon={Eye}>
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`h-full w-full object-cover ${previewOn ? 'block' : 'hidden'}`}
              />
              {previewOn && !streamRef.current && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#001a10] to-black">
                  <div className="text-center">
                    <div className="mx-auto mb-2 h-16 w-16 animate-pulse rounded-full bg-[#00ff88]/20" />
                    <span className="text-xs text-gray-400">Apercu de demonstration</span>
                  </div>
                </div>
              )}
              {!previewOn && (
                <div className="flex flex-col items-center gap-2 text-gray-600">
                  <Camera className="h-12 w-12" />
                  <span className="text-xs">Apercu inactif</span>
                </div>
              )}

              {/* Overlays facon Deep-Live-Cam */}
              {status === 'running' && toggles.showFps && (
                <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 font-mono text-xs text-[#00ff88]">
                  {fps} FPS
                </span>
              )}
              {live && (
                <span className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-md bg-red-500/90 px-2 py-1 text-xs font-bold text-white">
                  <Circle className="h-2 w-2 fill-current" />
                  LIVE
                </span>
              )}
            </div>
          </Panel>
        </div>

        {/* Options : toggles + sliders */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-[#111] p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">Options</h3>
            <div className="grid grid-cols-2 gap-3">
              <Toggle
                label="Face Enhancer"
                checked={toggles.faceEnhancer}
                onChange={() => setToggles((t) => ({ ...t, faceEnhancer: !t.faceEnhancer }))}
              />
              <Toggle
                label="Show FPS"
                checked={toggles.showFps}
                onChange={() => setToggles((t) => ({ ...t, showFps: !t.showFps }))}
              />
              <Toggle
                label="Many Faces"
                checked={toggles.manyFaces}
                onChange={() => setToggles((t) => ({ ...t, manyFaces: !t.manyFaces }))}
              />
              <Toggle
                label="Poisson Blend"
                checked={toggles.poissonBlend}
                onChange={() => setToggles((t) => ({ ...t, poissonBlend: !t.poissonBlend }))}
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#111] p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">Reglages</h3>
            <Slider label="Sharpness" value={sharpness} onChange={setSharpness} />
            <div className="h-3" />
            <Slider label="Mouth Mask" value={mouthMask} onChange={setMouthMask} />
          </div>
        </div>

        {/* Terminal de logs */}
        <div className="mt-4 rounded-xl border border-white/10 bg-black p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500">
            <span className="h-2 w-2 rounded-full bg-[#00ff88]" />
            Console
          </div>
          <div ref={logRef} className="h-40 overflow-y-auto font-mono text-xs leading-relaxed text-gray-400">
            {logs.map((l, i) => (
              <div key={i} className="whitespace-pre-wrap">
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Barre de statut */}
      <div className="sticky bottom-0 flex items-center justify-between border-t border-white/10 bg-[#0d0d0d] px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              status === 'ready'
                ? 'bg-[#00ff88]'
                : status === 'running'
                  ? 'animate-pulse bg-[#00ff88]'
                  : 'animate-pulse bg-yellow-500'
            }`}
          />
          <span className="font-medium text-gray-300">{STATUS_LABEL[status]}</span>
        </div>
        <span className="font-mono text-gray-600">CUDA · RTX 4060 · {model}</span>
      </div>
    </div>
  )
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111] p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <Icon className="h-4 w-4 text-[#00ff88]" />
        {title}
      </h2>
      {children}
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-left transition-colors hover:border-white/20"
    >
      <span className="text-sm text-gray-300">{label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[#00ff88]' : 'bg-white/15'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-black transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="font-mono text-[#00ff88]">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-[#00ff88]"
        aria-label={label}
      />
    </div>
  )
}
