"use client"

import { motion } from "framer-motion"
import { Monitor, Video, Smartphone, CheckCircle, ArrowRight, Play } from "lucide-react"
import { useState } from "react"

const steps = [
  {
    id: 1,
    title: "Telecharger OBS Studio",
    description: "Installez OBS Studio gratuitement sur votre PC. C'est le logiciel qui permet de creer une camera virtuelle.",
    icon: Monitor,
    details: [
      "Allez sur obsproject.com",
      "Telechargez la version pour votre systeme (Windows/Mac)",
      "Installez OBS Studio"
    ]
  },
  {
    id: 2,
    title: "Configurer ChapCam dans OBS",
    description: "Ajoutez votre flux ChapCam comme source video dans OBS.",
    icon: Video,
    details: [
      "Ouvrez OBS Studio",
      "Cliquez sur '+' dans Sources",
      "Selectionnez 'Capture de fenetre'",
      "Choisissez la fenetre ChapCam"
    ]
  },
  {
    id: 3,
    title: "Demarrer la Camera Virtuelle",
    description: "Activez la camera virtuelle OBS pour l'utiliser dans vos appels.",
    icon: Play,
    details: [
      "Dans OBS, cliquez sur 'Demarrer la camera virtuelle'",
      "La camera virtuelle est maintenant active",
      "Elle apparaitra dans vos applications"
    ]
  },
  {
    id: 4,
    title: "Utiliser dans WhatsApp, Telegram, Zoom...",
    description: "Selectionnez la camera virtuelle OBS dans vos applications d'appel video.",
    icon: Smartphone,
    details: [
      "Ouvrez WhatsApp/Telegram/Zoom/Teams",
      "Allez dans les parametres video",
      "Selectionnez 'OBS Virtual Camera'",
      "Lancez votre appel video avec votre nouveau visage!"
    ]
  }
]

const apps = [
  { name: "WhatsApp", color: "#25D366" },
  { name: "Telegram", color: "#0088cc" },
  { name: "Zoom", color: "#2D8CFF" },
  { name: "Teams", color: "#6264A7" },
  { name: "Discord", color: "#5865F2" },
  { name: "TikTok Live", color: "#ff0050" },
]

export function TutorialSection() {
  const [activeStep, setActiveStep] = useState(1)
  const [showVideo, setShowVideo] = useState(false)

  return (
    <section className="py-24 relative" id="tutoriel">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30 mb-6">
            <Video className="w-4 h-4 text-[#00ff88]" />
            <span className="text-sm text-[#00ff88] font-medium">Guide d&apos;installation</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Comment utiliser ChapCam ?
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Configurez ChapCam en 4 etapes simples pour l&apos;utiliser avec WhatsApp, Telegram, Zoom et toutes vos applications d&apos;appel video
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Step List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                onClick={() => setActiveStep(step.id)}
                className={`p-6 rounded-2xl cursor-pointer transition-all duration-300 ${
                  activeStep === step.id
                    ? 'bg-[#00ff88]/10 border-2 border-[#00ff88]/50'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    activeStep === step.id ? 'bg-[#00ff88] text-black' : 'bg-white/10 text-white'
                  }`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-sm font-bold ${
                        activeStep === step.id ? 'text-[#00ff88]' : 'text-white/40'
                      }`}>
                        ETAPE {step.id}
                      </span>
                      {activeStep > step.id && (
                        <CheckCircle className="w-4 h-4 text-[#00ff88]" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">{step.title}</h3>
                    <p className="text-white/60 text-sm">{step.description}</p>
                  </div>
                  <ArrowRight className={`w-5 h-5 transition-transform ${
                    activeStep === step.id ? 'text-[#00ff88] translate-x-1' : 'text-white/30'
                  }`} />
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Right: Step Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="sticky top-24"
          >
            <div className="bg-gradient-to-br from-[#1a1f35] to-[#0d1117] rounded-3xl border border-white/10 overflow-hidden">
              {/* Video/Image Preview */}
              <div className="aspect-video bg-black/50 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-[#00ff88]/10 to-transparent" />
                
                {/* Placeholder for tutorial visual */}
                <div className="text-center p-8 relative z-10">
                  <div className="w-20 h-20 rounded-full bg-[#00ff88]/20 flex items-center justify-center mx-auto mb-4">
                    {(() => {
                      const StepIcon = steps[activeStep - 1].icon
                      return <StepIcon className="w-10 h-10 text-[#00ff88]" />
                    })()}
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">
                    Etape {activeStep}: {steps[activeStep - 1].title}
                  </h4>
                </div>
              </div>

              {/* Step Instructions */}
              <div className="p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Instructions:</h4>
                <ul className="space-y-3">
                  {steps[activeStep - 1].details.map((detail, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#00ff88]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-[#00ff88]">{index + 1}</span>
                      </div>
                      <span className="text-white/80">{detail}</span>
                    </motion.li>
                  ))}
                </ul>

                {/* Next Step Button */}
                {activeStep < steps.length && (
                  <button
                    onClick={() => setActiveStep(activeStep + 1)}
                    className="w-full mt-6 py-3 rounded-xl bg-[#00ff88] text-black font-semibold hover:bg-[#00dd77] transition-colors flex items-center justify-center gap-2"
                  >
                    Etape suivante
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {activeStep === steps.length && (
                  <div className="mt-6 p-4 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/30">
                    <p className="text-[#00ff88] text-center font-medium">
                      Vous etes pret a utiliser ChapCam!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Compatible Apps */}
            <div className="mt-6 p-6 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-sm text-white/60 mb-4 text-center">Fonctionne avec toutes ces applications:</p>
              <div className="flex flex-wrap justify-center gap-3">
                {apps.map((app) => (
                  <div
                    key={app.name}
                    className="px-4 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-2"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: app.color }}
                    />
                    <span className="text-sm text-white/80">{app.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
