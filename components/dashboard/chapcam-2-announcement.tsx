'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { PLAY_STORE_URL } from '@/components/home-mobile-apps'

// sessionStorage : le popup s'affiche a chaque nouvelle connexion (nouvelle session navigateur),
// une seule fois par session.
const ANNOUNCEMENT_KEY = 'chapcam-5.0-launch-popup-seen'

type ChapCam2AnnouncementProps = {
  delayMs?: number
  oncePerSession?: boolean
}

export function ChapCam2Announcement({ delayMs = 600, oncePerSession = true }: ChapCam2AnnouncementProps = {}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (oncePerSession) {
      try {
        if (sessionStorage.getItem(ANNOUNCEMENT_KEY)) return
      } catch {
        // stockage indisponible : on affiche quand meme
      }
    }
    const t = setTimeout(() => setOpen(true), delayMs)
    return () => clearTimeout(t)
  }, [delayMs, oncePerSession])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function dismiss() {
    try {
      sessionStorage.setItem(ANNOUNCEMENT_KEY, '1')
    } catch {
      // ignore
    }
    setOpen(false)
  }

  function handleMainDownload() {
    const ua = navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
    dismiss()
    if (/Android/i.test(ua)) {
      window.open(PLAY_STORE_URL, '_blank', 'noopener,noreferrer')
    } else if (!isIOS) {
      router.push('/download')
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="ChapCam 5.0 est disponible"
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-sky-400/40 bg-[#050b24] shadow-[0_0_60px_rgba(56,189,248,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white/80 backdrop-blur transition-colors hover:bg-black/80 hover:text-white"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative">
          <Image
            src="/images/chapcam-5-launch.png"
            alt="ChapCam 5.0 est disponible : rendu humain ultra-réaliste, visage et corps entier, peut tenir tout type d'objet en main, transformation en temps réel sans filigrane. Compatible iPhone, Android, Windows et MacBook."
            width={1280}
            height={640}
            priority
            className="h-auto w-full"
          />

          {/* Zones cliquables positionnees (en %) sur les badges et le bouton dessines dans l'image. */}
          <button
            type="button"
            onClick={dismiss}
            title="Sur iPhone, ChapCam 5.0 s'utilise directement ici dans ton navigateur"
            aria-label="iPhone : utiliser ChapCam 5.0 dans le navigateur"
            className="absolute rounded-xl outline-none ring-sky-300 transition hover:bg-white/10 focus-visible:ring-2"
            style={{ left: '3.6%', top: '83.2%', width: '10.8%', height: '10.6%' }}
          />
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            aria-label="Télécharger ChapCam 5.0 sur Google Play (Android)"
            className="absolute rounded-xl outline-none ring-sky-300 transition hover:bg-white/10 focus-visible:ring-2"
            style={{ left: '15.4%', top: '83.2%', width: '11.4%', height: '10.6%' }}
          />
          <Link
            href="/download"
            onClick={dismiss}
            aria-label="Télécharger ChapCam 5.0 pour Windows"
            className="absolute rounded-xl outline-none ring-sky-300 transition hover:bg-white/10 focus-visible:ring-2"
            style={{ left: '27.7%', top: '83.2%', width: '12.4%', height: '10.6%' }}
          />
          <Link
            href="/download"
            onClick={dismiss}
            aria-label="Télécharger ChapCam 5.0 pour MacBook"
            className="absolute rounded-xl outline-none ring-sky-300 transition hover:bg-white/10 focus-visible:ring-2"
            style={{ left: '41%', top: '83.2%', width: '12.4%', height: '10.6%' }}
          />
          <button
            type="button"
            onClick={handleMainDownload}
            aria-label="Télécharger ChapCam 5.0 pour mon appareil"
            className="absolute rounded-full outline-none ring-sky-300 transition hover:bg-white/10 focus-visible:ring-2"
            style={{ left: '59.3%', top: '82.6%', width: '36%', height: '12%' }}
          />
        </div>

        <div className="flex justify-center border-t border-white/10 py-2">
          <button
            onClick={dismiss}
            className="rounded-xl px-5 py-2 text-sm text-white/60 transition-colors hover:text-white"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  )
}
