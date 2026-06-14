import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Film,
  ImageIcon,
  Video,
  Palette,
  Wand2,
  UserX,
  Ban,
  ShieldAlert,
  Megaphone,
  EyeOff,
  HeartCrack,
  FileCheck2,
  Scale,
  Lock,
  Building2,
  Fingerprint,
  Gavel,
  Globe,
} from 'lucide-react'
import { ReportForm } from '@/components/legal/report-form'

export const metadata: Metadata = {
  title: 'CHAPCAM AI — Utilisation responsable & conditions',
  description:
    'Créez du contenu avec l’intelligence artificielle de manière responsable et conforme aux lois applicables. Utilisations autorisées, interdites, consentement, sécurité et signalement.',
}

const ALLOWED = [
  { icon: Sparkles, label: 'Divertissement' },
  { icon: Wand2, label: 'Création de contenu' },
  { icon: Video, label: 'Clips vidéo' },
  { icon: ImageIcon, label: 'Montages photo' },
  { icon: Film, label: 'Montages vidéo' },
  { icon: Palette, label: 'Projets artistiques' },
  { icon: Sparkles, label: 'Démonstrations créatives' },
]

const FORBIDDEN = [
  {
    icon: UserX,
    title: 'Usurpation d’identité',
    desc: 'Interdiction d’utiliser CHAPCAM pour tromper ou se faire passer pour une autre personne.',
  },
  {
    icon: Ban,
    title: 'Escroquerie et fraude',
    desc: 'Interdiction d’utiliser CHAPCAM pour le broutage, l’ingénierie sociale ou toute activité frauduleuse.',
  },
  {
    icon: ShieldAlert,
    title: 'Cybercriminalité',
    desc: 'Interdiction de toute activité contraire aux lois applicables.',
  },
  {
    icon: Megaphone,
    title: 'Désinformation',
    desc: 'Interdiction de créer des contenus destinés à manipuler ou tromper le public.',
  },
  {
    icon: EyeOff,
    title: 'Atteinte à la réputation',
    desc: 'Interdiction de créer des contenus diffamatoires ou portant atteinte à la vie privée.',
  },
  {
    icon: HeartCrack,
    title: 'Contenus intimes non consentis',
    desc: 'Interdiction de créer ou diffuser des contenus sexuels ou humiliants sans consentement.',
  },
]

