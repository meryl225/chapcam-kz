'use client'

/**
 * Mode plein ecran mobile immersif pour le Live Swap (facon FaceTime / TikTok Live).
 *
 * IMPORTANT : ce composant est une COUCHE DE PRESENTATION uniquement.
 * - Il ne recree AUCUNE connexion WebRTC et ne touche pas au pipeline video.
 * - Il se contente de "mirrorer" le srcObject des <video> existantes (celles que
 *   le hook useLucy21 alimente) vers ses propres <video> plein ecran. Un meme
 *   MediaStream peut etre affiche par plusieurs elements <video> simultanement.
 * - Il ne s'affiche QUE sur mobile ET seulement quand le swap est connecte.
 *   Le desktop n'est jamais impacte.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Square, RefreshCw, Settings, X, Check, Plus } from 'lucide-react'
import Link from 'next/link'

interface Avatar {
  id: string
  name: string
  url: string
  is_active: boolean
}

interface MobileLiveOverlayProps {
  /** true = mobile ET swap connecte : on affiche l'overlay. */
  active: boolean
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>
  localVideoRef: React.RefObject<HTMLVideoElement | null>
  stats: { fps: number; latency: number; resolution: string }
  connectionQuality: string | null
  duration: number
  formatDuration: (seconds: number) => string
  userPoints: number
  avatars: Avatar[]
  selectedAvatar: Avatar | null
  onSelectAvatar: (avatar: Avatar) => void
  onStop: () => void
}

// Couleur du point de qualite reseau selon le verdict du moteur.
const QUALITY_DOT: Record<string, { color: string; label: string }> = {
  good: { color: 'bg-emerald-400', label: 'Excellente' },
  fair: { color: 'bg-yellow-400', label: 'Correcte' },
  medium: { color: 'bg-yellow-400', label: 'Correcte' },
  poor: { color: 'bg-orange-400', label: 'Faible' },
  critical: { color: 'bg-red-500', label: 'Critique' },
}

