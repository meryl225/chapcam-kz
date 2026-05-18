"use client"

import { motion } from "framer-motion"
import { UserPlus, Sparkles, Video } from "lucide-react"

const steps = [
  {
    number: 1,
    title: "Inscris-toi",
    description: "Cree ton compte et accede instantanement a ChapCam.",
    icon: UserPlus,
    color: "#8b5cf6",
    glowColor: "rgba(139,92,246,0.5)"
  },
  {
    number: 2,
    title: "Choisis ton apparence",
    description: "Selectionne le visage et le corps que tu veux utiliser en temps reel.",
    icon: Sparkles,
    color: "#00d4ff",
    glowColor: "rgba(0,212,255,0.5)"
  },
  {
    number: 3,
    title: "Lance ton stream ou appel",
    description: "Utilise ChapCam sur toutes tes plateformes preferees en temps reel.",
    icon: Video,
    color: "#22c55e",
    glowColor: "rgba(34,197,94,0.5)"
  }
]

const platforms = [
  { 
    name: "WhatsApp", 
    color: "#25D366", 
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    )
  },
  { 
    name: "Telegram", 
    color: "#0088cc", 
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    )
  },
  { 
    name: "Zoom", 
    color: "#2D8CFF", 
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12zm-5.1-3.8c-.1-.1-.3-.2-.4-.2h-2.4c-.8 0-1.5.7-1.5 1.5v4.5c0 .8.7 1.5 1.5 1.5h2.4c.2 0 .3-.1.4-.2l2.1-2.1c.2-.2.2-.6 0-.8l-2.1-4.2zm-4.9.3H6c-.6 0-1 .4-1 1v5c0 .6.4 1 1 1h8c.6 0 1-.4 1-1v-5c0-.6-.4-1-1-1z"/>
      </svg>
    )
  },
  { 
    name: "Meet", 
    color: "#00897B", 
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M12 0C6.28 0 1.636 4.28.32 9.84L5.66 14.1V9.9c0-.99.81-1.8 1.8-1.8h9.6l4.62-4.02C19.68 1.68 16.08 0 12 0zm7.2 6.48L15.6 9.9v4.2l3.6 3.12v-4.8c0-.6.3-1.2.84-1.5l1.08-.72c.6-.42.78-1.2.42-1.86-.36-.54-1.08-.78-1.68-.48l-1.26.72c-.24.12-.48.3-.6.6zM2.4 12v4.8c0 .6.3 1.2.84 1.5l1.08.72c.6.42.78 1.2.42 1.86-.36.54-1.08.78-1.68.48L.18 19.38C.06 18.96 0 18.48 0 18V9.96L2.4 12zm4.2 6h9.6c.99 0 1.8-.81 1.8-1.8v-4.2l-4.62 4.02C15.48 18.12 13.8 19.2 12 19.2c-1.8 0-3.48-1.08-4.38-2.7L3.6 12.48V16.2c0 .99.81 1.8 1.8 1.8h1.2z"/>
      </svg>
    )
  },
  { 
    name: "Teams", 
    color: "#6264A7", 
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M20.625 8.073c.918 0 1.661-.768 1.661-1.715 0-.947-.744-1.715-1.661-1.715-.918 0-1.661.768-1.661 1.715 0 .947.743 1.715 1.661 1.715zm-1.178 1.392h3.074c.754 0 1.365.632 1.365 1.412v4.462c0 .78-.611 1.412-1.365 1.412h-.957c.012-.132.018-.265.018-.4V10.49c0-.395-.082-.77-.231-1.11a2.401 2.401 0 00-.926.086h-.978zm-3.555-2.715c1.255 0 2.272-1.052 2.272-2.349S17.147 2.052 15.892 2.052c-1.255 0-2.272 1.052-2.272 2.349s1.017 2.349 2.272 2.349zm1.98 2.016H12.99c-.956 0-1.73.8-1.73 1.788v5.797c0 .988.774 1.788 1.73 1.788h4.882c.956 0 1.73-.8 1.73-1.788v-5.797c0-.988-.774-1.788-1.73-1.788zm-8.34 9.687a5.5 5.5 0 01-.62.035H3.64c-.867 0-1.57-.727-1.57-1.623v-5.42c0-.896.703-1.623 1.57-1.623h1.65V8.79c-.547.28-.929.858-.929 1.527v5.797c0 .94.735 1.703 1.645 1.788l.127.55zm1.857-9.703c1.14 0 2.066-.956 2.066-2.134 0-1.18-.925-2.135-2.066-2.135-1.14 0-2.066.956-2.066 2.135 0 1.178.925 2.134 2.066 2.134z"/>
      </svg>
    )
  },
  { 
    name: "TikTok", 
    color: "#ff0050", 
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    )
  },
  { 
    name: "Facebook", 
    color: "#1877F2", 
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    )
  },
  { 
    name: "Discord", 
    color: "#5865F2", 
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
      </svg>
    )
  },
]

