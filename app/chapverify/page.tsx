"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  ShieldCheck,
  Upload,
  ScanFace,
  Gauge,
  ImageIcon,
  AudioLines,
  Video,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
} from "lucide-react"
import { Header } from "@/components/header"
import { SiteFooter } from "@/components/site-footer"

export default function ChapVerifyLandingPage() {
  const steps = [
    {
      icon: Upload,
      title: "1. Dépose ton fichier",
      text: "Importe une image, un enregistrement vocal ou une vidéo qui te paraît suspecte.",
    },
    {
      icon: ScanFace,
      title: "2. Analyse par l'IA",
      text: "ChapVerify inspecte les artefacts de synthèse invisibles à l'œil nu, image par image et sur la voix.",
    },
    {
      icon: Gauge,
      title: "3. Verdict clair",
      text: "Tu obtiens un résultat authentique ou deepfake, accompagné d'un score de confiance en pourcentage.",
    },
  ]

  const medias = [
    {
      icon: ImageIcon,
      title: "Images",
      text: "Photos de profil, captures, visages générés ou retouchés par IA.",
    },
    {
      icon: AudioLines,
      title: "Voix",
      text: "Messages vocaux et clonages de voix utilisés dans les arnaques.",
    },
    {
      icon: Video,
      title: "Vidéos",
      text: "Face-swaps et vidéos manipulées diffusées sur les réseaux.",
    },
  ]

  const useCases = [
    "Vérifier l'identité d'un correspondant avant une transaction",
    "Confirmer qu'une vidéo virale n'est pas truquée",
    "Détecter une arnaque au clonage de voix",
    "Protéger ta marque et ta réputation en ligne",
  ]

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0e1a] text-white">
      {/* Fond global sombre + halos rouges */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a0d10] via-[#0a0e1a] to-[#0a0e1a]" />
        <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-[#dc2626]/20 blur-[130px]" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-[#ef4444]/10 blur-[130px]" />
      </div>

      <div className="relative z-10">
        <Header />

        {/* ===== HERO ===== */}
        <section className="mx-auto max-w-5xl px-6 pb-16 pt-32 text-center md:pt-40">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dc2626]/40 bg-[#dc2626]/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-[#f87171]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ef4444]" />
              Anti-deepfake
            </span>

            <span className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#dc2626] shadow-[0_20px_50px_-12px_#dc2626]">
              <span className="absolute inset-0 rounded-3xl ring-2 ring-[#ef4444]/50 [animation:ping_2.5s_ease-in-out_infinite]" />
              <ShieldCheck className="h-11 w-11" strokeWidth={2.2} />
            </span>

            <h1 className="text-balance text-4xl font-extrabold leading-tight md:text-6xl">
              Chap<span className="text-[#ef4444]">Verify</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-gray-300 md:text-xl">
              Le détecteur de deepfake de ChapCam. En un clic, sache si une image, une voix ou une vidéo a été
              générée ou manipulée par intelligence artificielle.
            </p>

            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
              <Link
                href="/dashboard/chapverify"
                className="group inline-flex items-center gap-2.5 rounded-2xl bg-[#dc2626] px-8 py-4 text-base font-bold text-white shadow-[0_16px_40px_-12px_#dc2626] transition-all duration-300 hover:bg-[#ef4444] hover:shadow-[0_20px_50px_-12px_#ef4444]"
              >
                <ShieldCheck className="h-5 w-5" />
                Essayer ChapVerify
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#comment"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-7 py-4 text-base font-semibold text-white/90 backdrop-blur transition-colors hover:border-white/30 hover:bg-white/10"
              >
                Comment ça marche
              </a>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-[#f87171]" /> Analyse privée &amp; sécurisée
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#f87171]" /> Résultat en quelques secondes
              </span>
            </div>
          </motion.div>
        </section>

        {/* ===== QU'EST-CE QUE CHAPVERIFY ===== */}
        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid gap-6 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-8"
            >
              <h2 className="text-2xl font-bold md:text-3xl">
                Qu&apos;est-ce que <span className="text-[#ef4444]">ChapVerify</span> ?
              </h2>
              <p className="mt-4 leading-relaxed text-gray-300">
                Les deepfakes sont de plus en plus réalistes : visages échangés, voix clonées, vidéos truquées. Ils
                servent aux arnaques, à l&apos;usurpation d&apos;identité et à la désinformation.
              </p>
              <p className="mt-4 leading-relaxed text-gray-300">
                ChapVerify est l&apos;outil de vérification de ChapCam. Il analyse ton fichier avec une IA de détection
                spécialisée et te dit, preuve à l&apos;appui, s&apos;il s&apos;agit d&apos;un contenu authentique ou
                d&apos;un faux généré par IA.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col justify-center gap-4 rounded-3xl border border-[#dc2626]/30 bg-gradient-to-br from-[#1a0d10] to-[#0a0e1a] p-8"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 shrink-0 text-[#f87171]" />
                <p className="text-sm text-gray-300">
                  <span className="font-semibold text-white">Un doute ?</span> Ne partage jamais d&apos;argent ni de
                  données sensibles avant d&apos;avoir vérifié.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-[#f87171]" />
                <p className="text-sm text-gray-300">
                  <span className="font-semibold text-white">Verdict fiable</span> avec un score de confiance clair,
                  pour décider en confiance.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 shrink-0 text-[#f87171]" />
                <p className="text-sm text-gray-300">
                  <span className="font-semibold text-white">Intégré à ton compte</span> ChapCam, comme tes autres
                  outils premium.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== COMMENT CA MARCHE ===== */}
        <section id="comment" className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-3xl font-bold md:text-4xl">Comment ça marche</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-gray-400">
            Trois étapes simples, un résultat en quelques secondes.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 transition-colors hover:border-[#dc2626]/40"
              >
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dc2626]/15 text-[#f87171]">
                  <step.icon className="h-6 w-6" />
                </span>
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ===== CE QUE CA DETECTE ===== */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-3xl font-bold md:text-4xl">Ce que ChapVerify détecte</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {medias.map((m, i) => (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#120a0c] p-7"
              >
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#dc2626]/10 blur-2xl transition-opacity group-hover:opacity-100" />
                <span className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dc2626] text-white shadow-[0_10px_30px_-10px_#dc2626]">
                  <m.icon className="h-7 w-7" />
                </span>
                <h3 className="relative text-xl font-bold">{m.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-gray-300">{m.text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ===== CAS D'USAGE ===== */}
        <section className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-center text-3xl font-bold md:text-4xl">Quand l&apos;utiliser</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {useCases.map((uc, i) => (
              <motion.div
                key={uc}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#ef4444]" />
                <span className="text-sm leading-relaxed text-gray-200">{uc}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ===== CTA FINAL ===== */}
        <section className="mx-auto max-w-5xl px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl border border-[#dc2626]/40 bg-gradient-to-br from-[#1a0d10] to-[#0a0e1a] p-10 text-center md:p-14"
          >
            <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[#dc2626]/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-[#ef4444]/15 blur-3xl" />
            <div className="relative">
              <h2 className="text-balance text-3xl font-extrabold md:text-4xl">
                Prêt à démasquer les deepfakes ?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-pretty text-gray-300">
                Connecte-toi à ton compte ChapCam et lance ta première vérification en quelques secondes.
              </p>
              <Link
                href="/dashboard/chapverify"
                className="group mt-8 inline-flex items-center gap-2.5 rounded-2xl bg-[#dc2626] px-8 py-4 text-base font-bold text-white shadow-[0_16px_40px_-12px_#dc2626] transition-all duration-300 hover:bg-[#ef4444] hover:shadow-[0_20px_50px_-12px_#ef4444]"
              >
                <ShieldCheck className="h-5 w-5" />
                Essayer ChapVerify
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </motion.div>
        </section>

        <SiteFooter />
      </div>
    </main>
  )
}
