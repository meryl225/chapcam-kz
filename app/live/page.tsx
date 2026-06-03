'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Play,
  Square,
  Loader2,
  Zap,
  AlertTriangle,
  Info,
  Camera,
  Users,
  Crown,
  ArrowRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLiveFaceSwap } from '@/hooks/use-live-face-swap'
import { PersonaPicker, type PersonaAvatar } from '@/components/live/persona-picker'
import { LiveStage } from '@/components/live/live-stage'
import { GpuSetupOverlay } from '@/components/live/gpu-setup-overlay'
import { LiveAccessBanner } from '@/components/live/live-access-banner'
import { EngineComparison } from '@/components/live/engine-comparison'
import { LIVE_OFFERS } from '@/lib/live-offers'

const MAX_PERSONA = 4
const OFFER = LIVE_OFFERS[0]

interface AccessState {
  mode: 'paid' | 'ready' | 'trial' | 'none'
  secondsRemaining: number
  trialSecondsRemaining: number
  pendingWindows: number
  gpuConfigured: boolean
}

export default function LivePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [avatars, setAvatars] = useState<PersonaAvatar[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [access, setAccess] = useState<AccessState | null>(null)

  const {
    status,
    mode,
    secondsRemaining,
    fps,
    latencyMs,
    queuePosition,
    queueTotal,
    saturated,
    error,
    notConfigured,
    videoRef,
    outputCanvasRef,
    start,
    stop,
  } = useLiveFaceSwap()

  const refreshAccess = useCallback(async () => {
    try {
      const res = await fetch('/api/live/access')
      if (res.ok) {
        const data = await res.json()
        setAccess(data)
      }
    } catch {
      /* ignore */
    }
  }, [])

  // Init : auth + avatars + acces + lien wave
  useEffect(() => {
    let active = true
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login?redirect=/live')
        return
      }

      const [{ data: avatarRows }] = await Promise.all([
        supabase
          .from('user_avatars')
          .select('id, name, url')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        refreshAccess(),
      ])

      if (!active) return

      if (avatarRows) {
        setAvatars(avatarRows as PersonaAvatar[])
        // Pre-selection : avatar actif ou le premier
        if (avatarRows.length > 0) setSelected([avatarRows[0].id])
      }
      setLoading(false)
    }
    init()

    return () => {
      active = false
    }
  }, [router, supabase, refreshAccess])

  // Quand la session s'arrete, rafraichir l'etat d'acces (temps consomme)
  const prevStatus = useRef(status)
  useEffect(() => {
    if (prevStatus.current === 'running' && status === 'stopped') {
      refreshAccess()
    }
    prevStatus.current = status
  }, [status, refreshAccess])

  const toggleAvatar = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_PERSONA ? [...prev, id] : prev,
    )
  }

  const handleStart = async () => {
    const references = avatars.filter((a) => selected.includes(a.id)).map((a) => a.url)
    if (references.length === 0) return
    await start({ references })
  }

  const isBusy = status === 'connecting' || status === 'preparing' || status === 'queued'
  const isLive = status === 'running'
  const effectiveMode = mode ?? access?.mode ?? 'none'
  const canStart = effectiveMode !== 'none' && selected.length > 0

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Tableau de bord
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00ff88]/30 bg-[#00ff88]/10 px-3 py-1 text-xs font-semibold text-[#00ff88]">
            <Zap className="h-3.5 w-3.5" /> Live Pro
          </span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-balance md:text-3xl">
            flashchap
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Transforme ton visage en direct avec un moteur GPU dedie. Utilisable dans tes appels video.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            L&apos;outil Live est <span className="text-gray-300">different du logiciel ChapCam de depart</span>.
            Avec un abonnement, il n&apos;y a pas de bug et la transformation se fait de la tete aux pieds —{' '}
            <Link href="/dashboard" className="text-[#00ff88] underline-offset-2 hover:underline">
              voir les abonnements
            </Link>
            .
          </p>
        </div>

        {/* Gros bouton abonnement en haut */}
        <Link
          href="/dashboard"
          className="mb-6 flex w-full items-center justify-between gap-3 rounded-2xl bg-[#00ff88] px-5 py-4 text-black shadow-[0_0_30px_rgba(0,255,136,0.35)] transition-colors hover:bg-[#00dd77]"
        >
          <span className="flex items-center gap-3">
            <Crown className="h-6 w-6 flex-shrink-0" />
            <span className="text-left">
              <span className="block text-base font-bold sm:text-lg">Prendre un abonnement</span>
              <span className="block text-xs font-medium text-black/70 sm:text-sm">
                10x mieux - rendu haute qualite superieur
              </span>
            </span>
          </span>
          <ArrowRight className="h-5 w-5 flex-shrink-0" />
        </Link>

        {/* Banniere d'acces */}
        {access && (
          <div className="mb-6">
            <LiveAccessBanner
              mode={mode ?? access.mode}
              secondsRemaining={isLive || mode === 'paid' ? secondsRemaining : access.secondsRemaining}
              trialSecondsRemaining={access.trialSecondsRemaining}
              pendingWindows={access.pendingWindows}
              offerName={OFFER.name}
              offerPrice={OFFER.price}
              onBuy={() => {}}
            />
          </div>
        )}

        {/* Info file d'attente : beaucoup d'essais gratuits en meme temps */}
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/5">
            <Users className="h-4 w-4 text-gray-300" />
          </span>
          <div className="text-sm text-gray-300">
            <p className="font-semibold text-white">Beaucoup de monde essaie en ce moment</p>
            <p className="mt-1 text-gray-400">
              L&apos;essai est gratuit, donc plusieurs personnes l&apos;utilisent en meme temps. Tu peux
              parfois attendre un peu avant que ca demarre. Avec un{' '}
            <Link href="/dashboard" className="text-[#00ff88] underline-offset-2 hover:underline">
              abonnement
            </Link>
              , tu passes en priorite, sans bug et avec une transformation de la tete aux pieds.
            </p>
          </div>
        </div>

        {/* Moteur temporairement indisponible (message client, sans details techniques) */}
        {(notConfigured || access?.gpuConfigured === false) && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" />
            <div className="text-sm text-yellow-200/90">
              <p className="font-semibold text-yellow-400">Service Live momentanement indisponible</p>
              <p className="mt-1 text-gray-300">
                Notre moteur est en cours de redemarrage a cause d&apos;une forte affluence. Ton
                acces et ton temps ne sont pas debites. Reessaie dans quelques minutes en
                appuyant a nouveau sur le bouton.
              </p>
            </div>
          </div>
        )}

        {/* Scene split-screen */}
        <LiveStage
          status={status}
          fps={fps}
          latencyMs={latencyMs}
          queuePosition={queuePosition}
          queueTotal={queueTotal}
          saturated={saturated}
          videoRef={videoRef}
          outputCanvasRef={outputCanvasRef}
        />

        {/* Erreur */}
        {error && !notConfigured && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Controles */}
        <div className="mt-6 flex flex-col gap-4">
          {!isLive ? (
            <button
              onClick={handleStart}
              disabled={!canStart || isBusy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00ff88] py-4 text-base font-bold text-black transition-colors hover:bg-[#00dd77] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {status === 'connecting'
                    ? 'Connexion...'
                    : status === 'queued'
                      ? saturated
                        ? 'Tous les GPU occupes, nouvel essai...'
                        : queuePosition > 0
                          ? `File d\u2019attente (position ${queuePosition})`
                          : 'File d\u2019attente...'
                      : 'Preparation...'}
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 fill-black" />
                  {effectiveMode === 'trial'
                    ? 'Demarrer l\u2019essai gratuit (2 min)'
                    : 'Demarrer le Live Face Swap'}
                </>
              )}
            </button>
          ) : (
            <button
              onClick={stop}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 py-4 text-base font-bold text-white transition-colors hover:bg-red-600"
            >
              <Square className="h-5 w-5 fill-white" />
              Arreter le swap
            </button>
          )}

          {selected.length === 0 && (
            <p className="text-center text-xs text-gray-500">
              Selectionne au moins une photo persona pour demarrer.
            </p>
          )}
        </div>

        {/* Selection persona */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
          <PersonaPicker
            avatars={avatars}
            selected={selected}
            max={MAX_PERSONA}
            onToggle={toggleAvatar}
            disabled={isLive || isBusy}
          />
        </div>

        {/* Astuce camera virtuelle */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0d0d0d] p-4">
          <Camera className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#00ff88]" />
          <div className="text-sm text-gray-400">
            <p className="font-semibold text-white">Utiliser comme camera virtuelle</p>
            <p className="mt-1">
              Pour t&apos;en servir dans Zoom, Meet ou WhatsApp : installe OBS, ajoute la fenetre
              ChapCam comme source, puis active <span className="text-gray-300">&laquo; Virtual Camera &raquo;</span>.
              Selectionne ensuite &laquo; OBS Virtual Camera &raquo; dans ton application d&apos;appel.
            </p>
          </div>
        </div>

        {/* Gros bouton : prendre un abonnement */}
        <Link
          href="/dashboard"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00ff88] px-6 py-5 text-base font-bold text-black shadow-[0_0_30px_rgba(0,255,136,0.35)] transition-colors hover:bg-[#00dd77] sm:text-lg"
        >
          <Crown className="h-6 w-6" />
          Prendre un abonnement
        </Link>
        <p className="mt-2 text-center text-xs text-gray-500">
          Pas de bug, transformation de la tete aux pieds et bien meilleure qualite que l&apos;essai.
        </p>

        {/* Comparatif : Live temps reel vs abonnement Lucy (premium) */}
        <EngineComparison />

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-gray-600">
          <Info className="h-3.5 w-3.5" />
          La latence depend de ta connexion et de la charge du GPU.
        </p>
      </div>

      {/* Overlay bloquant facon LiveSync : empeche la surcharge GPU pendant
          le demarrage et fait patienter en file d'attente. */}
      <GpuSetupOverlay
        status={status}
        queuePosition={queuePosition}
        queueTotal={queueTotal}
        saturated={saturated}
        onClose={stop}
      />
    </div>
  )
}