export function HowItWorksSection() {
  return (
    <section id="comment-ca-marche" className="relative py-24 px-6 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d1117]/80 to-transparent" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Title */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.div 
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#00d4ff]/20 to-[#8b5cf6]/20 border border-[#00d4ff]/30 px-6 py-2 rounded-full mb-6"
            animate={{ 
              boxShadow: [
                "0 0 20px rgba(0,212,255,0.2)",
                "0 0 40px rgba(0,212,255,0.4)",
                "0 0 20px rgba(0,212,255,0.2)"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <span className="text-[#00d4ff] text-sm font-semibold tracking-wider uppercase">Comment ca marche</span>
          </motion.div>
        </motion.div>

        {/* Timeline Glass Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Animated border */}
          <motion.div 
            className="absolute inset-0 rounded-3xl p-[1px]"
            style={{
              background: "linear-gradient(90deg, #00d4ff, #8b5cf6, #e91e8c, #22c55e, #00d4ff)",
              backgroundSize: "300% 100%"
            }}
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          />
          
          <div className="relative m-[1px] rounded-3xl bg-[#0d1525]/95 backdrop-blur-xl p-8 lg:p-12">
            {/* Internal glow effects */}
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-[#8b5cf6]/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-[#00d4ff]/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#22c55e]/5 rounded-full blur-[100px] pointer-events-none" />
            
            {/* Steps Timeline */}
            <div className="relative">
              <div className="grid lg:grid-cols-[1fr_1fr_1fr_1.2fr] gap-8 lg:gap-6 items-start">
                {steps.map((step, index) => (
                  <motion.div 
                    key={step.number}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.2 }}
                    className="flex flex-col items-center lg:items-start text-center lg:text-left group"
                  >
                    {/* Number badge */}
                    <motion.div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-5 relative"
                      style={{ backgroundColor: step.color }}
                      whileHover={{ scale: 1.1 }}
                      animate={{
                        boxShadow: [
                          `0 0 20px ${step.glowColor}`,
                          `0 0 40px ${step.glowColor}`,
                          `0 0 20px ${step.glowColor}`
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {step.number}
                    </motion.div>
                    
                    {/* Icon box */}
                    <motion.div 
                      className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 border relative overflow-hidden"
                      style={{ 
                        backgroundColor: `${step.color}15`,
                        borderColor: `${step.color}40`
                      }}
                      whileHover={{ scale: 1.05, borderColor: step.color }}
                    >
                      <step.icon className="w-9 h-9 relative z-10" style={{ color: step.color }} />
                      <motion.div 
                        className="absolute inset-0"
                        style={{ background: `radial-gradient(circle at center, ${step.color}20 0%, transparent 70%)` }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </motion.div>
                    
                    <h3 className="text-white font-bold text-xl mb-3">{step.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-xs">{step.description}</p>
                  </motion.div>
                ))}
                
                {/* Platform logos section */}
                <motion.div 
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="lg:pl-8 lg:border-l border-white/10"
                >
                  <h4 className="text-gray-600 text-sm font-medium mb-6 text-center lg:text-left">Compatible avec</h4>
                  <div className="bg-white rounded-2xl p-6 shadow-lg shadow-white/10">
                    <div className="grid grid-cols-4 gap-4">
                      {platforms.map((platform, i) => (
                        <motion.div
                          key={platform.name}
                          initial={{ opacity: 0, scale: 0.5 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.8 + i * 0.1 }}
                          whileHover={{ 
                            scale: 1.15, 
                            y: -5,
                          }}
                          className="flex flex-col items-center gap-2 cursor-pointer"
                        >
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300"
                            style={{ color: platform.color }}
                          >
                            {platform.icon}
                          </div>
                          <span className="text-gray-600 text-[10px] font-medium">{platform.name}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
