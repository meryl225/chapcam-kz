import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"

interface LegalShellProps {
  title: string
  updatedAt: string
  intro?: string
  children: ReactNode
}

export function LegalShell({ title, updatedAt, intro, children }: LegalShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Background subtil */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a1f35] via-[#0a0e1a] to-[#0a0e1a]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour à l&apos;accueil
        </Link>

        <header className="mt-8 border-b border-white/10 pb-8">
          <h1 className="text-balance text-3xl font-bold leading-tight md:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">Dernière mise à jour : {updatedAt}</p>
          {intro && <p className="mt-6 text-pretty leading-relaxed text-muted-foreground">{intro}</p>}
        </header>

        <article className="legal-content mt-10 space-y-8 leading-relaxed">{children}</article>

        <footer className="mt-16 border-t border-white/10 pt-8 text-sm text-muted-foreground">
          <p>
            ChapCam — Pour toute question juridique ou relative à vos données, contactez-nous à{" "}
            <a href="mailto:contact@chapcam.com" className="text-primary hover:underline">
              contact@chapcam.com
            </a>
            .
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/conditions" className="hover:text-primary">
              Conditions Générales d&apos;Utilisation
            </Link>
            <Link href="/confidentialite" className="hover:text-primary">
              Politique de Confidentialité
            </Link>
          </div>
        </footer>
      </div>
    </main>
  )
}

/** Section de document légal avec titre numéroté. */
export function LegalSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-semibold text-foreground md:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-pretty text-muted-foreground">{children}</div>
    </section>
  )
}
