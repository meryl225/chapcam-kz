import Link from "next/link"
import { ArrowRight, Play, Sparkles } from "lucide-react"

export function GenjutsuVideoShowcase() {
  return (
    <section className="px-6 py-24" aria-labelledby="genjutsu-showcase-title">
      <div className="mx-auto grid max-w-7xl items-center gap-10 overflow-hidden rounded-[2rem] border border-[#c6f542]/20 bg-[#0b1020] p-6 shadow-[0_30px_100px_-40px_rgba(198,245,66,0.35)] md:p-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#c6f542]/30 bg-[#c6f542]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#c6f542]">
            <Sparkles className="h-4 w-4" /> Nouveau sur ChapCam
          </span>
          <h2 id="genjutsu-showcase-title" className="mt-5 text-balance text-4xl font-black tracking-tight text-white md:text-5xl">
            Donne vie à tes images avec <span className="text-[#c6f542]">Genjutsu</span>
          </h2>
          <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-white/60 md:text-lg">
            Transfère un mouvement naturel et cinématique sur une image grâce au moteur Higgsfield, directement depuis ton studio ChapCam.
          </p>
          <Link
            href="/dashboard/genjutsu"
            className="group mt-7 inline-flex items-center gap-3 rounded-2xl bg-[#c6f542] px-5 py-3.5 text-sm font-extrabold text-[#071006] shadow-[0_12px_30px_-10px_rgba(198,245,66,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#d5ff62] hover:shadow-[0_18px_38px_-12px_rgba(198,245,66,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6f542] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1020] active:translate-y-0"
            aria-label="Ouvrir le studio Genjutsu"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#071006]/10 ring-1 ring-[#071006]/15 transition-transform duration-200 group-hover:scale-105">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="flex flex-col items-start leading-none">
              <span>Ouvrir le studio</span>
              <span className="mt-1 text-[11px] font-semibold text-[#071006]/65">Créer avec Genjutsu</span>
            </span>
            <span className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#071006] text-[#c6f542] transition-transform duration-200 group-hover:translate-x-0.5">
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Link>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
          <video className="aspect-video w-full object-cover" autoPlay controls muted loop playsInline preload="metadata">
            <source src="/videos/genjutsu-demo.mov" type="video/mp4" />
            Votre navigateur ne prend pas en charge la vidéo Genjutsu.
          </video>
          <div className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            <Play className="h-3.5 w-3.5 fill-current text-[#c6f542]" /> Démonstration Genjutsu
          </div>
        </div>
      </div>
    </section>
  )
}
