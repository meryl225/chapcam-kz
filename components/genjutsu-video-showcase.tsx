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
          <Link href="/dashboard/genjutsu" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#c6f542] px-5 py-3.5 font-bold text-black transition hover:brightness-110">
            Essayer Genjutsu <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
          <video className="aspect-video w-full object-cover" controls muted playsInline preload="metadata">
            <source src="/videos/genjutsu-demo.mov" type="video/quicktime" />
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
