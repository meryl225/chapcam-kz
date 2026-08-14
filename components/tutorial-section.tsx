"use client"

import { motion } from "framer-motion"
import { Monitor, Video, Smartphone, CheckCircle, ArrowRight, Play, Download } from "lucide-react"
import { useState } from "react"
import { useT } from "@/lib/i18n/language-provider"

// Guide OBS - Pour Zoom, Teams, Discord, TikTok Live, etc.
const obsSteps = [
  {
    id: 1,
    title: "Telecharger OBS Studio",
    description: "Installez OBS Studio gratuitement sur votre PC.",
    icon: Download,
    details: [
      "Allez sur obsproject.com",
      "Telechargez la version pour votre systeme (Windows/Mac)",
      "Installez OBS Studio"
    ]
  },
  {
    id: 2,
    title: "Configurer ChapCam dans OBS",
    description: "Ajoutez votre flux ChapCam comme source video.",
    icon: Monitor,
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
    description: "Activez la camera virtuelle OBS.",
    icon: Play,
    details: [
      "Dans OBS, cliquez sur 'Demarrer la camera virtuelle'",
      "La camera virtuelle est maintenant active",
      "Elle apparaitra dans vos applications"
    ]
  },
  {
    id: 4,
    title: "Utiliser dans Zoom, Teams, Discord...",
    description: "Selectionnez 'OBS Virtual Camera' dans vos apps.",
    icon: Video,
    details: [
      "Ouvrez Zoom, Teams, Discord ou TikTok Live",
      "Allez dans les parametres video",
      "Selectionnez 'OBS Virtual Camera'",
      "Lancez votre appel avec votre nouveau visage!"
    ]
  }
]

// Guide NDI - Specifique pour WhatsApp et Telegram
const ndiSteps = [
  {
    id: 1,
    title: "Telecharger NDI Tools",
    description: "NDI cree une camera virtuelle compatible WhatsApp.",
    icon: Download,
    details: [
      "Allez sur ndi.tv/tools",
      "Telechargez 'NDI Tools' pour Windows ou Mac",
      "Installez NDI Tools (inclut NDI Virtual Input)"
    ]
  },
  {
    id: 2,
    title: "Lancer ChapCam en mode NDI",
    description: "Activez la sortie NDI dans ChapCam.",
    icon: Monitor,
    details: [
      "Ouvrez ChapCam et demarrez votre swap",
      "Dans les parametres, activez 'Sortie NDI'",
      "ChapCam diffuse maintenant en NDI"
    ]
  },
  {
    id: 3,
    title: "Configurer NDI Virtual Input",
    description: "Selectionnez ChapCam comme source NDI.",
    icon: Play,
    details: [
      "Ouvrez 'NDI Virtual Input' (barre des taches)",
      "Cliquez droit sur l'icone NDI",
      "Selectionnez 'ChapCam' comme source",
      "La camera virtuelle NDI est active"
    ]
  },
  {
    id: 4,
    title: "Utiliser dans WhatsApp ou Telegram",
    description: "Selectionnez 'NDI Video' dans vos apps.",
    icon: Smartphone,
    details: [
      "Ouvrez WhatsApp Desktop ou Telegram",
      "Lancez un appel video",
      "Dans les parametres camera, selectionnez 'NDI Video'",
      "Votre visage transforme apparait dans l'appel!"
    ]
  }
]

const obsApps = [
  { name: "Zoom", color: "#2D8CFF" },
  { name: "Teams", color: "#6264A7" },
  { name: "Discord", color: "#5865F2" },
  { name: "TikTok Live", color: "#ff0050" },
  { name: "Google Meet", color: "#00897B" },
  { name: "Skype", color: "#00AFF0" },
]

const ndiApps = [
  { name: "WhatsApp", color: "#25D366" },
  { name: "Telegram", color: "#0088cc" },
  { name: "Signal", color: "#3A76F0" },
  { name: "Messenger", color: "#0084FF" },
]

