"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { LanguageToggle } from "@/components/language-toggle"
import { useT } from "@/lib/i18n/language-provider"

export function Header() {
  const t = useT()
  return (
    <motion.header 
      initial={false}
      className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.06] bg-[#050b16]/75 px-6 py-3 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
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
            <span className="text-xs font-medium bg-gradient-to-r from-[#00d4ff] via-[#8b5cf6] to-[#e91e8c] bg-clip-text text-transparent tracking-wider">{t("SWAP EN TEMPS REEL")}</span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden lg:flex items-center gap-5 xl:gap-6">
          {[
            { name: "Fonctionnalités", href: "#outils" },
            { name: "Tarifs", href: "#tarifs" },
            { name: "À propos", href: "#a-propos" },
            { name: "Blog", href: "/blog" },
          ].map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`whitespace-nowrap transition-colors text-sm font-medium relative group inline-flex items-center gap-1 ${item.name === "Tarifs" ? "rounded-full border border-[#168bd1] bg-[#138bd1] px-4 py-2 text-white shadow-[0_4px_14px_-6px_rgba(19,139,209,.9)] hover:border-[#0874b8] hover:bg-[#0874b8]" : "text-white/70 hover:text-white"}`}
            >
              {t(item.name)}
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] group-hover:w-full transition-all duration-300" />
            </Link>
          ))}

        </nav>

        {/* CTA Buttons */}
        <div className="flex shrink-0 items-center gap-2 xl:gap-3">
          {/* Bascule de langue FR / EN */}
          <LanguageToggle />


          {/* Se connecter - contour */}
          <Link href="/auth/login">
            <Button
              variant="ghost"
              className="rounded-full border border-white/10 bg-transparent px-5 py-2 font-medium text-white transition-colors hover:border-white/20 hover:bg-white/5"
            >
              {t("Se connecter")}
            </Button>
          </Link>

          {/* S'inscrire gratuitement - degrade bleu -> violet */}
          <Link href="/auth/sign-up">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button className="rounded-full border-0 bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] px-5 py-2 font-semibold text-white shadow-[0_0_25px_-4px_rgba(139,92,246,0.6)] transition-all hover:brightness-110 hover:shadow-[0_0_32px_-4px_rgba(0,212,255,0.7)]">
                {t("S'inscrire gratuitement")}
              </Button>
            </motion.div>
          </Link>
        </div>
      </div>
    </motion.header>
  )
}
