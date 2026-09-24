"use client"

import { useLanguage } from "@/lib/i18n/language-provider"

/**
 * Bascule FR / EN en un clic, a placer dans le header.
 * Affiche deux segments ; le segment actif est mis en avant.
 *
 * `variant` : "dark" (defaut) pour les en-tetes sombres, "light" pour les
 * fonds clairs (ex. page d'accueil) ou le texte inactif doit rester lisible.
 */
export function LanguageToggle({
  className = "",
  variant = "dark",
}: {
  className?: string
  variant?: "dark" | "light"
}) {
  const { lang, setLang } = useLanguage()
  const light = variant === "light"

  const container = light
    ? "border-[#d5e4f1] bg-white/65"
    : "border-white/10 bg-white/5"
  const inactive = light
    ? "text-[#53637c] hover:text-[#10234d]"
    : "text-white/60 hover:text-white"
  const active =
    "bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] text-white shadow-[0_0_16px_-4px_rgba(0,212,255,0.7)]"

  return (
    <div
      role="group"
      aria-label="Choix de la langue"
      className={`inline-flex items-center rounded-full border p-0.5 text-xs font-bold ${container} ${className}`}
    >
      <button
        type="button"
        onClick={() => setLang("fr")}
        aria-pressed={lang === "fr"}
        className={`rounded-full px-2.5 py-1 transition-colors ${lang === "fr" ? active : inactive}`}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`rounded-full px-2.5 py-1 transition-colors ${lang === "en" ? active : inactive}`}
      >
        EN
      </button>
    </div>
  )
}
