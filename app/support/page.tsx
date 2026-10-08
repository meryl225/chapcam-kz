import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Mail } from "lucide-react"
import { SupportForm } from "@/components/support/support-form"

export const metadata: Metadata = {
  title: "Centre d'assistance — ChapCam",
  description:
    "Besoin d'aide avec votre compte, un abonnement, un paiement ou une fonctionnalité ChapCam ? Contactez l'équipe d'assistance ChapCam.",
  alternates: { canonical: "https://chapcam.com/support" },
}

export default function SupportPage() {
  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a1f35] via-[#0a0e1a] to-[#0a0e1a]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-10 px-5 py-10 md:px-6 md:py-16">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3" aria-label="ChapCam — retour à l'accueil">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo%20chapcam-Zg2rUUnOrSECjteElTxoU1rcYfwF3i.jpg"
              alt=""
              width={44}
              height={44}
              className="rounded-xl object-contain"
            />
            <span className="text-lg font-bold">ChapCam</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Retour sur chapcam.com
          </Link>
        </header>

        <section className="flex flex-col gap-4">
          <h1 className="text-balance text-3xl font-bold leading-tight md:text-4xl">
            Centre d&apos;assistance ChapCam
          </h1>
          <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
            Besoin d&apos;aide avec votre compte, un abonnement, un paiement ou une fonctionnalité ChapCam ? Notre équipe
            est disponible pour vous accompagner.
          </p>
        </section>

        <a
          href="mailto:contact@chapcam.com"
          className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-primary/50"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Mail className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col">
            <span className="text-sm text-muted-foreground">Écrivez-nous directement</span>
            <span className="font-semibold text-foreground group-hover:text-primary">contact@chapcam.com</span>
          </span>
        </a>

        <section
          aria-labelledby="support-form-title"
          className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-8"
        >
          <div className="flex flex-col gap-1">
            <h2 id="support-form-title" className="text-xl font-semibold">
              Envoyer une demande
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Nous vous répondrons par email dans les meilleurs délais.
            </p>
          </div>
          <SupportForm />
        </section>

        <footer className="flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="Liens légaux" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/conditions" className="hover:text-primary">
              Conditions d&apos;utilisation
            </Link>
            <Link href="/confidentialite" className="hover:text-primary">
              Politique de confidentialité
            </Link>
          </nav>
          <p>© {new Date().getFullYear()} ChapCam</p>
        </footer>
      </div>
    </main>
  )
}
