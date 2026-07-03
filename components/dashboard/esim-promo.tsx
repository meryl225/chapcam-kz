import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

export function EsimPromo() {
  return (
    <Link
      href="/chapsim"
      className="group relative block w-full overflow-hidden rounded-2xl border border-[#7c3aed]/40 bg-[#0b0a1a] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#7c3aed]/70 hover:shadow-[0_18px_50px_-18px_rgba(124,58,237,0.7)] lg:w-72"
    >
      {/* halo violet */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-90"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.45), transparent 70%)' }}
      />

      <div className="relative flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-105">
          <Image
            src="/chapsim/logo.jpg"
            alt="Logo ChapSim"
            fill
            sizes="80px"
            className="object-contain drop-shadow-[0_6px_18px_rgba(124,58,237,0.5)]"
          />
        </div>

        <div className="min-w-0">
          <span className="inline-flex items-center rounded-full bg-[#7c3aed]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#a78bfa]">
            Nouveau
          </span>
          <p className="mt-1.5 text-base font-bold leading-tight text-white text-balance">
            ChapSim
          </p>
          <p className="mt-0.5 text-xs leading-snug text-white/55 text-pretty">
            Numéros virtuels, SMS OTP & proxies premium.
          </p>
        </div>
      </div>

      <span className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#7c3aed] px-4 py-2.5 text-sm font-bold text-white transition-colors group-hover:bg-[#6d28d9]">
        Obtenir
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </span>
    </Link>
  )
}