export function MobileLiveOverlay({
  active,
  remoteVideoRef,
  localVideoRef,
  stats,
  connectionQuality,
  duration,
  formatDuration,
  userPoints,
  avatars,
  selectedAvatar,
  onSelectAvatar,
  onStop,
}: MobileLiveOverlayProps) {
  const fsRemoteRef = useRef<HTMLVideoElement | null>(null)
  const fsLocalRef = useRef<HTMLVideoElement | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [controlsVisible, setControlsVisible] = useState(true)
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false)
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Animation d'entree : on passe "mounted" a true juste apres le montage
  // pour declencher la transition fade + scale.
  useEffect(() => {
    if (active) {
      const id = requestAnimationFrame(() => setMounted(true))
      return () => cancelAnimationFrame(id)
    }
    setMounted(false)
  }, [active])

  // Mirroring des flux : on recopie le srcObject des <video> sources vers les
  // <video> plein ecran. Un interval leger garde la synchro (le flux ChapCam
  // change quand on applique une scene ou qu'on change d'avatar).
  useEffect(() => {
    if (!active) return
    const sync = () => {
      const src = remoteVideoRef.current
      const dst = fsRemoteRef.current
      if (src && dst && dst.srcObject !== src.srcObject) {
        dst.srcObject = src.srcObject
        dst.play?.().catch(() => {})
      }
      const lsrc = localVideoRef.current
      const ldst = fsLocalRef.current
      if (lsrc && ldst && ldst.srcObject !== lsrc.srcObject) {
        ldst.srcObject = lsrc.srcObject
        ldst.play?.().catch(() => {})
      }
    }
    sync()
    const id = setInterval(sync, 500)
    return () => clearInterval(id)
  }, [active, remoteVideoRef, localVideoRef])

  // Verrouille le scroll du body tant que le mode plein ecran est actif.
  useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [active])

  // Auto-masquage des controles apres quelques secondes d'inactivite.
  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setControlsVisible(false), 4000)
  }, [])

  useEffect(() => {
    if (!active) return
    scheduleHide()
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [active, scheduleHide])

  // Toute interaction avec l'ecran reaffiche les controles et relance le timer.
  const revealControls = useCallback(() => {
    setControlsVisible(true)
    scheduleHide()
  }, [scheduleHide])

  if (!active) return null

  const quality = QUALITY_DOT[connectionQuality ?? 'good'] ?? QUALITY_DOT.good
  const minutesLeft = Math.floor(userPoints / 120)

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-black md:hidden"
      style={{
        height: '100dvh',
        width: '100vw',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 280ms ease',
      }}
      onPointerDown={revealControls}
      role="dialog"
      aria-label="Live Swap plein écran"
    >
      {/* Camera ChapCam en plein ecran (sortie du swap) */}
      <video
        ref={fsRemoteRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          transform: `scaleX(-1) scale(${mounted ? 1 : 1.06})`,
          transition: 'transform 300ms ease',
        }}
      />

      {/* Degrades haut/bas pour la lisibilite des controles */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300"
        style={{ opacity: controlsVisible ? 1 : 0 }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300"
        style={{ opacity: controlsVisible ? 1 : 0 }}
      />

      {/* ===== Controles flottants (auto-masquables) ===== */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? 'auto' : 'none' }}
      >
        {/* Haut gauche : PiP camera reelle */}
        <div
          className="absolute left-4 overflow-hidden rounded-2xl border border-white/20 bg-black/40 shadow-lg backdrop-blur-md"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)', width: 92, height: 130 }}
        >
          <video
            ref={fsLocalRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-medium text-white/90">
            Réelle
          </span>
        </div>

        {/* Haut droite : HUD stats (FPS, qualite, latence) */}
        <div
          className="absolute right-4 flex flex-col items-end gap-2"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        >
          <div className="flex items-center gap-3 rounded-full border border-white/15 bg-black/40 px-3.5 py-2 text-white backdrop-blur-md">
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <span className={`h-2 w-2 rounded-full ${quality.color}`} />
              {quality.label}
            </span>
            <span className="text-white/25">|</span>
            <span className="text-xs font-semibold text-emerald-400">{stats.fps} FPS</span>
            <span className="text-white/25">|</span>
            <span className="text-xs text-white/80">{stats.latency}ms</span>
          </div>
          {/* Chrono + minutes restantes */}
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3.5 py-1.5 text-white backdrop-blur-md">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs font-semibold tabular-nums">{formatDuration(duration)}</span>
            <span className="text-white/25">|</span>
            <span className="text-[11px] text-white/70">{minutesLeft} min restantes</span>
          </div>
        </div>

        {/* Bas centre : Stop / Changer avatar / Reglages */}
        <div
          className="absolute inset-x-0 flex items-end justify-center gap-6"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
        >
          {/* Changer d'avatar */}
          <button
            onClick={() => { setAvatarSheetOpen(true); revealControls() }}
            className="flex flex-col items-center gap-1.5"
            aria-label="Changer d'avatar"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-transform active:scale-90">
              {selectedAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedAvatar.url || '/placeholder.svg'} alt={selectedAvatar.name} className="h-full w-full rounded-full object-cover" />
              ) : (
                <RefreshCw className="h-6 w-6" />
              )}
            </span>
            <span className="text-[11px] font-medium text-white/90">Avatar</span>
          </button>

          {/* Stop (bouton principal) */}
          <button
            onClick={onStop}
            className="flex flex-col items-center gap-1.5"
            aria-label="Arrêter le Live Swap"
          >
            <span className="flex items-center justify-center rounded-full border-4 border-white/80 bg-red-500 text-white shadow-[0_8px_30px_rgba(239,68,68,0.5)] transition-transform active:scale-90" style={{ height: 72, width: 72 }}>
              <Square className="h-7 w-7 fill-white" />
            </span>
            <span className="text-[11px] font-semibold text-white">Arrêter</span>
          </button>

          {/* Reglages */}
          <button
            onClick={() => { setSettingsSheetOpen(true); revealControls() }}
            className="flex flex-col items-center gap-1.5"
            aria-label="Réglages"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-transform active:scale-90">
              <Settings className="h-6 w-6" />
            </span>
            <span className="text-[11px] font-medium text-white/90">Réglages</span>
          </button>
        </div>
      </div>

      {/* ===== Bottom sheet : choix d'avatar ===== */}
      {avatarSheetOpen && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end" onPointerDown={(e) => e.stopPropagation()}>
          <button
            className="absolute inset-0 bg-black/50"
            aria-label="Fermer"
            onClick={() => setAvatarSheetOpen(false)}
          />
          <div
            className="relative max-h-[70dvh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-neutral-900/95 p-5 backdrop-blur-xl"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Changer d&apos;avatar</h2>
              <button onClick={() => setAvatarSheetOpen(false)} aria-label="Fermer" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            {avatars.length === 0 ? (
              <Link href="/dashboard/avatars" className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 py-8 text-sm text-white/70">
                <Plus className="h-4 w-4" /> Ajouter un avatar
              </Link>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {avatars.map((avatar) => {
                  const isSel = selectedAvatar?.id === avatar.id
                  return (
                    <button
                      key={avatar.id}
                      onClick={() => { onSelectAvatar(avatar); setAvatarSheetOpen(false) }}
                      className={`relative aspect-square overflow-hidden rounded-2xl border-2 transition-colors ${isSel ? 'border-emerald-400' : 'border-transparent'}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={avatar.url || '/placeholder.svg'} alt={avatar.name} className="h-full w-full object-cover" />
                      {isSel && (
                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-black">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Bottom sheet : reglages / infos session ===== */}
      {settingsSheetOpen && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end" onPointerDown={(e) => e.stopPropagation()}>
          <button
            className="absolute inset-0 bg-black/50"
            aria-label="Fermer"
            onClick={() => setSettingsSheetOpen(false)}
          />
          <div
            className="relative rounded-t-3xl border-t border-white/10 bg-neutral-900/95 p-5 backdrop-blur-xl"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Session en direct</h2>
              <button onClick={() => setSettingsSheetOpen(false)} aria-label="Fermer" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/50">Fluidité</p>
                <p className="mt-1 text-xl font-bold text-emerald-400">{stats.fps} FPS</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/50">Résolution</p>
                <p className="mt-1 text-xl font-bold text-white">{stats.resolution}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/50">Latence</p>
                <p className="mt-1 text-xl font-bold text-white">{stats.latency}ms</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/50">Temps restant</p>
                <p className="mt-1 text-xl font-bold text-white">{minutesLeft} min</p>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-white/40">
              Les réglages avancés (qualité, codec, effets) sont disponibles sur la version ordinateur.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
