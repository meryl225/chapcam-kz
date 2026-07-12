import Link from "next/link"
import { MapPin, Phone } from "lucide-react"

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative z-10 border-t border-white/10 bg-background/60 px-6 py-10 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
        <div>
          <p className="text-lg font-bold text-foreground">
            Chap<span className="text-primary">Cam</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Plateforme d&apos;intelligence artificielle responsable. © {year} ChapCam. Tous droits réservés.
          </p>

          <div className="mt-4 flex flex-col items-center gap-2 md:items-start">
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Yopougon Niangon Texaco, Pharmacie Léa,
                <br className="hidden md:block" /> boutique METATECH
              </span>
            </p>
            <a
              href="tel:+2250555560189"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              +225 05 55 56 01 89
            </a>
          </div>
        </div>

        <nav aria-label="Liens légaux" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <Link href="/numbers" className="font-semibold text-[#2563EB] transition-colors hover:text-[#1d4ed8]">
            ESIM ChapCam
          </Link>
          <Link href="/conditions" className="text-muted-foreground transition-colors hover:text-primary">
            Conditions d&apos;utilisation
          </Link>
          <Link href="/confidentialite" className="text-muted-foreground transition-colors hover:text-primary">
            Politique de confidentialité
          </Link>
          <Link href="/conditions#paiements" className="text-muted-foreground transition-colors hover:text-primary">
            Politique de remboursement
          </Link>
          <a
            href="mailto:contact@chapcam.com"
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            Contact juridique
          </a>
          <Link href="/charte#signaler" className="text-muted-foreground transition-colors hover:text-primary">
            Signaler un abus
          </Link>
        </nav>
      </div>
    </footer>
  )
}
