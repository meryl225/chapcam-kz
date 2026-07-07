import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Eye, Cpu, Wifi, Infinity as InfinityIcon, ShieldCheck, Download, CreditCard, Mail, MonitorCog, Info } from 'lucide-react'
import { ChapCamPcCard } from '@/components/dashboard/hub/chapcam-pc-card'
import { ChapCamPcCountdown } from '@/components/chapcam-pc-countdown'
import { DesktopDownloadSection } from '@/components/desktop/desktop-download-section'
import { PC_OFFER } from '@/lib/pc-offer'

export const metadata: Metadata = {
  title: 'ChapCam PC — Logiciel Premium à vie',
  description:
    'ChapCam PC : face swap en temps reel sur ton GPU local, camera virtuelle, paiement unique a vie. Telecharge, paie une fois, recois ta cle de licence par email.',
}

const HIGHLIGHTS = [
  { icon: Cpu, title: 'GPU dedie requis', desc: 'PC avec carte graphique dediee (PC Gamer). Tourne sur ta carte, sans latence cloud.' },
  { icon: Wifi, title: 'Sans internet', desc: 'Fonctionne hors ligne apres installation.' },
  { icon: InfinityIcon, title: 'Licence a vie', desc: 'Un seul paiement, aucune mensualite.' },
  { icon: ShieldCheck, title: 'Camera virtuelle', desc: 'Compatible Zoom, Discord, WhatsApp, TikTok.' },
]

const STEPS = [
  { icon: Download, title: 'Telecharge', desc: 'Clique sur le bouton et lance le paiement securise.' },
  { icon: CreditCard, title: 'Paie une fois', desc: 'Paiement unique a vie via Mobile Money ou carte.' },
  { icon: Mail, title: 'Recois ta cle', desc: 'Ta cle de licence + le lien arrivent par email.' },
]

export default function ChapCamPcPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Barre de navigation haute */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-8 md:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tableau de bord
        </Link>
        <Link
          href="/desktop"
          className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Eye className="h-4 w-4" />
          Voir l&apos;interface
        </Link>
      </div>

      {/* HERO */}
      <section className="relative mx-auto max-w-6xl px-4 pt-10 md:px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          {/* Texte */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-400">
              <InfinityIcon className="h-3.5 w-3.5" />
              Logiciel premium · Licence a vie
            </div>

            <h1 className="mt-5 text-4xl font-black leading-[1.05] text-foreground text-balance md:text-5xl">
              ChapCam PC
              <span className="block bg-gradient-to-r from-primary to-emerald-300 bg-clip-text text-transparent">
                Logiciel a vie
              </span>
            </h1>

            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground text-pretty">
              Le face swap en temps reel le plus rapide, directement sur ton PC.
              Pas d&apos;abonnement, pas de cloud, pas de limites. Tu paies une seule fois.
            </p>

            <div className="mt-7">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-xl text-text-faint line-through">
                  {PC_OFFER.originalPrice.toLocaleString('fr-FR')} FCFA
                </span>
                <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">
                  -{PC_OFFER.discountPercent}%
                </span>
              </div>
              <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="text-5xl font-black text-primary">
                  {PC_OFFER.price.toLocaleString('fr-FR')}
                </span>
                <span className="pb-1.5 text-lg text-muted-foreground">FCFA</span>
                <span className="pb-1.5 text-sm text-text-faint">· une seule fois</span>
              </div>
            </div>

            <div className="mt-5 max-w-md">
              <ChapCamPcCountdown />
            </div>

            <div className="mt-5 flex max-w-md items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <MonitorCog className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <p className="text-sm leading-relaxed text-amber-200/90 text-pretty">
                <span className="font-bold text-amber-300">Config requise :</span>{' '}
                {PC_OFFER.requirement}
              </p>
            </div>

            <div className="mt-3 flex max-w-md items-start gap-3 rounded-xl border border-hairline bg-card p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                <span className="font-bold text-foreground">Qualite du rendu :</span>{' '}
                les performances du logiciel dependent de l&apos;etat de votre appareil
                (puissance du processeur, carte graphique, memoire), de votre connexion
                internet, de la qualite de l&apos;avatar choisi et de la lumiere de votre
                environnement. Plus ces elements sont bons, plus le swap est realiste et fluide.
              </p>
            </div>

            <div className="mt-6 max-w-md">
              <ChapCamPcCard />
            </div>
          </div>

          {/* Image produit */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl" aria-hidden />
            <div className="relative overflow-hidden rounded-2xl border border-hairline shadow-2xl shadow-primary/10">
              <Image
                src="/chapcam-pc-hero.png"
                alt="Setup gamer avec le logiciel ChapCam PC affichant un face swap en temps reel"
                width={900}
                height={700}
                className="h-full w-full object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* HIGHLIGHTS */}
      <section className="mx-auto mt-16 max-w-6xl px-4 md:px-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className="rounded-2xl border border-hairline bg-card p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15">
                <h.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-foreground">{h.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground text-pretty">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMMENT CA MARCHE */}
      <section className="mx-auto mt-16 max-w-6xl px-4 md:px-6">
        <h2 className="text-center text-2xl font-black text-foreground text-balance">
          Comment ca marche
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground text-pretty">
          Trois etapes simples, et le logiciel est a toi pour toujours.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-hairline bg-card p-6">
              <span className="absolute right-5 top-5 text-4xl font-black text-primary/15">
                {i + 1}
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                <s.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DEJA CLIENT */}
      <section className="mx-auto mt-16 max-w-6xl px-4 md:px-6">
        <DesktopDownloadSection />
      </section>

      {/* MENTION LEGALE */}
      <p className="mx-auto max-w-6xl px-4 pb-12 pt-8 text-center text-[11px] leading-relaxed text-text-faint md:px-6">
        Paiement unique. Aucun remboursement apres l&apos;achat.
      </p>
    </div>
  )
}
