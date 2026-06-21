"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import {
  Download,
  MessageCircle,
  MapPin,
  Headphones,
  ShieldCheck,
  Zap,
  Sparkles,
  Star,
  ArrowRight,
} from "lucide-react"

const WHATSAPP_URL = "https://wa.me/2250555560189"

const trustPoints = [
  { icon: Sparkles, label: "Visage remplacé avec précision" },
  { icon: Zap, label: "En direct, sans latence" },
  { icon: ShieldCheck, label: "100% privé et sécurisé" },
  { icon: Star, label: "Simple à utiliser" },
]

export default function CampagnePage() {
  return (
    <main className="min-h-screen bg-[#0a0e1a] overflow-hidden">
      <Header />

      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#102a1f] via-[#0a0e1a] to-[#0a0e1a]" />
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#00ff88]/20 blur-[120px]" />
      </div>

      <section className="relative z-10 px-6 pt-28 pb-16 md:pt-32">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          {/* Left: message */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#00ff88]/30 bg-[#00ff88]/10 px-4 py-1.5 text-sm font-medium text-[#00ff88]"
            >
              <Sparkles className="h-4 w-4" />
              Campagne ChapCam
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="mt-6 text-pretty text-4xl font-black leading-tight text-white md:text-5xl lg:text-6xl"
            >
              Tu veux changer ton apparence pendant tes{" "}
              <span className="text-[#00ff88]">appels vidéo</span> sur les réseaux sociaux ?
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-5 max-w-xl text-lg leading-relaxed text-white/70"
            >
              Utilise <span className="font-semibold text-white">ChapCam</span> : ton visage transformé en
              temps réel sur WhatsApp, Messenger, Zoom, TikTok Live et bien plus. Discret, naturel, instantané.
            </motion.p>

            {/* Install options */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mt-8 grid gap-3 sm:grid-cols-2"
            >
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#00ff88]/10">
                  <MapPin className="h-5 w-5 text-[#00ff88]" />
                </div>
                <div>
                  <p className="font-semibold text-white">Installation sur place</p>
                  <p className="text-sm text-white/60">Yopougon Niangon, station Texaco</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#00d4ff]/10">
                  <Headphones className="h-5 w-5 text-[#00d4ff]" />
                </div>
                <div>
                  <p className="font-semibold text-white">Assistance à distance</p>
                  <p className="text-sm text-white/60">On configure tout pour toi</p>
                </div>
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <Link href="/download">
                <Button className="group w-full bg-[#00ff88] py-6 text-base font-bold text-black hover:bg-[#00cc6a] sm:w-auto sm:px-8">
                  <Download className="mr-2 h-5 w-5" />
                  Télécharger ChapCam
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <Button
                  variant="outline"
                  className="w-full border-[#22c55e]/50 py-6 text-base font-semibold text-[#22c55e] hover:bg-[#22c55e]/10 sm:w-auto sm:px-8"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Nous écrire sur WhatsApp
                </Button>
              </a>
            </motion.div>

            {/* Trust points */}
            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3"
            >
              {trustPoints.map((point) => (
                <li key={point.label} className="flex items-center gap-2 text-sm text-white/70">
                  <point.icon className="h-4 w-4 flex-shrink-0 text-[#00ff88]" />
                  {point.label}
                </li>
              ))}
            </motion.ul>
          </div>

          {/* Right: testimonial visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative mx-auto w-full max-w-md"
          >
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-[#00ff88]/20 via-transparent to-[#00d4ff]/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/50">
              <Image
                src="/campagne/temoignage-chapcam.jpg"
                alt="Témoignage client ChapCam PC : interface de remplacement de visage et prévisualisation en direct"
                width={942}
                height={1632}
                priority
                className="h-auto w-full"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA band */}
      <section className="relative z-10 px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-4xl rounded-3xl border border-[#00ff88]/30 bg-gradient-to-r from-[#00ff88]/10 to-transparent p-8 text-center md:p-12"
        >
          <h2 className="text-balance text-2xl font-bold text-white md:text-3xl">
            Prêt à transformer tes appels vidéo ?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">
            Télécharge ChapCam maintenant. Besoin d&apos;aide pour l&apos;installer ? On s&apos;occupe de tout,
            sur place à Yopougon ou à distance.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/download">
              <Button className="w-full bg-[#00ff88] py-6 text-base font-bold text-black hover:bg-[#00cc6a] sm:w-auto sm:px-8">
                <Download className="mr-2 h-5 w-5" />
                Télécharger ChapCam
              </Button>
            </Link>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                className="w-full border-white/20 py-6 text-base font-semibold text-white hover:bg-white/10 sm:w-auto sm:px-8"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Parler à un conseiller
              </Button>
            </a>
          </div>
        </motion.div>
      </section>
    </main>
  )
}
