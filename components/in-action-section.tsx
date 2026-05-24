"use client"

import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Play, ArrowRight } from "lucide-react"

export function InActionSection() {
  const [isHovering, setIsHovering] = useState(false)
  const sliderPosition = useMotionValue(50)
  const clipPath = useTransform(sliderPosition, (value) => `inset(0 ${100 - value}% 0 0)`)

  // Auto-animate the slider
  useEffect(() => {
    if (!isHovering) {
      const animation = animate(sliderPosition, [30, 70, 30], {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      })
      return () => animation.stop()
    }
  }, [isHovering, sliderPosition])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isHovering) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      sliderPosition.set(Math.max(10, Math.min(90, x)))
    }
  }

  // Platform logos as SVG components
  const platforms = [
    { name: "WhatsApp", color: "#25D366" },
    { name: "Telegram", color: "#0088cc" },
    { name: "Zoom", color: "#2D8CFF" },
    { name: "TikTok", color: "#ff0050" },
  ]

  return (
    <section className="relative py-24 px-6 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#00ff88]/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#00ff88]/5 rounded-full blur-[80px]" />
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
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-[#00ff88]/10 border border-[#00ff88]/30 px-4 py-2 rounded-full mb-6"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-[#00ff88]"
            />
            <span className="text-[#00ff88] font-semibold text-sm tracking-wide">EN ACTION</span>
          </motion.div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
            Regardez ChapCam{" "}
            <span className="text-[#00ff88]">transformer</span>
            <br />
            en temps reel
          </h2>

          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            Transformation du visage et du corps entier • Mouvements naturels • Sans delai
          </p>
        </motion.div>

        {/* Split-screen transformation visual */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative mb-12"
        >
          {/* Main container with glow */}
          <div className="relative mx-auto max-w-4xl">
            {/* Outer glow */}
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 60px rgba(0,255,136,0.2)",
                  "0 0 100px rgba(0,255,136,0.4)",
                  "0 0 60px rgba(0,255,136,0.2)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 rounded-3xl"
            />

            {/* Image container */}
            <div
              className="relative aspect-[16/10] rounded-3xl overflow-hidden border border-[#00ff88]/30 bg-black cursor-ew-resize"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onMouseMove={handleMouseMove}
            >
              {/* AFTER image (bottom layer) */}
              <div className="absolute inset-0">
                <Image
                  src="/images/transform-after.jpg"
                  alt="Apres transformation"
                  fill
                  className="object-cover"
                  priority
                />
                {/* AFTER label */}
                <div className="absolute top-6 right-6 bg-[#00ff88] text-black px-4 py-2 rounded-full font-bold text-sm">
                  APRES
                </div>
              </div>

              {/* BEFORE image (top layer with clip) */}
              <motion.div className="absolute inset-0" style={{ clipPath }}>
                <Image
                  src="/images/transform-before.jpg"
                  alt="Avant transformation"
                  fill
                  className="object-cover"
                  priority
                />
                {/* AVANT label */}
                <div className="absolute top-6 left-6 bg-white/90 text-black px-4 py-2 rounded-full font-bold text-sm">
                  AVANT
                </div>
              </motion.div>

              {/* Slider line */}
              <motion.div
                className="absolute top-0 bottom-0 w-1 bg-[#00ff88] z-10"
                style={{ left: useTransform(sliderPosition, (v) => `${v}%`) }}
              >
                {/* Slider handle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-[#00ff88] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,255,136,0.6)]">
                  <div className="flex items-center gap-1">
                    <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-r-[8px] border-transparent border-r-black" />
                    <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-l-[8px] border-transparent border-l-black" />
                  </div>
                </div>

                {/* Glow effect on line */}
                <div className="absolute inset-0 w-1 bg-[#00ff88] blur-md" />
              </motion.div>

              {/* Scan line effect */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(90deg, transparent, rgba(0,255,136,0.1), transparent)`,
                  left: useTransform(sliderPosition, (v) => `${v - 10}%`),
                  width: "20%",
                }}
              />
            </div>

            {/* Instruction text */}
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1 }}
              className="text-center text-gray-500 text-sm mt-4"
            >
              Survolez et deplacez pour comparer
            </motion.p>
          </div>
        </motion.div>

        {/* Platform logos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mb-12"
        >
          <p className="text-gray-400 mb-6 text-lg">Fonctionne pendant tes appels video</p>

          <div className="flex items-center justify-center gap-8 flex-wrap">
            {platforms.map((platform, index) => (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.1, y: -5 }}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:shadow-lg"
                  style={{
                    backgroundColor: `${platform.color}20`,
                    boxShadow: `0 0 20px ${platform.color}00`,
                  }}
                >
                  <PlatformIcon name={platform.name} color={platform.color} />
                </div>
                <span className="text-gray-500 text-sm group-hover:text-white transition-colors">
                  {platform.name}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center"
        >
          <Link href="/auth/sign-up">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-block relative group">
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 bg-[#00ff88] rounded-full blur-xl opacity-40"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />

              <Button className="relative bg-[#00ff88] hover:bg-[#00ff88]/90 text-black font-bold text-lg px-10 py-7 rounded-full transition-all flex items-center gap-3">
                <Play className="w-5 h-5 fill-current" />
                Essayer la demo maintenant
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

// Platform icon component
function PlatformIcon({ name, color }: { name: string; color: string }) {
  const icons: Record<string, JSX.Element> = {
    WhatsApp: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill={color}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    Telegram: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill={color}>
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
    Zoom: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill={color}>
        <path d="M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12zm-6.857-3.77v5.545c0 .394-.226.727-.54.903l-4.603 3.066V7.256l4.603 3.066c.314.176.54.509.54.903v.005zM6 8.228v7.544c0 .628.51 1.138 1.138 1.138h6.724c.628 0 1.138-.51 1.138-1.138V8.228c0-.628-.51-1.138-1.138-1.138H7.138C6.51 7.09 6 7.6 6 8.228z" />
      </svg>
    ),
    TikTok: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill={color}>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  }

  return icons[name] || null
}
