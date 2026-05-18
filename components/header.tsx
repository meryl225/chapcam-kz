"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#00d4ff] via-[#8b5cf6] to-[#e91e8c] p-[2px]">
              <div className="w-full h-full rounded-xl bg-[#0a0e1a] flex items-center justify-center">
                <svg width="28" height="16" viewBox="0 0 28 16" fill="none" className="text-white">
                  <path d="M7 8C7 11.866 10.134 15 14 15C17.866 15 21 11.866 21 8" stroke="url(#gradient1)" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M7 8C7 4.13401 10.134 1 14 1C17.866 1 21 4.13401 21 8" stroke="url(#gradient2)" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M1 8C1 11.866 4.13401 15 8 15" stroke="url(#gradient1)" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M20 1C23.866 1 27 4.13401 27 8C27 11.866 23.866 15 20 15" stroke="url(#gradient2)" strokeWidth="2" strokeLinecap="round"/>
                  <defs>
                    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00d4ff"/>
                      <stop offset="100%" stopColor="#8b5cf6"/>
                    </linearGradient>
                    <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6"/>
                      <stop offset="100%" stopColor="#e91e8c"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-white flex items-center gap-2">
              ChapCam
              <svg width="20" height="14" viewBox="0 0 20 14" fill="none" className="text-[#00d4ff]">
                <rect x="1" y="2" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M15 5L19 3V11L15 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="text-xs font-medium gradient-text tracking-wider">SWAP EN TEMPS REEL</span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-white/90 hover:text-white transition-colors text-sm font-medium">
            Accueil
          </Link>
          <Link href="#comment" className="text-white/90 hover:text-white transition-colors text-sm font-medium">
            Comment ca marche
          </Link>
          <Link href="#tarifs" className="text-white/90 hover:text-white transition-colors text-sm font-medium">
            Tarifs
          </Link>
          <Link href="#faq" className="text-white/90 hover:text-white transition-colors text-sm font-medium">
            FAQ
          </Link>
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          <Button 
            className="btn-gradient text-white border-0 px-6 py-2 rounded-full font-medium hover:opacity-90 transition-opacity"
          >
            {"S'inscrire"}
          </Button>
          <Button 
            variant="outline"
            className="border-[#8b5cf6] text-white bg-transparent px-6 py-2 rounded-full font-medium hover:bg-[#8b5cf6]/10 transition-colors"
          >
            Connexion
          </Button>
        </div>
      </div>
    </header>
  )
}
