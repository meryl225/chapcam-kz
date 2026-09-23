"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

const questions = [
  ["Qu’est-ce que ChapCam ?", "ChapCam est une plateforme créative qui transforme tes photos, vidéos et idées grâce à des outils d’intelligence artificielle simples à utiliser."],
  ["Quels outils sont disponibles ?", "Tu peux créer des face swaps, animer des photos, contrôler des mouvements, générer des messages vocaux, traduire des vidéos et bien plus encore."],
  ["Est-ce que je peux commencer gratuitement ?", "Oui. Commence gratuitement et découvre les outils ChapCam sans carte bancaire."],
  ["Mes créations sont-elles privées ?", "Tes créations restent protégées et tu gardes le contrôle de tes contenus."],
  ["Comment fonctionne le paiement ?", "Choisis un plan depuis la page Tarifs pour ajouter des crédits et débloquer davantage de possibilités créatives."],
]

export function HomepageFaq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="mt-20 border-t border-[#d8e8f6] pt-16 lg:mt-28 lg:pt-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#148ee0]">FAQ</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#071a42] sm:text-4xl">Questions fréquentes</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#607493]">Tout ce que tu dois savoir avant de commencer avec ChapCam.</p>
        </div>
        <div className="space-y-3">
          {questions.map(([question, answer], index) => {
            const isOpen = open === index
            return <div key={question} className={`overflow-hidden rounded-2xl border bg-white/70 transition ${isOpen ? "border-[#9ed8f6] shadow-[0_12px_28px_-20px_rgba(20,142,224,.55)]" : "border-[#dbe9f4]"}`}><button type="button" onClick={() => setOpen(isOpen ? null : index)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"><span className="text-sm font-semibold text-[#17345f]">{question}</span><ChevronDown className={`h-4 w-4 shrink-0 text-[#148ee0] transition-transform ${isOpen ? "rotate-180" : ""}`} /></button>{isOpen && <p className="border-t border-[#e7f0f7] px-5 pb-5 pt-4 text-sm leading-6 text-[#607493]">{answer}</p>}</div>
          })}
        </div>
      </div>
    </section>
  )
}
