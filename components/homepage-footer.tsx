import Link from "next/link"
import { MapPin, Phone, Send } from "lucide-react"

const legalLinks = [
  { label: "ESIM ChapCam", href: "/numbers" },
  { label: "Conditions d'utilisation", href: "/conditions" },
  { label: "Politique de confidentialité", href: "/confidentialite" },
  { label: "Politique de remboursement", href: "/conditions#paiements" },
  { label: "Contact juridique", href: "mailto:contact@chapcam.com" },
  { label: "Signaler un abus", href: "/charte#signaler" },
]

export function HomepageFooter() {
  return (
    <footer className="relative mt-16 overflow-hidden border-t border-[#1b2945] bg-[#070c1b] px-6 py-12 text-[#e6edf9] sm:px-8 lg:px-12">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00f5a0] to-transparent opacity-60" />
      <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-md">
          <p className="text-2xl font-extrabold tracking-tight">Chap<span className="text-[#00f5a0]">Cam</span></p>
          <p className="mt-2 text-base leading-6 text-[#9aa9c3]">Plateforme d&apos;intelligence artificielle responsable. © 2026 ChapCam. Tous droits réservés.</p>
          <div className="mt-6 space-y-3 text-base text-[#9aa9c3]">
            <p className="flex items-start gap-3"><MapPin className="mt-1 h-5 w-5 shrink-0 text-[#00f5a0]" aria-hidden="true" /><span>Yopougon Niangon Texaco, Pharmacie Léa,<br />boutique METATECH</span></p>
            <a href="tel:+2250555560189" className="flex items-center gap-3 font-semibold transition-colors hover:text-[#00f5a0]"><Phone className="h-5 w-5 text-[#00f5a0]" aria-hidden="true" />+225 05 55 56 01 89</a>
          </div>
        </div>
        <div className="flex max-w-3xl flex-col items-start gap-7 lg:items-end">
          <nav aria-label="Liens légaux" className="flex flex-wrap justify-start gap-x-8 gap-y-4 text-base lg:justify-end">
            {legalLinks.map((link) => <Link key={link.label} href={link.href} className="font-medium transition-colors hover:text-[#00f5a0]">{link.label}</Link>)}
          </nav>
          <a href="https://t.me/chapcam" target="_blank" rel="noreferrer" className="group flex items-center gap-4 self-end text-[#c0c9d9]">
            <span className="italic transition-colors group-hover:text-white">Besoin d&apos;aide ?</span>
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#0b6fae] bg-[#168dcc] shadow-[0_0_28px_rgba(0,184,255,.55)] transition-transform group-hover:scale-105"><Send className="h-7 w-7 -rotate-12 fill-current text-white" aria-hidden="true" /></span>
          </a>
        </div>
      </div>
    </footer>
  )
}
