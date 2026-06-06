"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { Linkedin, Twitter, Github } from "lucide-react"

export function FounderSection() {
  return (
    <section id="founder" className="relative py-24 px-6 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-[#00ff88]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-[#00ff88]/10 border border-[#00ff88]/30 px-4 py-2 rounded-full mb-6"
          >
            <span className="text-[#00ff88] font-semibold text-sm tracking-wide">FONDATEUR</span>
          </motion.div>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            La vision derriere <span className="text-[#00ff88]">ChapCam</span>
          </h2>
        </motion.div>

        {/* Founder card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02]">
            {/* Glow effect */}
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 40px rgba(0,255,136,0.1)",
                  "0 0 60px rgba(0,255,136,0.2)",
                  "0 0 40px rgba(0,255,136,0.1)",
                ],
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute inset-0 rounded-3xl"
            />

            <div className="relative p-2">
              {/* Founder image */}
              <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden">
                <Image
                  src="/images/founder-meryl-kacou.png"
                  alt="Meryl Kacou - CEO & Founder ChapCam"
                  fill
                  className="object-cover object-top"
                  priority
                />
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Info overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        Meryl Kacou
                      </h3>
                      <p className="text-[#00ff88] font-semibold text-lg mb-3">
                        CEO & Founder — ChapCam
                      </p>
                      <p className="text-gray-300 text-sm md:text-base max-w-xl">
                        Senior Developer & AI Builder focused on real-time face swap and immersive communication technologies.
                      </p>
                    </div>
                    
                    {/* Social links */}
                    <div className="hidden md:flex items-center gap-3">
                      <a
                        href="https://linkedin.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#00ff88]/20 border border-white/20 hover:border-[#00ff88]/50 flex items-center justify-center transition-all"
                      >
                        <Linkedin className="w-5 h-5 text-white" />
                      </a>
                      <a
                        href="https://twitter.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#00ff88]/20 border border-white/20 hover:border-[#00ff88]/50 flex items-center justify-center transition-all"
                      >
                        <Twitter className="w-5 h-5 text-white" />
                      </a>
                      <a
                        href="https://github.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#00ff88]/20 border border-white/20 hover:border-[#00ff88]/50 flex items-center justify-center transition-all"
                      >
                        <Github className="w-5 h-5 text-white" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
