import Link from "next/link"
import { ArrowRight, Play, WandSparkles } from "lucide-react"

export function MotionControlVideoShowcase() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8" aria-labelledby="motion-control-showcase-title">
      <div className="grid overflow-hidden rounded-3xl border border-[#6366f1]/30 bg-[#0b1020] shadow-[0_24px_80px_-32px_rgba(99,102,241,0.55)] lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-center p-6 sm:p-10">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-[#6366f1]/40 bg-[#6366f1]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#a5b4fc]">
            <WandSparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Motion Control
          </div>
          <h2 id="motion-control-showcase-title" className="max-w-xl text-pretty text-3xl font-black tracking-tight text-white sm:text-4xl">
            Donne du mouvement à tes images
          </h2>
          <p className="mt-4 max-w-lg text-pretty leading-7 text-slate-300">
            Anime une image avec un mouvement précis et cinématique directement depuis ton studio ChapCam.
          </p>
          <Link href="/dashboard/motion" className="mt-7 inline-flex w-fit items-center gap-3 rounded-2xl bg-[#c6f542] px-5 py-3.5 text-sm font-extrabold text-[#071006] shadow-[0_12px_30px_-10px_rgba(198,245,66,0.9)] transition hover:-translate-y-0.5 hover:bg-[#d5ff62] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6f542] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1020]">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#071006]/10"><Play className="h-4 w-4 fill-current" aria-hidden="true" /></span>
            Découvrir Motion Control
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="min-h-[260px] bg-black/40 p-3 sm:p-5">
          <video className="h-full max-h-[460px] min-h-[240px] w-full rounded-2xl object-contain" autoPlay loop muted playsInline preload="metadata" aria-label="Démonstration Motion Control">
            <source src="/videos/motion-control-demo.mp4" type="video/mp4" />
            Votre navigateur ne prend pas en charge la vidéo Motion Control.
          </video>
        </div>
      </div>
    </section>
  )
}
