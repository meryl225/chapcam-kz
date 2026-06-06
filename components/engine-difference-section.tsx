'use client'

import Link from 'next/link'
import { Check, X, Crown, ArrowRight, Sparkles } from 'lucide-react'

/**
 * Explique simplement la difference entre :
 *  - l'outil Live (essai gratuit, visage seulement, peut avoir de l'attente)
 *  - le vrai logiciel ChapCam avec abonnement (corps entier, sans bug, bien plus beau)
 *
 * Langage volontairement simple, sans termes techniques.
 */
export function EngineDifferenceSection() {
  return (
    <section id="difference" className="relative px-4 py-20 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00ff88]/30 bg-[#00ff88]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#00ff88]">
            <Sparkles className="h-3.5 w-3.5" />
            A lire avant d&apos;essayer
          </span>
          <h2 className="mt-4 text-balance text-2xl font-bold text-white sm:text-3xl md:text-4xl">
            L&apos;essai gratuit n&apos;est <span className="text-[#00ff88]">pas</span> le vrai logiciel ChapCam
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-gray-400 sm:text-base">
            L&apos;essai te montre juste un apercu. Le vrai logiciel ChapCam, avec un abonnement, est
            beaucoup plus puissant : il te change en entier, sans bug, et l&apos;image est bien plus belle.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Essai gratuit */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Ce que tu testes</p>
            <h3 className="mt-1 text-lg font-bold text-white">L&apos;essai gratuit (outil Live)</h3>
            <ul className="mt-5 space-y-3 text-sm">
              <li className="flex items-start gap-2.5 text-gray-300">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                Change seulement ton visage
              </li>
              <li className="flex items-start gap-2.5 text-gray-300">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                Gratuit, juste pour essayer
              </li>
              <li className="flex items-start gap-2.5 text-gray-500">
                <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-600" />
                Image plus simple, qualite limitee
              </li>
              <li className="flex items-start gap-2.5 text-gray-500">
                <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-600" />
                Beaucoup de monde en meme temps : tu peux attendre
              </li>
            </ul>
          </div>

          {/* Vrai logiciel - mis en avant */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-[#00ff88]/50 bg-gradient-to-b from-[#00ff88]/10 to-transparent p-6 shadow-[0_0_40px_rgba(0,255,136,0.15)] sm:p-7">
            <span className="absolute right-4 top-4 rounded-full bg-[#00ff88] px-2.5 py-0.5 text-[11px] font-bold text-black">
              10X MIEUX
            </span>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-[#00ff88]" />
              <p className="text-xs font-semibold uppercase tracking-widest text-[#00ff88]">Avec un abonnement</p>
            </div>
            <h3 className="mt-1 text-lg font-bold text-white">Le vrai logiciel ChapCam</h3>
            <ul className="mt-5 space-y-3 text-sm">
              <li className="flex items-start gap-2.5 text-gray-200">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#00ff88]" />
                Te change <span className="font-semibold text-white">de la tete aux pieds</span>
              </li>
              <li className="flex items-start gap-2.5 text-gray-200">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#00ff88]" />
                <span className="font-semibold text-white">Aucun bug</span>, ca reste bien en place
              </li>
              <li className="flex items-start gap-2.5 text-gray-200">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#00ff88]" />
                Image <span className="font-semibold text-white">beaucoup plus belle</span> et nette
              </li>
              <li className="flex items-start gap-2.5 text-gray-200">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#00ff88]" />
                Tu passes en priorite, <span className="font-semibold text-white">sans attente</span>
              </li>
            </ul>
            <Link
              href="/dashboard/plans"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00ff88] py-3 text-sm font-bold text-black transition-colors hover:bg-[#00dd77]"
            >
              Prendre un abonnement
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
