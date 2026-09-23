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
    <section id="a-propos" className="mt-16 scroll-mt-24 rounded-[2rem] border border-[#dbe9f4] bg-white/75 p-6 shadow-[0_20px_48px_-30px_rgba(28,77,130,.55)] backdrop-blur sm:p-10 lg:mt-24 lg:p-12">
      <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#148ee0]">À propos de ChapCam</p>
          <h2 className="mt-3 max-w-xl text-3xl font-black tracking-[-.05em] text-[#071a42] sm:text-4xl lg:text-5xl">Le studio créatif IA qui transforme tes idées en expériences.</h2>
          <p className="mt-5 max-w-lg text-sm leading-7 text-[#607493]">ChapCam rassemble des outils simples et puissants pour créer, transformer et partager des contenus visuels et audio sans multiplier les logiciels.</p>
          <div className="mt-6 grid gap-3 text-sm font-semibold text-[#29466d] sm:grid-cols-2">
            {["Création rapide", "Outils accessibles", "Résultats prêts à partager", "Un espace centralisé"].map((item) => <span key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-[#0ea5e9]" />{item}</span>)}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-[#dbe9f4] bg-[#f4faff] p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0ea5e9] to-[#7654e8] text-white"><Icon className="h-5 w-5" /></span><h3 className="mt-4 text-base font-bold text-[#071a42]">{title}</h3><p className="mt-2 text-xs leading-5 text-[#607493]">{text}</p></article>)}
        </div>
      </div>
    </section>
  )
}
