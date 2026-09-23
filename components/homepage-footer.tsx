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
          <a href="https://t.me/chapcam" target="_blank" rel="noreferrer" aria-label="Contacter ChapCam sur Telegram" className="group fixed bottom-[5.25rem] right-4 z-50 flex min-h-14 items-center gap-2 rounded-full bg-[#070c1b]/95 py-1 pl-3 pr-1 text-[#c0c9d9] shadow-[0_10px_30px_rgba(0,0,0,.24)] backdrop-blur-md transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#168dcc] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070c1b] sm:bottom-8 sm:right-8 sm:min-h-16 sm:gap-3 sm:pl-4">
            <span className="whitespace-nowrap text-xs italic transition-colors group-hover:text-white sm:text-sm">Besoin d&apos;aide ?</span>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-[#0b6fae] bg-[#168dcc] shadow-[0_0_28px_rgba(0,184,255,.55)] transition-transform group-hover:scale-105 sm:h-14 sm:w-14"><Send className="h-5 w-5 -rotate-12 fill-current text-white sm:h-6 sm:w-6" aria-hidden="true" /></span>
          </a>
        </div>
      </div>
    </footer>
  )
}
