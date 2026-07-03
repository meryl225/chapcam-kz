import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  Phone, MessageSquareLock, Globe, ShieldCheck, Download,
  ArrowLeft, Star, Users, Zap, Headset, Check,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'ChapSim - Numéros Virtuels, SMS OTP & Proxies Premium',
  description:
    'Recevez vos OTP instantanément, achetez des numéros virtuels dans +180 pays et utilisez des proxies premium résidentiels & sécurisés avec ChapSim.',
}

const CHAPSIM_URL = 'https://chapsim.app/'

const FEATURES = [
  {
    icon: Phone,
    title: 'Numéros virtuels',
    desc: '+ de 180 pays disponibles pour créer et vérifier tes comptes.',
  },
  {
    icon: MessageSquareLock,
    title: 'Réception SMS OTP',
    desc: 'Livraison instantanée de tes codes de vérification.',
  },
  {
    icon: Globe,
    title: 'Proxies Premium',
    desc: 'Proxies résidentiels & IP statiques rapides et fiables.',
  },
  {
    icon: ShieldCheck,
    title: 'Sécurisé & fiable',
    desc: 'Connexion rapide, privée et stable, à tout moment.',
  },
]

const STATS = [
  { icon: Users, value: '10K+', label: 'Utilisateurs satisfaits' },
  { icon: Star, value: '4,8', label: 'Sur Google Play' },
  { icon: Zap, value: 'Rapide', label: 'Installation rapide' },
  { icon: Headset, value: '24/7', label: 'Support' },
]

const BENEFITS = [
  'Numéros virtuels dans plus de 180 pays',
  'Réception des SMS OTP en quelques secondes',
  'Proxies résidentiels et IP statiques premium',
  'Recharge simple par jetons, sans engagement',
]

export default function ChapSimPage() {
  return (
    <main className="min-h-screen bg-[#0a0a1f] text-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0a1f]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] shadow-lg shadow-[#7c3aed]/30">
              <Phone className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              Chap<span className="text-[#a78bfa]">Sim</span>
            </span>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Retour à ChapCam
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-[#7c3aed]/25 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#a78bfa]/30 bg-[#7c3aed]/10 px-3 py-1 text-xs font-semibold text-[#c4b5fd]">
              Numéros virtuels & proxies premium
            </span>
            <h1 className="mt-4 text-balance text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              Numéros virtuels,{' '}
              <span className="bg-gradient-to-r from-[#a78bfa] to-[#818cf8] bg-clip-text text-transparent">
                SMS OTP
              </span>{' '}
              et Proxies Premium
            </h1>
            <p className="mt-4 max-w-md text-pretty leading-relaxed text-slate-400">
              Recevez vos OTP instantanément, achetez des numéros dans plus de 180 pays
              et naviguez avec des proxies rapides et sécurisés. Le tout dans une seule
              application : ChapSim.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href={CHAPSIM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#7c3aed]/30 transition-all hover:brightness-110"
              >
                <Download className="h-5 w-5" />
                Télécharger ChapSim
              </a>
              <a
                href={CHAPSIM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/5"
              >
                <Globe className="h-5 w-5" /> Ouvrir chapsim.app
              </a>
            </div>

            <ul className="mt-7 grid gap-2.5">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-2.5 text-sm text-slate-300">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7c3aed]/20">
                    <Check className="h-3 w-3 text-[#a78bfa]" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-tr from-[#7c3aed]/20 to-[#4f46e5]/10 blur-2xl" />
            <div className="overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/50">
              <Image
                src="/chapsim/presentation.jpg"
                alt="Aperçu de l'application ChapSim : numéros virtuels, SMS OTP et proxies premium"
                width={1280}
                height={640}
                className="h-auto w-full"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-[#a78bfa]/30"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7c3aed]/15">
                <f.icon className="h-5 w-5 text-[#a78bfa]" />
              </span>
              <h3 className="mt-4 text-base font-bold text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1.5 text-center">
              <s.icon className="h-5 w-5 text-[#a78bfa]" />
              <span className="text-xl font-extrabold text-white">{s.value}</span>
              <span className="text-xs text-slate-400">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-[#a78bfa]/20 bg-gradient-to-br from-[#1a1140] to-[#0d0a24] p-8 text-center md:p-12">
          <div className="pointer-events-none absolute -top-16 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-[#7c3aed]/25 blur-3xl" />
          <h2 className="text-balance text-2xl font-extrabold text-white md:text-3xl">
            Prêt à créer et vérifier tes comptes en toute sécurité ?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-pretty text-slate-400">
            Télécharge ChapSim et obtiens ton premier numéro virtuel en quelques secondes.
          </p>
          <a
            href={CHAPSIM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] px-8 py-4 text-sm font-bold text-white shadow-lg shadow-[#7c3aed]/30 transition-all hover:brightness-110"
          >
            <Download className="h-5 w-5" />
            Télécharger ChapSim maintenant
          </a>
        </div>
      </section>
    </main>
  )
}
