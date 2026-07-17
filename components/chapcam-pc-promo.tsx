import Image from 'next/image'
import Link from 'next/link'
import { Download, Infinity as InfinityIcon, Check, Sparkles } from 'lucide-react'
import { PC_OFFER } from '@/lib/pc-offer'
import { ChapCamPcCountdown } from '@/components/chapcam-pc-countdown'

// Bandeau promo premium pour ChapCam PC (logiciel a vie).
// Reutilise sur la page d'accueil et la page Recharger : il met en avant
// l'offre a vie avec prix barre + reduction, et renvoie vers la page produit
// ou se fait le telechargement / paiement.
export function ChapCamPcPromo() {
  return (
    <Link href="/dashboard/chapcam-pc" className="group block">
      <div className="relative overflow-hidden rounded-3xl border-2 border-[#00ff88]/60 bg-gradient-to-br from-[#00ff88]/15 via-[#0d120f] to-[#0d0d0d] p-6 shadow-[0_0_50px_-12px_rgba(0,255,136,0.5)] transition-all duration-300 group-hover:border-[#00ff88] md:p-8">
        {/* Badge promo */}
        <div className="absolute -right-3 -top-3 flex items-center gap-1 rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
          <Sparkles className="h-3.5 w-3.5" />
          PROMO -{PC_OFFER.discountPercent}%
        </div>

        <div className="flex flex-col items-center gap-6 lg:flex-row lg:justify-between">
          {/* Visuel + texte */}
          <div className="flex flex-1 flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <div className="relative h-28 w-44 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-lg">
              <Image
                src="/chapcam-pc-hero.png"
                alt="Logiciel ChapCam PC en cours d'utilisation"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00ff88]/40 bg-[#00ff88]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#00ff88]">
                <InfinityIcon className="h-3.5 w-3.5" />
                Logiciel a vie · Edition PC
              </div>
              <h3 className="text-2xl font-black text-white md:text-3xl">ChapCam PC</h3>
              <p className="mt-1 max-w-md text-sm text-gray-300">
                Le logiciel complet sur ton ordinateur pour le changement de visage. Tu paies une
                seule fois et il est a toi pour toujours : aucun abonnement, cle de licence envoyee
                par email.
              </p>
              <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-300 sm:justify-start">
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#00ff88]" />
                  Changement de visage
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#00ff88]" />
                  Windows et MacBook
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#00ff88]" />
                  Paiement unique
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#00ff88]" />
                  Camera virtuelle
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#00ff88]" />
                  Sans abonnement
                </li>
              </ul>
              <p className="mt-2 text-[11px] font-medium text-amber-400/90">
                Compatible Windows et MacBook — GPU dedie (PC Gamer) recommande pour de meilleures performances
              </p>
            </div>
          </div>

          {/* Prix + CTA */}
          <div className="flex w-full flex-col items-stretch gap-3 lg:w-64">
            <div className="text-center lg:text-right">
              <div className="flex items-center justify-center gap-2 lg:justify-end">
                <span className="text-lg text-gray-500 line-through">
                  {PC_OFFER.originalPrice.toLocaleString('fr-FR')}
                </span>
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400">
                  -{PC_OFFER.discountPercent}%
                </span>
              </div>
              <div>
                <span className="text-4xl font-black text-[#00ff88]">
                  {PC_OFFER.price.toLocaleString('fr-FR')}
                </span>
                <span className="text-xl text-gray-400"> FCFA</span>
              </div>
              <p className="text-xs text-gray-500">paiement unique a vie</p>
            </div>
            <div className="pointer-events-none">
              <ChapCamPcCountdown compact />
            </div>
            <span className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00ff88] py-4 text-base font-bold text-black transition-all group-hover:bg-[#00dd77]">
              <Download className="h-5 w-5" />
              Telecharger ChapCam PC
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
