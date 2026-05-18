"use client"

import { ArrowRight, Zap, Shield, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FeatureList } from "@/components/feature-list"
import { PhoneMockup } from "@/components/phone-mockup"

export function HeroSection() {
  return (
    <section className="relative min-h-screen pt-24 pb-12 px-6">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top right cyan lines */}
        <div className="absolute top-20 right-20 w-40 h-40">
          <div className="absolute top-0 right-0 w-32 h-[2px] bg-gradient-to-l from-[#00d4ff] to-transparent" />
          <div className="absolute top-0 right-0 w-[2px] h-32 bg-gradient-to-b from-[#00d4ff] to-transparent" />
        </div>
        
        {/* Bottom left magenta lines */}
        <div className="absolute bottom-20 left-20 w-40 h-40">
          <div className="absolute bottom-0 left-0 w-32 h-[2px] bg-gradient-to-r from-[#e91e8c] to-transparent" />
          <div className="absolute bottom-0 left-0 w-[2px] h-32 bg-gradient-to-t from-[#e91e8c] to-transparent" />
        </div>

        {/* Dotted pattern right */}
        <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col gap-2">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-[#00d4ff]/30" />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_1.2fr_1fr] gap-8 items-center min-h-[calc(100vh-8rem)]">
        {/* Left - Features */}
        <div className="flex flex-col gap-6">
          {/* AI Live Badge */}
          <div className="inline-flex items-center gap-2 bg-[#e91e8c] px-4 py-2 rounded-full w-fit">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white font-semibold text-sm">AI LIVE</span>
          </div>

          <FeatureList />
        </div>

        {/* Center - Phone Mockup */}
        <div className="flex justify-center">
          <PhoneMockup />
        </div>

        {/* Right - CTA Content */}
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight text-balance">
            CHANGE DE VISAGE ET TON CORPS ENTIER{" "}
            <span className="gradient-text">EN TEMPS REEL.</span>
          </h1>
          
          <p className="text-muted-foreground text-lg leading-relaxed">
            Transforme instantanement ton apparence pendant tes streams, appels WhatsApp, Telegram, Zoom, Teams et autres plateformes video.
          </p>

          <Button className="btn-gradient text-white border-0 px-8 py-6 rounded-full font-semibold text-lg hover:opacity-90 transition-opacity w-fit flex items-center gap-3 group">
            Commencer maintenant
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>

          {/* Feature badges */}
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="w-4 h-4 text-[#fbbf24]" />
              <span className="text-sm">Temps reel</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Securise</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Monitor className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Haute qualite</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
