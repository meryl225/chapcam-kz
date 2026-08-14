"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { translations } from "./translations"

export type Lang = "fr" | "en"

const STORAGE_KEY = "chapcam-lang"

interface LanguageContextValue {
  /** Langue active. Toujours "fr" au premier rendu (SSR + hydratation). */
  lang: Lang
  /** Change la langue et memorise le choix. */
  setLang: (lang: Lang) => void
  /** Bascule FR <-> EN. */
  toggle: () => void
  /**
   * Traduit une chaine. La cle EST le texte francais (source).
   * - En FR : renvoie le texte tel quel.
   * - En EN : renvoie la traduction du dictionnaire, ou le francais en repli.
   */
  t: (fr: string) => string
  /** Indique si la detection cote client a eu lieu (evite le flash). */
  ready: boolean
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function detectBrowserLang(): Lang {
  if (typeof navigator === "undefined") return "fr"
  const nav = navigator.languages?.[0] || navigator.language || "fr"
  return nav.toLowerCase().startsWith("en") ? "en" : "fr"
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // On demarre TOUJOURS en "fr" pour que le rendu serveur (html lang="fr")
  // corresponde au premier rendu client : aucune erreur d'hydratation.
  const [lang, setLangState] = useState<Lang>("fr")
  const [ready, setReady] = useState(false)

  // Apres le montage : on applique le choix memorise, sinon la langue du navigateur.
  useEffect(() => {
    let initial: Lang = "fr"
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null
      initial = stored === "en" || stored === "fr" ? stored : detectBrowserLang()
    } catch {
      initial = detectBrowserLang()
    }
    setLangState(initial)
    setReady(true)
  }, [])

  // Reflete la langue sur <html lang> pour l'accessibilite et le SEO.
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang
    }
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* stockage indisponible : on ignore */
    }
  }, [])

  const toggle = useCallback(() => {
    setLang(lang === "fr" ? "en" : "fr")
  }, [lang, setLang])

  const t = useCallback(
    (fr: string) => {
      if (lang === "fr") return fr
      return translations[fr] ?? fr
    },
    [lang],
  )

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, t, ready }}>
      {children}
    </LanguageContext.Provider>
  )
}

/** Hook complet (langue + setters + traduction). */
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error("useLanguage doit etre utilise a l'interieur de <LanguageProvider>")
  }
  return ctx
}

/** Hook raccourci qui renvoie uniquement la fonction de traduction. */
export function useT(): (fr: string) => string {
  return useLanguage().t
}
