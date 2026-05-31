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
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLiveFaceSwap } from '@/hooks/use-live-face-swap'
import { PersonaPicker, type PersonaAvatar } from '@/components/live/persona-picker'
import { LiveStage } from '@/components/live/live-stage'
import { LiveAccessBanner } from '@/components/live/live-access-banner'
import { PaymentConfirmModal } from '@/app/dashboard/plans/payment-confirm-modal'
import type { PlanConfig } from '@/lib/plans'
import { LIVE_OFFERS } from '@/lib/live-offers'

const MAX_PERSONA = 4
const OFFER = LIVE_OFFERS[0]

// Objet compatible avec le modal de paiement existant (reutilise le flux Wave/Orange/MTN/Moov).
const LIVE_OFFER_AS_PLAN = {
  id: OFFER.id,
  name: OFFER.name,
  price: OFFER.price,
} as unknown as PlanConfig

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
  const [waveUrl, setWaveUrl] = useState<string | undefined>(undefined)
  const [showPayment, setShowPayment] = useState(false)

  const {
    status,
    mode,
    secondsRemaining,
    fps,
    latencyMs,
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

    fetch('/api/wave-links')
      .then((r) => r.json())
      .then((d) => {
        const link = (d.links ?? []).find((l: any) => l.plan === OFFER.id)
        if (link?.wave_url) setWaveUrl(link.wave_url)
      })
      .catch(() => {})

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

  const isBusy = status === 'connecting' || status === 'preparing'
  const isLive = status === 'running'
  const canStart = (access?.mode ?? 'none') !== 'none' && selected.length > 0

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
            Face Swap temps reel basse latence
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Transforme ton visage en direct avec un moteur GPU dedie. Utilisable dans tes appels video.
          </p>
        </div>

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
              onBuy={() => setShowPayment(true)}
            />
          </div>
        )}

        {/* Alerte moteur non configure */}
        {(notConfigured || access?.gpuConfigured === false) && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" />
            <div className="text-sm text-yellow-200/90">
              <p className="font-semibold text-yellow-400">Moteur Live non configure</p>
              <p className="mt-1 text-gray-300">
                Le pod GPU temps reel n&apos;est pas encore branche. Definis les variables
                d&apos;environnement <code className="rounded bg-black/40 px-1">LIVE_GPU_WS_URL</code> et{' '}
                <code className="rounded bg-black/40 px-1">LIVE_GPU_SHARED_SECRET</code>, puis deploie le
                worker GPU (voir <code className="rounded bg-black/40 px-1">scripts/live-gpu-worker</code>).
              </p>
            </div>
          </div>
        )}

        {/* Scene split-screen */}
        <LiveStage
          status={status}
          fps={fps}
          latencyMs={latencyMs}
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
                  {status === 'connecting' ? 'Connexion...' : 'Preparation...'}
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 fill-black" />
                  Demarrer le Live Face Swap
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

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-gray-600">
          <Info className="h-3.5 w-3.5" />
          La latence depend de ta connexion et de la charge du GPU.
        </p>
      </div>

      {showPayment && (
        <PaymentConfirmModal
          plan={LIVE_OFFER_AS_PLAN}
          waveUrl={waveUrl}
          onClose={() => {
            setShowPayment(false)
            refreshAccess()
          }}
        />
      )}
    </div>
  )
}