export default function ChartePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Fond premium subtil */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              'radial-gradient(120% 100% at 50% -10%, rgba(0,255,136,0.10), transparent 55%), radial-gradient(90% 80% at 100% 0%, rgba(0,212,255,0.06), transparent 50%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <div className="relative z-10">
        {/* ===== HERO ===== */}
        <section className="mx-auto max-w-5xl px-6 pt-12 pb-16 md:pt-20 md:pb-24">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour à l’accueil
          </Link>

          <div className="mt-10 flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-card/60 px-4 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
              Plateforme d’intelligence artificielle responsable
            </span>

            <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              CHAPCAM <span className="text-primary">AI</span>
            </h1>

            <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
              Créez du contenu avec l’intelligence artificielle de manière responsable et conforme aux lois
              applicables.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#conditions"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-bold text-primary-foreground transition-all hover:bg-primary/90"
              >
                Consulter les conditions
              </a>
              <a
                href="#signaler"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-hairline bg-card/40 px-6 py-3.5 font-semibold text-foreground backdrop-blur transition-colors hover:border-primary/40 hover:text-primary"
              >
                Signaler un abus
              </a>
            </div>
          </div>
        </section>

        <div id="conditions" className="mx-auto max-w-5xl space-y-20 px-6 pb-24 md:space-y-28">
          {/* ===== SECTION 1 — UTILISATION AUTORISÉE ===== */}
          <section aria-labelledby="autorise-title">
            <SectionHeader
              eyebrow="Section 1"
              id="autorise-title"
              title="Utilisation autorisée"
              desc="CHAPCAM est conçu pour la créativité et le divertissement. Vous pouvez l’utiliser pour :"
            />
            <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {ALLOWED.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-hairline bg-card p-4 transition-colors hover:border-primary/30"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                    <Icon className="h-5 w-5 text-primary" aria-hidden />
                  </span>
                  <span className="text-sm font-medium text-foreground">{label}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ===== SECTION 2 — UTILISATIONS INTERDITES ===== */}
          <section aria-labelledby="interdit-title">
            <SectionHeader
              eyebrow="Section 2"
              id="interdit-title"
              title="Utilisations interdites"
              desc="Les usages suivants sont strictement interdits et peuvent entraîner la suspension du compte et un signalement aux autorités."
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FORBIDDEN.map(({ icon: Icon, title, desc }) => (
                <article
                  key={title}
                  className="group relative overflow-hidden rounded-2xl border border-hairline bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-destructive/40"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.35), transparent 70%)' }}
                  />
                  <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/15">
                    <Icon className="h-5 w-5 text-destructive" aria-hidden />
                  </span>
                  <h3 className="relative mt-4 text-base font-bold text-foreground">{title}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </article>
              ))}
            </div>
          </section>

          {/* ===== SECTION 3 — CONSENTEMENT ET DROITS ===== */}
          <InfoSection
            eyebrow="Section 3"
            icon={FileCheck2}
            title="Consentement et droits"
            lead="L’utilisateur garantit disposer :"
          >
            <ul className="mt-4 flex flex-col gap-2">
              {['des droits nécessaires', 'des autorisations nécessaires', 'du consentement requis lorsque la loi l’exige'].map(
                (item) => (
                  <li key={item} className="flex items-start gap-3 text-muted-foreground">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <span>{item}</span>
                  </li>
                ),
              )}
            </ul>
            <p className="mt-4 text-muted-foreground">
              pour utiliser les images, vidéos ou voix importées.
            </p>
          </InfoSection>

          {/* ===== SECTION 4 — RESPONSABILITÉ ===== */}
          <InfoSection eyebrow="Section 4" icon={Scale} title="Responsabilité">
            <p className="text-muted-foreground">
              CHAPCAM agit exclusivement comme fournisseur de technologies d’intelligence artificielle.
            </p>
            <p className="mt-3 text-muted-foreground">
              Chaque utilisateur demeure seul responsable des contenus qu’il importe, génère ou diffuse.
            </p>
          </InfoSection>

          {/* ===== SECTION 5 — SÉCURITÉ ===== */}
          <InfoSection eyebrow="Section 5" icon={Lock} title="Sécurité">
            <p className="text-muted-foreground">En cas de suspicion d’abus, CHAPCAM peut :</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {['Suspendre un compte', 'Supprimer un compte', 'Limiter l’accès à certaines fonctionnalités'].map(
                (item) => (
                  <div key={item} className="rounded-xl border border-hairline bg-background/50 p-4 text-sm font-medium text-foreground">
                    {item}
                  </div>
                ),
              )}
            </div>
            <p className="mt-6 text-muted-foreground">Les contenus générés peuvent intégrer :</p>
            <ul className="mt-3 flex flex-col gap-2">
              {['des métadonnées', 'des identifiants techniques', 'des marqueurs de traçabilité'].map((item) => (
                <li key={item} className="flex items-start gap-3 text-muted-foreground">
                  <Fingerprint className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-muted-foreground">afin de lutter contre la fraude.</p>
          </InfoSection>

          {/* ===== SECTION 6 — COOPÉRATION AVEC LES AUTORITÉS ===== */}
          <InfoSection eyebrow="Section 6" icon={Building2} title="Coopération avec les autorités">
            <p className="text-muted-foreground">
              CHAPCAM coopérera avec les autorités compétentes lorsque la loi l’exige.
            </p>
          </InfoSection>

          {/* ===== SECTION 7 — CADRE LÉGAL & BROUTAGE ===== */}
          <section aria-labelledby="loi-title" className="scroll-mt-24">
            <div className="overflow-hidden rounded-3xl border border-destructive/30 bg-card">
              <div className="border-b border-destructive/20 bg-destructive/10 p-7 md:p-10">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/20">
                    <Gavel className="h-6 w-6 text-destructive" aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-destructive">Section 7</p>
                    <h2 id="loi-title" className="mt-1 text-xl font-bold tracking-tight md:text-2xl">
                      Cadre légal &amp; lutte contre le broutage
                    </h2>
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-7 md:p-10">
                <p className="text-muted-foreground">
                  En Côte d’Ivoire, l’escroquerie en ligne — communément appelée «&nbsp;broutage&nbsp;» — ainsi que
                  l’usurpation d’identité numérique et les arnaques sentimentales sont des infractions pénales
                  sévèrement réprimées. L’utilisation de CHAPCAM à ces fins est{' '}
                  <strong className="text-foreground">strictement interdite</strong>.
                </p>

                <div className="rounded-2xl border border-hairline bg-background/50 p-6">
                  <div className="flex items-start gap-3">
                    <Scale className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <div>
                      <h3 className="text-base font-bold text-foreground">Loi n° 2013-451 du 19 juin 2013</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        Relative à la lutte contre la cybercriminalité en Côte d’Ivoire. Elle réprime notamment
                        l’escroquerie en ligne, l’usurpation d’identité, la fraude informatique, le chantage et la
                        diffusion de fausses informations au moyen d’un système informatique. Ces faits sont passibles
                        de peines d’emprisonnement et d’amendes, conformément aux articles applicables ainsi qu’aux
                        dispositions du Code pénal ivoirien relatives à l’escroquerie.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-hairline bg-background/50 p-6">
                  <div className="flex items-start gap-3">
                    <Globe className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <div>
                      <h3 className="text-base font-bold text-foreground">Lois locales et internationales</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        Quel que soit votre pays, vous demeurez responsable du respect des lois applicables sur votre
                        territoire (protection des données, droit à l’image, lutte contre la fraude, RGPD pour
                        l’Union européenne, etc.). CHAPCAM est un outil de création&nbsp;: tout détournement à des fins
                        illégales engage votre seule responsabilité.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 p-5 text-sm leading-relaxed text-foreground">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
                  <p>
                    Tout usage frauduleux détecté entraîne la suspension immédiate du compte, la conservation des
                    preuves techniques (métadonnées, identifiants, traçabilité) et un signalement aux autorités
                    compétentes — en Côte d’Ivoire, notamment la Plateforme de Lutte Contre la Cybercriminalité (PLCC)
                    et la DITT.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ===== SECTION 8 — SIGNALEMENT ===== */}
          <section id="signaler" aria-labelledby="signaler-title" className="scroll-mt-24">
            <SectionHeader
              eyebrow="Section 8"
              id="signaler-title"
              title="Signaler un contenu"
              desc="Vous avez repéré un contenu qui enfreint nos conditions ? Signalez-le et notre équipe interviendra."
            />
            <div className="mt-8">
              <ReportForm />
            </div>
          </section>
        </div>

        {/* ===== FOOTER ===== */}
        <footer className="relative z-10 border-t border-hairline bg-card/40 backdrop-blur">
          <div className="mx-auto max-w-5xl px-6 py-12">
            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xl font-bold">
                  CHAP<span className="text-primary">CAM</span>.COM
                </p>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  Plateforme d’intelligence artificielle responsable.
                </p>
              </div>
              <nav aria-label="Liens juridiques" className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm sm:flex sm:flex-col">
                <Link href="/conditions" className="text-muted-foreground transition-colors hover:text-primary">
                  Conditions d’utilisation
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
                <a href="#signaler" className="text-muted-foreground transition-colors hover:text-primary">
                  Signaler un abus
                </a>
              </nav>
            </div>
            <div className="mt-10 border-t border-hairline pt-6 text-sm text-text-faint">
              © {new Date().getFullYear()} CHAPCAM.COM — Tous droits réservés.
            </div>
          </div>
        </footer>
      </div>
    </main>
  )
}

function SectionHeader({
  eyebrow,
  title,
  desc,
  id,
}: {
  eyebrow: string
  title: string
  desc?: string
  id?: string
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h2 id={id} className="mt-3 text-balance text-2xl font-bold tracking-tight md:text-3xl">
        {title}
      </h2>
      {desc && <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">{desc}</p>}
    </div>
  )
}

function InfoSection({
  eyebrow,
  title,
  icon: Icon,
  lead,
  children,
}: {
  eyebrow: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  lead?: string
  children: React.ReactNode
}) {
  return (
    <section aria-label={title}>
      <div className="rounded-3xl border border-hairline bg-card p-7 md:p-10">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
            <Icon className="h-6 w-6 text-primary" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
          </div>
        </div>
        <div className="mt-6">
          {lead && <p className="text-muted-foreground">{lead}</p>}
          {children}
        </div>
      </div>
    </section>
  )
}
