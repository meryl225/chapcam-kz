"use client"

import { Camera, Check, Clapperboard, Mic2, ScanFace, Sparkles, WandSparkles } from "lucide-react"

const features = [
  { icon: ScanFace, title: "Live Swap", text: "Change de visage en temps réel pour des contenus dynamiques et immersifs." },
  { icon: Clapperboard, title: "Photos en vidéo", text: "Anime tes images et transforme une photo en séquence prête à partager." },
  { icon: WandSparkles, title: "Genjutsu & Motion Control", text: "Donne du mouvement à tes visuels et pilote tes scènes avec l’IA." },
  { icon: Mic2, title: "Voix et traduction", text: "Crée des voix naturelles et adapte tes vidéos à de nouvelles langues." },
]

export function HomepageAbout() {
  return (
    <section id="a-propos" className="mt-16 scroll-mt-24 rounded-[2rem] border border-[#c9dff2] bg-white p-6 shadow-[0_24px_56px_-30px_rgba(28,77,130,.6)] sm:p-10 lg:mt-24 lg:p-12">
      <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#0789d1]">À propos de ChapCam</p>
          <h2 className="mt-3 max-w-xl text-4xl font-black leading-[1.05] tracking-[-.045em] text-[#06183d] sm:text-5xl lg:text-[3.25rem]">Le studio créatif IA qui transforme tes idées en expériences.</h2>
          <p className="mt-5 max-w-lg text-[15px] leading-7 text-[#405675]">ChapCam rassemble des outils simples et puissants pour créer, transformer et partager des contenus visuels et audio sans multiplier les logiciels.</p>
          <div className="mt-7 grid gap-3 text-sm font-semibold text-[#1e3d68] sm:grid-cols-2">
            {["Création rapide", "Outils accessibles", "Résultats prêts à partager", "Un espace centralisé"].map((item) => <span key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-[#0ea5e9]" />{item}</span>)}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-[#cfe2f3] bg-[#f7fbff] p-5 shadow-[0_10px_24px_-18px_rgba(28,77,130,.7)] transition hover:-translate-y-0.5 hover:border-[#9cc9ec] hover:bg-white"><span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0ea5e9] to-[#7654e8] text-white shadow-[0_8px_16px_-8px_rgba(37,99,235,.7)]"><Icon className="h-5 w-5" /></span><h3 className="mt-4 text-lg font-bold text-[#06183d]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#405675]">{text}</p></article>)}
        </div>
      </div>
    </section>
  )
}
