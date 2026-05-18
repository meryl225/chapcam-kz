"use client"

import Image from "next/image"

export function PhoneMockup() {
  return (
    <div className="relative">
      {/* Glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#00d4ff]/20 rounded-full blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#e91e8c]/10 rounded-full blur-[80px]" />
      
      {/* Holographic rings */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[280px] h-[40px]">
        <div className="w-full h-full rounded-[50%] border-2 border-[#00d4ff]/50 shadow-[0_0_20px_rgba(0,212,255,0.5)]" />
      </div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[280px] h-[40px]">
        <div className="w-full h-full rounded-[50%] border-2 border-[#e91e8c]/50 shadow-[0_0_20px_rgba(233,30,140,0.5)]" style={{ background: "linear-gradient(90deg, rgba(0,212,255,0.2), rgba(233,30,140,0.2))" }} />
      </div>

      {/* Phone frame */}
      <div className="relative w-[280px] h-[500px] mx-auto">
        {/* Phone border glow */}
        <div className="absolute inset-0 rounded-[40px] bg-gradient-to-b from-[#00d4ff]/30 via-transparent to-[#e91e8c]/30 p-[2px]">
          <div className="w-full h-full rounded-[40px] bg-[#111827] overflow-hidden">
            {/* Phone screen content */}
            <div className="relative w-full h-full flex flex-col items-center justify-center p-6">
              {/* Face with tracking points */}
              <div className="relative w-48 h-56 rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
                {/* Placeholder face silhouette */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Face shape */}
                    <div className="w-32 h-40 rounded-[50%_50%_45%_45%] bg-gradient-to-br from-[#8b6914] to-[#5a4510] relative">
                      {/* Eyes with tracking points */}
                      <div className="absolute top-14 left-6 w-4 h-4 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-[#00d4ff] animate-pulse shadow-[0_0_10px_rgba(0,212,255,0.8)]" />
                      </div>
                      <div className="absolute top-14 right-6 w-4 h-4 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-[#00d4ff] animate-pulse shadow-[0_0_10px_rgba(0,212,255,0.8)]" />
                      </div>
                      {/* Nose tracking */}
                      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#00ff88] animate-pulse shadow-[0_0_10px_rgba(0,255,136,0.8)]" />
                      {/* Smile */}
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-16 h-6 rounded-b-full bg-white/90" />
                    </div>
                    {/* Hair */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-36 h-20 rounded-t-full bg-[#1a1a1a]" />
                  </div>
                </div>
                
                {/* Name label */}
                <div className="absolute bottom-4 right-4 bg-[#0a0e1a]/80 px-3 py-1 rounded-full">
                  <span className="text-white text-sm font-medium">Alex</span>
                </div>
              </div>

              {/* Small preview faces */}
              <div className="absolute top-8 left-4 flex flex-col gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2a2a3e] to-[#1a1a2e] border border-[#00d4ff]/30 overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-6 h-7 rounded-full bg-gradient-to-br from-[#d4a574] to-[#8b6914]" />
                  </div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2a2a3e] to-[#1a1a2e] border border-[#8b5cf6]/30 overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-6 h-7 rounded-full bg-gradient-to-br from-[#f4c7ab] to-[#d4a574]" />
                  </div>
                </div>
              </div>

              {/* Color picker bar */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1">
                <div className="w-6 h-3 rounded-sm bg-[#ff6b6b]" />
                <div className="w-6 h-3 rounded-sm bg-[#feca57]" />
                <div className="w-6 h-3 rounded-sm bg-[#48dbfb]" />
                <div className="w-6 h-3 rounded-sm bg-[#ff9ff3]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom app icon */}
      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-xl bg-[#111827] border border-[#1e3a5f] flex items-center justify-center">
          <svg width="24" height="14" viewBox="0 0 28 16" fill="none">
            <path d="M7 8C7 11.866 10.134 15 14 15C17.866 15 21 11.866 21 8" stroke="url(#g1)" strokeWidth="2" strokeLinecap="round"/>
            <path d="M7 8C7 4.13401 10.134 1 14 1C17.866 1 21 4.13401 21 8" stroke="url(#g2)" strokeWidth="2" strokeLinecap="round"/>
            <defs>
              <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00d4ff"/>
                <stop offset="100%" stopColor="#8b5cf6"/>
              </linearGradient>
              <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6"/>
                <stop offset="100%" stopColor="#e91e8c"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span className="text-xs text-muted-foreground">ChapCam</span>
        
        {/* Swap button */}
        <div className="flex items-center gap-2 bg-[#111827] border border-[#1e3a5f] px-6 py-3 rounded-full">
          <span className="w-3 h-3 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-white text-sm font-medium">Swap en temps reel</span>
        </div>
      </div>
    </div>
  )
}