export function TutorialSection() {
  const t = useT()
  const [activeTab, setActiveTab] = useState<'obs' | 'ndi'>('ndi')
  const [activeStep, setActiveStep] = useState(1)

  const currentSteps = activeTab === 'obs' ? obsSteps : ndiSteps
  const currentApps = activeTab === 'obs' ? obsApps : ndiApps
  const downloadUrl = activeTab === 'obs' ? 'https://obsproject.com' : 'https://ndi.tv/tools/'
  const downloadText = activeTab === 'obs' ? t('Telecharger OBS Studio') : t('Telecharger NDI Tools')

  return (
    <section className="py-24 relative" id="guide">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30 mb-6">
            <Video className="w-4 h-4 text-[#00ff88]" />
            <span className="text-sm text-[#00ff88] font-medium">{t("Guides d'installation")}</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t("Comment utiliser ChapCam ?")}
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            {t("Choisissez le guide adapte a votre utilisation")}
          </p>
        </motion.div>

        {/* Tab Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center mb-12"
        >
          <div className="inline-flex bg-white/5 rounded-2xl p-2 border border-white/10">
            <button
              onClick={() => { setActiveTab('ndi'); setActiveStep(1); }}
              className={`px-6 py-4 rounded-xl font-semibold transition-all ${
                activeTab === 'ndi'
                  ? 'bg-[#25D366] text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5" />
                <div className="text-left">
                  <div className="text-sm font-bold">{t("Guide WhatsApp")}</div>
                  <div className={`text-xs ${activeTab === 'ndi' ? 'text-white/80' : 'text-white/40'}`}>
                    {t("Avec NDI (Recommande)")}
                  </div>
                </div>
              </div>
            </button>
            <button
              onClick={() => { setActiveTab('obs'); setActiveStep(1); }}
              className={`px-6 py-4 rounded-xl font-semibold transition-all ${
                activeTab === 'obs'
                  ? 'bg-[#2D8CFF] text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5" />
                <div className="text-left">
                  <div className="text-sm font-bold">{t("Guide General")}</div>
                  <div className={`text-xs ${activeTab === 'obs' ? 'text-white/80' : 'text-white/40'}`}>
                    {t("Avec OBS Studio")}
                  </div>
                </div>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          key={activeTab}
          className={`max-w-3xl mx-auto mb-12 p-4 rounded-2xl border ${
            activeTab === 'ndi' 
              ? 'bg-[#25D366]/10 border-[#25D366]/30' 
              : 'bg-[#2D8CFF]/10 border-[#2D8CFF]/30'
          }`}
        >
          <p className={`text-center ${activeTab === 'ndi' ? 'text-[#25D366]' : 'text-[#2D8CFF]'}`}>
            {activeTab === 'ndi' 
              ? t("NDI est recommande pour WhatsApp et Telegram car OBS Virtual Camera n'est pas compatible avec ces applications.")
              : t("OBS est ideal pour les appels video sur Zoom, Teams, Discord et le streaming sur TikTok Live.")
            }
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
            key={`steps-${activeTab}`}
          >
            {currentSteps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                onClick={() => setActiveStep(step.id)}
                className={`p-6 rounded-2xl cursor-pointer transition-all duration-300 ${
                  activeStep === step.id
                    ? activeTab === 'ndi'
                      ? 'bg-[#25D366]/10 border-2 border-[#25D366]/50'
                      : 'bg-[#2D8CFF]/10 border-2 border-[#2D8CFF]/50'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    activeStep === step.id 
                      ? activeTab === 'ndi' ? 'bg-[#25D366] text-white' : 'bg-[#2D8CFF] text-white'
                      : 'bg-white/10 text-white'
                  }`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-sm font-bold ${
                        activeStep === step.id 
                          ? activeTab === 'ndi' ? 'text-[#25D366]' : 'text-[#2D8CFF]'
                          : 'text-white/40'
                      }`}>
                        {t("ETAPE")} {step.id}
                      </span>
                      {activeStep > step.id && (
                        <CheckCircle className={`w-4 h-4 ${activeTab === 'ndi' ? 'text-[#25D366]' : 'text-[#2D8CFF]'}`} />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">{t(step.title)}</h3>
                    <p className="text-white/60 text-sm">{t(step.description)}</p>
                  </div>
                  <ArrowRight className={`w-5 h-5 transition-transform ${
                    activeStep === step.id 
                      ? activeTab === 'ndi' ? 'text-[#25D366] translate-x-1' : 'text-[#2D8CFF] translate-x-1'
                      : 'text-white/30'
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
            key={`details-${activeTab}`}
          >
            <div className="bg-gradient-to-br from-[#1a1f35] to-[#0d1117] rounded-3xl border border-white/10 overflow-hidden">
              {/* Video/Image Preview */}
              <div className="aspect-video bg-black/50 relative flex items-center justify-center">
                <div className={`absolute inset-0 ${
                  activeTab === 'ndi' ? 'bg-gradient-to-br from-[#25D366]/10 to-transparent' : 'bg-gradient-to-br from-[#2D8CFF]/10 to-transparent'
                }`} />
                
                <div className="text-center p-8 relative z-10">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    activeTab === 'ndi' ? 'bg-[#25D366]/20' : 'bg-[#2D8CFF]/20'
                  }`}>
                    {(() => {
                      const StepIcon = currentSteps[activeStep - 1].icon
                      return <StepIcon className={`w-10 h-10 ${activeTab === 'ndi' ? 'text-[#25D366]' : 'text-[#2D8CFF]'}`} />
                    })()}
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">
                    {t("Etape")} {activeStep}: {t(currentSteps[activeStep - 1].title)}
                  </h4>
                </div>
              </div>

              {/* Step Instructions */}
              <div className="p-6">
                <h4 className="text-lg font-semibold text-white mb-4">{t("Instructions:")}</h4>
                <ul className="space-y-3">
                  {currentSteps[activeStep - 1].details.map((detail, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        activeTab === 'ndi' ? 'bg-[#25D366]/20' : 'bg-[#2D8CFF]/20'
                      }`}>
                        <span className={`text-xs font-bold ${activeTab === 'ndi' ? 'text-[#25D366]' : 'text-[#2D8CFF]'}`}>
                          {index + 1}
                        </span>
                      </div>
                      <span className="text-white/80">{t(detail)}</span>
                    </motion.li>
                  ))}
                </ul>

                {/* Next Step Button */}
                {activeStep < currentSteps.length && (
                  <button
                    onClick={() => setActiveStep(activeStep + 1)}
                    className={`w-full mt-6 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                      activeTab === 'ndi' 
                        ? 'bg-[#25D366] text-white hover:bg-[#20bd5a]' 
                        : 'bg-[#2D8CFF] text-white hover:bg-[#2577e0]'
                    }`}
                  >
                    {t("Etape suivante")}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {activeStep === currentSteps.length && (
                  <div className={`mt-6 p-4 rounded-xl border ${
                    activeTab === 'ndi' 
                      ? 'bg-[#25D366]/10 border-[#25D366]/30' 
                      : 'bg-[#2D8CFF]/10 border-[#2D8CFF]/30'
                  }`}>
                    <p className={`text-center font-medium ${activeTab === 'ndi' ? 'text-[#25D366]' : 'text-[#2D8CFF]'}`}>
                      {t("Vous etes pret a utiliser ChapCam!")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Compatible Apps */}
            <div className="mt-6 p-6 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-sm text-white/60 mb-4 text-center">
                {activeTab === 'ndi' ? t('Compatible avec:') : t('Ideal pour:')}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {currentApps.map((app) => (
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

            {/* Download Link */}
            <div className={`mt-4 p-4 rounded-2xl border text-center ${
              activeTab === 'ndi' 
                ? 'bg-[#25D366]/10 border-[#25D366]/30' 
                : 'bg-[#2D8CFF]/10 border-[#2D8CFF]/30'
            }`}>
              <p className="text-sm text-white/80 mb-3">{t("Telecharger gratuitement:")}</p>
              <a 
                href={downloadUrl}
                target="_blank" 
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-xl transition-colors ${
                  activeTab === 'ndi' 
                    ? 'bg-[#25D366] text-white hover:bg-[#20bd5a]' 
                    : 'bg-[#2D8CFF] text-white hover:bg-[#2577e0]'
                }`}
              >
                <Download className="w-5 h-5" />
                {downloadText}
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
