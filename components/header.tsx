"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Globe, ChevronDown } from "lucide-react"

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
            { name: "Produit", href: "#comment-ca-marche", caret: true },
            { name: "Fonctionnalités", href: "#comment-ca-marche" },
            { name: "Tarifs", href: "#tarifs" },
            { name: "Ressources", href: "#faq", caret: true },
            { name: "API", href: "/download" },
            { name: "Entreprise", href: "#founder" },
          ].map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-white/70 hover:text-white transition-colors text-sm font-medium relative group inline-flex items-center gap-1"
            >
              {item.name}
              {item.caret && <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] group-hover:w-full transition-all duration-300" />
            </Link>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          {/* Selecteur de langue FR */}
          <button
            type="button"
            className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <Globe className="w-4 h-4" />
            FR
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {/* Se connecter - contour */}
          <Link href="/auth/login">
            <Button
              variant="ghost"
              className="rounded-full border border-white/10 bg-transparent px-5 py-2 font-medium text-white transition-colors hover:border-white/20 hover:bg-white/5"
            >
              Se connecter
            </Button>
          </Link>

          {/* S'inscrire gratuitement - degrade bleu -> violet */}
          <Link href="/auth/sign-up">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button className="rounded-full border-0 bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] px-5 py-2 font-semibold text-white shadow-[0_0_25px_-4px_rgba(139,92,246,0.6)] transition-all hover:brightness-110 hover:shadow-[0_0_32px_-4px_rgba(0,212,255,0.7)]">
                {"S'inscrire gratuitement"}
              </Button>
            </motion.div>
          </Link>
        </div>
      </div>
    </motion.header>
  )
}
