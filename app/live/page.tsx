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
  Wifi,
  Cloud,
  Sparkles,
  Activity,
  ScanFace,
  ShieldCheck,
  Gauge,
  Monitor,
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

  // Avatar cible (premier selectionne) pour la section "Avatar actif"
  const targetAvatar = avatars.find((a) => selected.includes(a.id)) ?? avatars[0] ?? null

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <Loader2 className="h-8 w-8 animate-spin text-[#00ff88]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Halo premium en fond */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(900px circle at 20% 0%, rgba(0,255,136,0.08), transparent 45%), radial-gradient(800px circle at 90% 10%, rgba(139,92,246,0.10), transparent 45%)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 py-8 md:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Tableau de bord
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-300">
            <Crown className="h-3.5 w-3.5" /> PRO
          </span>
        </div>

        {/* Titre */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-balance md:text-4xl">Live Pro</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00ff88]/30 bg-[#00ff88]/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#00ff88]">
              Changement de visage uniquement
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            Changez votre visage en temps réel avec une qualité maximale.
          </p>
        </div>

        {/* Barre de statut */}
        <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3.5 backdrop-blur-sm">
          <span className="flex items-center gap-2 text-sm">
            <Wifi className="h-4 w-4 text-[#00ff88]" />
            <span className="text-gray-300">Connexion</span>
            <span className="font-semibold text-[#00ff88]">excellente</span>
          </span>
          <span className="hidden h-4 w-px bg-white/10 sm:block" />
          <span className="flex items-center gap-2 text-sm">
            <Cloud className="h-4 w-4 text-cyan-400" />
            <span className="text-gray-300">Mode</span>
            <span className="font-semibold text-white">Cloud</span>
          </span>
          <span className="hidden h-4 w-px bg-white/10 sm:block" />
          <span className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-violet-300" />
            <span className="text-gray-300">Qualité</span>
            <span className="font-semibold text-white">Ultra HD</span>
          </span>
          <span className="hidden h-4 w-px bg-white/10 sm:block" />
          <span className="flex items-center gap-2 text-sm">
            <Activity className={`h-4 w-4 ${isLive ? 'text-[#00ff88]' : 'text-gray-400'}`} />
            <span className="text-gray-300">Latence</span>
            <span className="font-semibold text-white">{latencyMs > 0 ? `${latencyMs} ms` : '45 ms'}</span>
          </span>
        </div>

        {/* Carte d'information principale */}
        <div className="mb-6 flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[#00ff88]/15 bg-gradient-to-br from-[#00ff88]/[0.06] to-violet-500/[0.06] p-5">
          <p className="max-w-2xl text-sm text-gray-200">
            <span className="font-semibold text-white">Live Pro</span> utilise l&apos;IA pour remplacer
            uniquement votre <span className="text-[#00ff88]">visage</span> en temps réel, avec une
            qualité maximale et une latence minimale.
          </p>
          <span className="relative hidden h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-[#00ff88]/30 bg-[#00ff88]/10 sm:flex">
            <span className="absolute inset-0 rounded-2xl bg-[#00ff88]/20 blur-md" />
            <ScanFace className="relative h-7 w-7 text-[#00ff88]" />
          </span>
        </div>

        {/* Bouton abonnement (haut) - logique inchangee */}
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

        {/* Info file d'attente */}
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

        {/* Moteur temporairement indisponible */}
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

        {/* Scene split-screen (logique/refs inchangees) */}
        <div className="relative">
          {/* Cercle IA anime entre les deux panneaux (decoratif) */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center md:flex"
          >
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[#00ff88]/40 bg-[#0a0a0a]">
              <span className="absolute inset-0 rounded-full bg-[#00ff88]/20 blur-md cc-pulse" />
              <span className="absolute inset-0 rounded-full border border-violet-400/30" />
              <Zap className="relative h-6 w-6 text-[#00ff88]" />
            </span>
            <span className="mt-2 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-gray-300 backdrop-blur-sm">
              IA en temps réel
            </span>
          </div>

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
        </div>

        {/* 4 cartes d'etat */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: ScanFace, label: 'Visage détecté', value: isLive ? 'Optimal' : 'En attente', color: '#00ff88' },
            { icon: Activity, label: 'Tracking IA', value: isLive ? 'Actif' : 'Prêt', color: '#22d3ee' },
            { icon: ShieldCheck, label: 'Stabilité', value: 'Excellente', color: '#8b5cf6' },
            { icon: Sparkles, label: 'Qualité', value: 'Ultra HD', color: '#f59e0b' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-4 transition-colors hover:border-white/20"
            >
              <div className="flex items-center gap-2">
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
              <p className="mt-1.5 text-base font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Erreur */}
        {error && !notConfigured && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* CTA principal (logique inchangee) */}
        <div className="mt-6 flex flex-col gap-4">
          {!isLive ? (
            <button
              onClick={handleStart}
              disabled={!canStart || isBusy}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-5 text-base font-bold text-white shadow-[0_0_40px_rgba(0,255,136,0.25)] transition-all hover:shadow-[0_0_55px_rgba(0,255,136,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background:
                  'linear-gradient(90deg, #00ff88 0%, #06b6d4 50%, #8b5cf6 100%)',
              }}
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
                <span className="flex flex-col items-center text-black">
                  <span className="flex items-center gap-2">
                    <Zap className="h-5 w-5 fill-black" />
                    {effectiveMode === 'trial' ? 'Démarrer Live Pro (essai 2 min)' : 'Démarrer Live Pro'}
                  </span>
                  <span className="text-xs font-medium text-black/70">
                    Le changement de visage commencera en temps réel
                  </span>
                </span>
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

        {/* Avatar actif (visage cible) */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
          <div className="mb-4 flex items-center gap-2">
            <ScanFace className="h-4 w-4 text-[#00ff88]" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-white">
              Avatar actif <span className="text-gray-500">(visage cible)</span>
            </h2>
          </div>

          {targetAvatar && (
            <div className="mb-5 flex items-center gap-4 rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/[0.04] p-3">
              <img
                src={targetAvatar.url || '/placeholder.svg'}
                alt={`Visage cible ${targetAvatar.name}`}
                className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                crossOrigin="anonymous"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">{targetAvatar.name}</p>
                <p className="text-xs text-gray-400">{selected.length} photo(s) de référence</p>
              </div>
              <Link
                href="/dashboard/avatars"
                className="flex-shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-gray-200 transition-colors hover:bg-white/5"
              >
                Modifier l&apos;avatar
              </Link>
            </div>
          )}

          <PersonaPicker
            avatars={avatars}
            selected={selected}
            max={MAX_PERSONA}
            onToggle={toggleAvatar}
            disabled={isLive || isBusy}
          />
        </div>

        {/* Section performance */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: Gauge, label: 'Images / seconde', value: isLive && fps > 0 ? `${fps} fps` : '60 fps' },
            { icon: Monitor, label: 'Résolution', value: '1920×1080' },
            { icon: Activity, label: 'Latence', value: latencyMs > 0 ? `${latencyMs} ms` : '45 ms' },
            { icon: ShieldCheck, label: 'Statut', value: 'Optimal' },
          ].map((p) => (
            <div key={p.label} className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-4">
              <p.icon className="mb-2 h-4 w-4 text-[#00ff88]" />
              <p className="text-xl font-bold text-white">{p.value}</p>
              <p className="mt-0.5 text-xs text-gray-500">{p.label}</p>
            </div>
          ))}
        </div>

        {/* Astuce camera virtuelle */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0d0d0d] p-4">
          <Camera className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#00ff88]" />
          <div className="text-sm text-gray-400">
            <p className="font-semibold text-white">Utiliser comme camera virtuelle</p>
            <p className="mt-1">
              Pour t&apos;en servir dans Zoom, Meet ou WhatsApp : installe OBS, ajoute la fenetre
              ChapCam comme source, puis active{' '}
              <span className="text-gray-300">&laquo; Virtual Camera &raquo;</span>. Selectionne ensuite
              &laquo; OBS Virtual Camera &raquo; dans ton application d&apos;appel.
            </p>
          </div>
        </div>

        {/* Carte premium bas de page */}
        <div className="mt-6 flex flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.12] to-[#00ff88]/[0.06] p-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-violet-500/20">
              <Crown className="h-6 w-6 text-violet-300" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-white">Passez à Live Pro</h3>
              <p className="mt-1 max-w-md text-sm text-gray-300">
                Débloquez le GPU dédié, l&apos;accès prioritaire et la meilleure qualité.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/plans"
            className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-600"
          >
            Voir les offres
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Comparatif moteur */}
        <EngineComparison />

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-gray-600">
          <Info className="h-3.5 w-3.5" />
          La latence depend de ta connexion et de la charge du GPU.
        </p>
      </div>

      {/* Overlay GPU (logique inchangee) */}
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
