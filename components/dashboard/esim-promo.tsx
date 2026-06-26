import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

export function EsimPromo() {
  return (
    <Link
      href="/numbers/app/marketplace"
      className="group relative block w-full overflow-hidden rounded-2xl border border-[#2563EB]/40 bg-[#0b1220] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2563EB]/70 hover:shadow-[0_18px_50px_-18px_rgba(37,99,235,0.7)] lg:w-72"
    >
      {/* halo bleu */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-90"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.45), transparent 70%)' }}
      />

      <div className="relative flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0 transition-transform duration-300 group-hover:scale-105">
          <Image
            src="/images/esim-chip.png"
            alt="Carte eSIM ChapCam"
            fill
            sizes="80px"
            className="object-contain drop-shadow-[0_6px_18px_rgba(37,99,235,0.5)]"
          />
        </div>

        <div className="min-w-0">
          <span className="inline-flex items-center rounded-full bg-[#2563EB]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#60a5fa]">
            Nouveau
          </span>
          <p className="mt-1.5 text-base font-bold leading-tight text-white text-balance">
            ESIM ChapCam
          </p>
          <p className="mt-0.5 text-xs leading-snug text-white/55 text-pretty">
            Numéros virtuels dans 150+ pays.
          </p>
        </div>
      </div>

      <span className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white transition-colors group-hover:bg-[#1d4ed8]">
        Obtenir
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </span>
    </Link>
  )
}
