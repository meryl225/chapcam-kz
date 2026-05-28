"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Apple, Monitor, ArrowLeft, Download, Shield, Zap, Cpu, CheckCircle } from "lucide-react"

// URLs des fichiers - GitHub Releases v1.0.0
const DOWNLOAD_URLS = {
  mac: "https://github.com/meryl225/chapcam-kz/releases/download/v1.0.0/ChapCam-1.0.0.dmg",
  macArm: "https://github.com/meryl225/chapcam-kz/releases/download/v1.0.0/ChapCam-1.0.0-arm64.dmg",
  windows: "https://github.com/meryl225/chapcam-kz/releases/download/v1.0.0/ChapCam.Setup.1.0.0.exe",
}

const features = [
  {
    icon: Zap,
    title: "Transformation temps reel",
    description: "Face swap instantane sans latence"
  },
  {
    icon: Monitor,
    title: "Camera virtuelle",
    description: "Utilisez ChapCam dans Zoom, Teams, WhatsApp"
  },
  {
    icon: Shield,
    title: "100% Prive",
    description: "Tout est traite localement sur votre PC"
  },
  {
    icon: Cpu,
    title: "GPU Accelere",
    description: "Utilise votre carte graphique pour des performances optimales"
  }
]

const requirements = {
  mac: [
    "macOS 10.15 (Catalina) ou plus recent",
    "4 GB RAM minimum (8 GB recommande)",
    "500 MB d'espace disque",
    "Webcam integree ou externe"
  ],
  windows: [
    "Windows 10 ou plus recent (64-bit)",
    "4 GB RAM minimum (8 GB recommande)", 
    "500 MB d'espace disque",
    "Webcam integree ou externe",
    "GPU NVIDIA recommande pour meilleures performances"
  ]
}

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-[#0a0e1a]">
      <Header />
      
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Back button */}
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour a l&apos;accueil
          </Link>

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-24 h-24 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#00ff88]/30"
            >
              <Download className="w-12 h-12 text-black" />
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
              Telecharger <span className="text-[#00ff88]">ChapCam Desktop</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              L&apos;application de face swap en temps reel pour votre ordinateur.
              Transformez-vous pendant vos appels video!
            </p>
          </motion.div>

          {/* Download buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid md:grid-cols-2 gap-6 mb-16"
          >
            {/* Mac Download */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-[#00ff88]/50 transition-colors">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center">
                  <Apple className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">macOS</h2>
                  <p className="text-gray-400">Pour Mac Intel & Apple Silicon</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <a href={DOWNLOAD_URLS.mac} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-[#00ff88] hover:bg-[#00cc6a] text-black font-bold py-6 text-lg">
                    <Download className="w-5 h-5 mr-2" />
                    Telecharger pour Mac Intel
                  </Button>
                </a>
                <a href={DOWNLOAD_URLS.macArm} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full border-[#00ff88]/50 text-[#00ff88] hover:bg-[#00ff88]/10 py-6 mt-2">
                    <Download className="w-5 h-5 mr-2" />
                    Mac Apple Silicon (M1/M2/M3)
                  </Button>
                </a>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-500 font-medium mb-2">Configuration requise:</p>
                {requirements.mac.map((req, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                    <CheckCircle className="w-4 h-4 text-[#00ff88]" />
                    {req}
                  </div>
                ))}
              </div>
            </div>

            {/* Windows Download */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-[#00ff88]/50 transition-colors">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center">
                  <Monitor className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Windows</h2>
                  <p className="text-gray-400">Pour Windows 10/11</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <a href={DOWNLOAD_URLS.windows} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-[#00ff88] hover:bg-[#00cc6a] text-black font-bold py-6 text-lg">
                    <Download className="w-5 h-5 mr-2" />
                    Telecharger pour Windows
                  </Button>
                </a>
                <p className="text-center text-sm text-gray-500">Version 64-bit uniquement</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-500 font-medium mb-2">Configuration requise:</p>
                {requirements.windows.map((req, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                    <CheckCircle className="w-4 h-4 text-[#00ff88]" />
                    {req}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              Pourquoi utiliser l&apos;application desktop?
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-6 text-center"
                >
                  <div className="w-12 h-12 bg-[#00ff88]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-[#00ff88]" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-400">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Installation guide */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-r from-[#00ff88]/10 to-transparent border border-[#00ff88]/30 rounded-2xl p-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Guide d&apos;installation</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-[#00ff88] mb-4">Mac</h3>
                <ol className="space-y-3 text-gray-300">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#00ff88] rounded-full flex items-center justify-center text-black text-sm font-bold">1</span>
                    <span>Ouvrez le fichier .dmg telecharge</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#00ff88] rounded-full flex items-center justify-center text-black text-sm font-bold">2</span>
                    <span>Glissez ChapCam dans le dossier Applications</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#00ff88] rounded-full flex items-center justify-center text-black text-sm font-bold">3</span>
                    <span>Ouvrez ChapCam et autorisez l&apos;acces a la camera</span>
                  </li>
                </ol>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-[#00ff88] mb-4">Windows</h3>
                <ol className="space-y-3 text-gray-300">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#00ff88] rounded-full flex items-center justify-center text-black text-sm font-bold">1</span>
                    <span>Executez le fichier .exe telecharge</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#00ff88] rounded-full flex items-center justify-center text-black text-sm font-bold">2</span>
                    <span>Suivez l&apos;assistant d&apos;installation</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#00ff88] rounded-full flex items-center justify-center text-black text-sm font-bold">3</span>
                    <span>Lancez ChapCam depuis le menu Demarrer</span>
                  </li>
                </ol>
              </div>
            </div>
          </motion.div>

          {/* Version info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center mt-12 text-gray-500"
          >
            <p>Version 1.0.0 | Derniere mise a jour: Mai 2026</p>
            <p className="mt-2">
              Besoin d&apos;aide? <a href="https://t.me/chapcam1" target="_blank" rel="noopener noreferrer" className="text-[#00ff88] hover:underline">Contactez-nous sur Telegram</a>
            </p>
          </motion.div>
        </div>
      </div>
    </main>
  )
}
