import { useSyncExternalStore } from 'react'
import * as SecureStore from 'expo-secure-store'
import { EN } from './en'

// French is the source language: UI strings are written in French in the code and
// translated at render time by exact match (or {n} template match) against EN.
export const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
]

const STORAGE_KEY = 'chapcam_language'

function deviceLanguage() {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || ''
    return locale.toLowerCase().startsWith('fr') ? 'fr' : 'en'
  } catch {
    return 'fr'
  }
}

let current = deviceLanguage()
const listeners = new Set()

SecureStore.getItemAsync(STORAGE_KEY)
  .then((saved) => {
    if ((saved === 'fr' || saved === 'en') && saved !== current) setCurrent(saved)
  })
  .catch(() => {})

function setCurrent(lang) {
  current = lang
  cache.clear()
  listeners.forEach((listener) => listener())
}

export function getLanguage() {
  return current
}

export function setLanguage(lang) {
  if (lang !== 'fr' && lang !== 'en') return
  SecureStore.setItemAsync(STORAGE_KEY, lang).catch(() => {})
  if (lang !== current) setCurrent(lang)
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useLanguage() {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage)
}

export function getLocale() {
  return current === 'en' ? 'en-US' : 'fr-FR'
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const TEMPLATES = Object.keys(EN)
  .filter((key) => /\{\d\}/.test(key))
  .map((key) => {
    const order = []
    const pattern = key.split(/(\{\d\})/).map((part) => {
      const m = part.match(/^\{(\d)\}$/)
      if (m) {
        order.push(m[1])
        return '([\\s\\S]*?)'
      }
      return escapeRegex(part)
    })
    return { regex: new RegExp(`^${pattern.join('')}$`), order, en: EN[key] }
  })
  // Most specific (longest literal text) first so "≈ {0} min restantes" wins over "{0}".
  .sort((a, b) => b.regex.source.length - a.regex.source.length)

const cache = new Map()

function lookup(core) {
  if (EN[core] !== undefined) return EN[core]
  const capitalized = core.charAt(0).toUpperCase() + core.slice(1)
  if (capitalized !== core && EN[capitalized] !== undefined) {
    const en = EN[capitalized]
    return en.charAt(0).toLowerCase() + en.slice(1)
  }
  for (const { regex, order, en } of TEMPLATES) {
    const match = core.match(regex)
    if (!match) continue
    const values = {}
    order.forEach((index, i) => { values[index] = match[i + 1] })
    // Translate captured fragments too (e.g. a plan name or a nested sentence).
    return en.replace(/\{(\d)\}/g, (_, index) => (values[index] !== undefined ? translate(values[index]) : ''))
  }
  return null
}

export function translate(text) {
  if (current === 'fr' || typeof text !== 'string' || !/[A-Za-zÀ-ÿ]/.test(text)) return text
  const cached = cache.get(text)
  if (cached !== undefined) return cached
  const leading = text.match(/^\s*/)[0]
  const trailing = text.slice(leading.length).match(/\s*$/)[0]
  const core = text.slice(leading.length, text.length - trailing.length).replace(/\s+/g, ' ')
  const en = lookup(core)
  const result = en == null ? text : leading + en + trailing
  if (cache.size > 2000) cache.clear()
  cache.set(text, result)
  return result
}

export const t = translate

export function translateChildren(children) {
  if (typeof children === 'string') return translate(children)
  if (Array.isArray(children)) {
    let changed = false
    const next = children.map((child) => {
      if (typeof child !== 'string') return child
      const translated = translate(child)
      if (translated !== child) changed = true
      return translated
    })
    return changed ? next : children
  }
  return children
}
