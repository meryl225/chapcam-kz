import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Globe, ShieldCheck, MessageSquareText } from 'lucide-react'

const FEATURES = [
  { icon: Globe, label: '180+ pays' },
  { icon: MessageSquareText, label: 'SMS OTP' },
  { icon: ShieldCheck, label: 'Proxies' },
]

export function EsimPromo() {
  return (
    <Link
      href="/chapsim"
      aria-label="Découvrir ChapSim : numéros virtuels, SMS OTP et proxies premium"
      className="group relative block w-full overflow-hidden rounded-2xl border border-[#7c3aed]/45 bg-gradient-to-br from-[#150e2e] via-[#0e0a20] to-[#0b0a1a] p-5 shadow-[0_10px_40px_-16px_rgba(124,58,237,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#a78bfa]/70 hover:shadow-[0_20px_60px_-18px_rgba(124,58,237,0.8)] lg:w-72"
    >
      {/* halos violets */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-90"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.5), transparent 70%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.4), transparent 70%)' }}
      />

      {/* en-tête : logo + badge */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/chapsim/logo.jpg"
              alt="Logo ChapSim"
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-lg font-extrabold leading-none tracking-tight text-white">ChapSim</p>
            <p className="mt-1 text-[11px] font-medium text-[#a78bfa]">Numéros virtuels premium</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#7c3aed]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#c4b5fd] ring-1 ring-[#7c3aed]/40">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#a78bfa]" />
          Nouveau
        </span>
      </div>

      <p className="relative mt-3 text-xs leading-snug text-white/60 text-pretty">
        Reçois tes SMS OTP et achète des numéros &amp; proxies dans le monde entier.
      </p>

      {/* tags fonctionnalités */}
      <div className="relative mt-3 flex flex-wrap gap-1.5">
        {FEATURES.map((f) => (
          <span
            key={f.label}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/75"
          >
            <f.icon className="h-3 w-3 text-[#a78bfa]" />
            {f.label}
          </span>
        ))}
      </div>

      {/* CTA */}
      <span className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgba(124,58,237,0.9)] transition-all group-hover:brightness-110">
        Obtenir ChapSim
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </span>
    </Link>
  )
}
