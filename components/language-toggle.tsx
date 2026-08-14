"use client"

import { useLanguage } from "@/lib/i18n/language-provider"

/**
 * Bascule FR / EN en un clic, a placer dans le header.
 * Affiche deux segments ; le segment actif est mis en avant.
 */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLanguage()

  return (
    <div
      role="group"
      aria-label="Choix de la langue"
      className={`inline-flex items-center rounded-full border border-white/10 bg-white/5 p-0.5 text-xs font-bold ${className}`}
    >
      <button
        type="button"
        onClick={() => setLang("fr")}
        aria-pressed={lang === "fr"}
        className={`rounded-full px-2.5 py-1 transition-colors ${
          lang === "fr"
            ? "bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] text-white shadow-[0_0_16px_-4px_rgba(0,212,255,0.7)]"
            : "text-white/60 hover:text-white"
        }`}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`rounded-full px-2.5 py-1 transition-colors ${
          lang === "en"
            ? "bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] text-white shadow-[0_0_16px_-4px_rgba(0,212,255,0.7)]"
            : "text-white/60 hover:text-white"
        }`}
      >
        EN
      </button>
    </div>
  )
}
