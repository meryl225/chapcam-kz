'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'

// sessionStorage : le popup s'affiche a chaque nouvelle connexion (nouvelle session navigateur),
// une seule fois par session.
const ANNOUNCEMENT_KEY = 'chapcam-5.0-launch-popup-seen'

export function ChapCam2Announcement() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(ANNOUNCEMENT_KEY)) return
    } catch {
      // stockage indisponible : on affiche quand meme
    }
    const t = setTimeout(() => setOpen(true), 600)
    return () => clearTimeout(t)
  }, [])

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

        <Link href="/download" onClick={dismiss} className="block">
          <Image
            src="/images/chapcam-5-launch.png"
            alt="ChapCam 5.0 est disponible : rendu humain ultra-réaliste, visage et corps entier, peut tenir tout type d'objet en main, transformation en temps réel sans filigrane. Compatible iPhone, Android, Windows et MacBook."
            width={1280}
            height={640}
            priority
            className="h-auto w-full"
          />
        </Link>

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
