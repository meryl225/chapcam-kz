"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { MessageCircle } from "lucide-react"

export function Header() {
  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-xl bg-[#0a0e1a]/70 border-b border-white/5"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="relative w-12 h-12 flex items-center justify-center"
          >
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo%20chapcam-Zg2rUUnOrSECjteElTxoU1rcYfwF3i.jpg"
              alt="ChapCam Logo"
              width={48}
              height={48}
              className="rounded-xl object-contain"
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00d4ff]/20 to-[#e91e8c]/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-xl font-bold flex items-center gap-2">
              <span className="bg-gradient-to-r from-[#8b5cf6] via-[#00d4ff] via-[#22c55e] to-[#f97316] bg-clip-text text-transparent">ChapCam</span>
              <svg width="20" height="14" viewBox="0 0 20 14" fill="none" className="text-[#00d4ff]">
                <rect x="1" y="2" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M15 5L19 3V11L15 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="text-xs font-medium bg-gradient-to-r from-[#00d4ff] via-[#8b5cf6] to-[#e91e8c] bg-clip-text text-transparent tracking-wider">SWAP EN TEMPS REEL</span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { name: "Accueil", href: "/" },
            { name: "Comment ca marche", href: "#comment-ca-marche" },
            { name: "Roadmap", href: "#roadmap" },
            { name: "Tarifs", href: "#tarifs" },
            { name: "FAQ", href: "#faq" },
            { name: "Telecharger", href: "/download" },
            { name: "Founder", href: "#founder" }
          ].map((item) => (
            <Link 
              key={item.name}
              href={item.href} 
              className={`text-white/70 hover:text-white transition-colors text-sm font-medium relative group ${item.name === "Telecharger" ? "text-[#00ff88]" : ""} ${item.name === "Roadmap" ? "text-[#00d4ff]" : ""}`}
            >
              {item.name}
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r from-[#00d4ff] to-[#e91e8c] group-hover:w-full transition-all duration-300" />
            </Link>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          {/* WhatsApp Button */}
          <a href="https://wa.me/2250555560189" target="_blank" rel="noopener noreferrer">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                className="hidden lg:flex items-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white border-0 px-5 py-2 rounded-full font-medium transition-all shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>
            </motion.div>
          </a>
          
          {/* S'inscrire - Violet */}
          <Link href="/auth/sign-up">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-[#8b5cf6] rounded-full blur-lg opacity-50 animate-pulse" />
              <Button 
                className="relative bg-[#8b5cf6] hover:bg-[#7c3aed] text-white border-0 px-6 py-2 rounded-full font-semibold transition-all shadow-[0_0_25px_rgba(139,92,246,0.5)]"
              >
                {"S'inscrire"}
              </Button>
            </motion.div>
          </Link>
          
          {/* Connexion - Electric Blue */}
          <Link href="/auth/login">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-[#00d4ff] rounded-full blur-lg opacity-30" />
              <Button 
                className="relative bg-[#00d4ff] hover:bg-[#00b8e6] text-[#0a0e1a] border-0 px-6 py-2 rounded-full font-semibold transition-all shadow-[0_0_20px_rgba(0,212,255,0.4)]"
              >
                Connexion
              </Button>
            </motion.div>
          </Link>
        </div>
      </div>
    </motion.header>
  )
}
