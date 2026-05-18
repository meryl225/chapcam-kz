"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export function Header() {
  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-xl bg-[#0a0e1a]/80 border-b border-white/5"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo%20chapcam-Zg2rUUnOrSECjteElTxoU1rcYfwF3i.jpg"
              alt="ChapCam Logo"
              width={48}
              height={48}
              className="rounded-xl object-contain"
            />
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
          {["Accueil", "Comment ca marche", "Tarifs", "FAQ"].map((item, i) => (
            <Link 
              key={item}
              href={item === "Accueil" ? "/" : `#${item.toLowerCase().replace(/ /g, "-")}`} 
              className="text-white/80 hover:text-white transition-colors text-sm font-medium relative group"
            >
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r from-[#e91e8c] to-[#8b5cf6] group-hover:w-full transition-all duration-300" />
            </Link>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          <Button 
            className="bg-gradient-to-r from-[#e91e8c] to-[#8b5cf6] text-white border-0 px-6 py-2 rounded-full font-medium hover:opacity-90 transition-all hover:scale-105"
          >
            {"S'inscrire"}
          </Button>
          <Button 
            variant="outline"
            className="border-[#8b5cf6] text-white bg-transparent px-6 py-2 rounded-full font-medium hover:bg-[#8b5cf6]/20 transition-all hover:scale-105"
          >
            Connexion
          </Button>
        </div>
      </div>
    </motion.header>
  )
}
