'use client'

import Link from 'next/link'
import { Crown, Video, Check, X, Sparkles, ArrowRight } from 'lucide-react'

/**
 * Bloc pedagogique : explique clairement que l'outil Live temps reel (ce que
 * l'utilisateur teste sur /live) est DIFFERENT de l'abonnement Lucy (Decart).
 * Objectif : eviter que les gens jugent toute l'app sur l'essai temps reel
 * (plus leger) et comprennent que l'abonnement est bien superieur.
 */
export function EngineComparison() {
  return (
    <section className="mt-10">
      <div className="mb-5 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gray-300">
          <Sparkles className="h-3.5 w-3.5 text-[#00ff88]" />
          Deux choses differentes
        </span>
        <h2 className="mt-3 text-balance text-xl font-bold text-white md:text-2xl">
          L&apos;outil Live n&apos;est <span className="text-gray-300">pas le meme</span> que le logiciel
          ChapCam de depart
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-pretty text-sm text-gray-400">
          Ici tu essaies l&apos;outil Live, fait pour aller vite pendant tes appels. Le vrai logiciel
          ChapCam, lui, est bien meilleur : il te change <span className="font-semibold text-[#00ff88]">en
          entier</span>, en bien plus beau et sans bug.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Carte 1 : Live temps reel (l'outil actuel) */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Video className="h-5 w-5 text-gray-300" />
            </span>
            <div>
              <p className="text-sm font-bold text-white">L&apos;outil Live</p>
              <p className="text-xs text-gray-500">Ce que tu utilises ici</p>
            </div>
          </div>
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-start gap-2.5 text-gray-300">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
              Change seulement ton <span className="font-semibold text-white">visage</span>, en direct
            </li>
            <li className="flex items-start gap-2.5 text-gray-300">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
              Fait pour aller <span className="font-semibold text-white">vite</span> pendant tes appels
            </li>
            <li className="flex items-start gap-2.5 text-gray-300">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
              Gratuit a essayer, sans payer
            </li>
            <li className="flex items-start gap-2.5 text-gray-500">
              <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-600" />
              Le visage seulement, qualite simple
            </li>
          </ul>
        </div>

        {/* Carte 2 : Abonnement Lucy (premium, recommande) */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-[#00ff88]/50 bg-gradient-to-br from-[#00ff88]/10 via-[#0d0d0d] to-[#0d0d0d] p-5 shadow-[0_0_40px_-12px_rgba(0,255,136,0.45)]">
          <span className="absolute right-3 top-3 rounded-full bg-[#00ff88] px-2.5 py-0.5 text-[11px] font-bold text-black">
            10X MIEUX
          </span>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00ff88]/20">
              <Crown className="h-5 w-5 text-[#00ff88]" />
            </span>
            <div>
              <p className="text-sm font-bold text-white">Le logiciel ChapCam</p>
              <p className="text-xs text-[#00ff88]">Avec un abonnement</p>
            </div>
          </div>
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-start gap-2.5 text-gray-200">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#00ff88]" />
              Te change <span className="font-semibold text-white">en entier</span>, de la tete aux pieds
            </li>
            <li className="flex items-start gap-2.5 text-gray-200">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#00ff88]" />
              Image <span className="font-semibold text-white">beaucoup plus belle</span> et nette
            </li>
            <li className="flex items-start gap-2.5 text-gray-200">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#00ff88]" />
              <span className="font-semibold text-white">Sans bug</span>, ca reste bien sur le visage
            </li>
            <li className="flex items-start gap-2.5 text-gray-200">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#00ff88]" />
              <span className="font-semibold text-white">10x plus vrai</span> que l&apos;outil Live
            </li>
          </ul>
          <Link
            href="/dashboard/plans"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00ff88] py-3 text-sm font-bold text-black transition-colors hover:bg-[#00dd77]"
          >
            Voir les abonnements
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
