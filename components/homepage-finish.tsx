import Link from "next/link"
import { ArrowRight, Check, Globe2, Monitor, Smartphone } from "lucide-react"
export function HomepageFinish() {
  return (
    <>
      <section className="hidden border-y border-white/[0.08] bg-white/[0.025] px-6 py-10 lg:block">
        <div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-white/[0.08]">
          <div className="flex items-center gap-4 pr-8">
            <Check className="h-5 w-5 text-cyan-300" />
            <div><p className="text-lg font-semibold text-white">+25 000</p><p className="text-xs text-slate-400">créateurs déjà inscrits</p></div>
          </div>
          <div className="flex items-center gap-4 px-8">
            <div className="flex gap-2 text-cyan-200"><Monitor className="h-5 w-5" /><Smartphone className="h-5 w-5" /></div>
            <div><p className="text-sm font-semibold text-white">Plateformes compatibles</p><p className="text-xs text-slate-400">WhatsApp, Discord, Twitch et plus</p></div>
          </div>
          <div className="flex items-center gap-4 pl-8">
            <Globe2 className="h-5 w-5 text-cyan-300" />
            <div><p className="text-sm font-semibold text-white">Disponibilité internationale</p><p className="text-xs text-slate-400">Afrique de l&apos;Ouest &amp; Centrale</p></div>
          </div>
        </div>
      </section>
      <section className="hidden px-6 py-16 lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-cyan-300/15 bg-gradient-to-r from-blue-950/70 via-[#111837] to-violet-950/60 px-10 py-8 shadow-[0_24px_70px_-35px_rgba(59,130,246,0.8)]">
          <div><p className="text-3xl font-bold tracking-tight text-white">Prêt à créer sans limites ?</p><p className="mt-2 text-sm text-slate-400">Tous tes outils créatifs, réunis dans un seul studio.</p></div>
          <Link href="/auth/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-[0_12px_30px_-12px_rgba(59,130,246,0.9)] transition hover:brightness-110">Commencer gratuitement <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </>
  )
}
