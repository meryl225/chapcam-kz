"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { translations } from "./translations"
import { isFrancophoneCountry } from "@/lib/currency-map"

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

/**
 * Detection par la langue du NAVIGATEUR.
 * Le site n'existe qu'en FR et EN : on met du francais uniquement pour un
 * navigateur explicitement francophone ; TOUT le reste (anglais, espagnol,
 * allemand, arabe...) recoit l'anglais, langue internationale par defaut.
 * Renvoie null si aucun signal fiable (pour laisser la detection pays decider).
 */
function detectBrowserLang(): Lang | null {
  if (typeof navigator === "undefined") return null
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language]
  const list = langs.filter(Boolean).map((l) => l.toLowerCase())
  if (!list.length) return null
  if (list.some((l) => l.startsWith("fr"))) return "fr"
  return "en"
}

/**
 * Detection par le PAYS du visiteur via /api/geo (en-tetes de geolocalisation
 * Vercel). Pays francophone -> fr, sinon en. Renvoie null si le pays est inconnu
 * (ex. en local) pour ne pas ecraser la detection navigateur.
 */
async function detectCountryLang(): Promise<Lang | null> {
  try {
    const res = await fetch("/api/geo")
    if (!res.ok) return null
    const data = (await res.json()) as { country?: string | null }
    if (!data.country) return null
    return isFrancophoneCountry(data.country) ? "fr" : "en"
  } catch {
    return null
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // On demarre TOUJOURS en "fr" pour que le rendu serveur (html lang="fr")
  // corresponde au premier rendu client : aucune erreur d'hydratation.
  const [lang, setLangState] = useState<Lang>("fr")
  const [ready, setReady] = useState(false)

  // Apres le montage : choix memorise prioritaire, sinon detection automatique
  // (langue du navigateur d'abord, puis pays via /api/geo si besoin).
  useEffect(() => {
    let cancelled = false

    // 1) Choix explicite deja memorise : il prime toujours.
    let stored: Lang | null = null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      stored = raw === "en" || raw === "fr" ? raw : null
    } catch {
      stored = null
    }
    if (stored) {
      setLangState(stored)
      setReady(true)
      return
    }

    // 2) Detection navigateur (synchrone, fiable pour la preference de langue).
    const fromBrowser = detectBrowserLang()
    if (fromBrowser) {
      setLangState(fromBrowser)
      setReady(true)
      // Si le navigateur est deja francophone, inutile d'interroger le pays.
      if (fromBrowser === "fr") return
    }

    // 3) Affinage par pays (async) : couvre le cas d'un francophone dont le
    //    navigateur est configure en anglais mais qui navigue depuis un pays FR.
    detectCountryLang().then((fromCountry) => {
      if (cancelled) return
      if (fromCountry) setLangState(fromCountry)
      setReady(true)
    })

    return () => {
      cancelled = true
    }
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
