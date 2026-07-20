'use client'

import { useEffect, useRef, useCallback } from 'react'

// Cle site publique Cloudflare Turnstile (a definir dans les variables d'env).
// Tant qu'elle est absente, le widget ne s'affiche pas et l'authentification
// fonctionne exactement comme avant (aucun jeton requis). Des qu'elle est
// definie ET que la protection CAPTCHA est activee dans Supabase, la barriere
// anti-bots devient active partout ou ce composant est utilise.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
    onloadTurnstileCallback?: () => void
  }
}

// Indique si la protection est configuree (utile aux formulaires appelants).
export const isTurnstileEnabled = Boolean(SITE_KEY)

let scriptLoading: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (scriptLoading) return scriptLoading

  scriptLoading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Turnstile load error')))
      return
    }
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    s.async = true
    s.defer = true
    s.dataset.turnstile = 'true'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Turnstile load error'))
    document.head.appendChild(s)
  })
  return scriptLoading
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  theme?: 'light' | 'dark' | 'auto'
}

// Widget CAPTCHA. Ne rend rien si la cle site n'est pas configuree.
export function TurnstileWidget({ onVerify, onExpire, theme = 'dark' }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onVerifyRef = useRef(onVerify)
  const onExpireRef = useRef(onExpire)

  onVerifyRef.current = onVerify
  onExpireRef.current = onExpire

  const render = useCallback(() => {
    if (!SITE_KEY || !containerRef.current || !window.turnstile) return
    if (widgetIdRef.current) return
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      theme,
      callback: (token: string) => onVerifyRef.current(token),
      'expired-callback': () => onExpireRef.current?.(),
      'error-callback': () => onExpireRef.current?.(),
    })
  }, [theme])

  useEffect(() => {
    if (!SITE_KEY) return
    let cancelled = false
    loadTurnstileScript()
      .then(() => {
        if (!cancelled) render()
      })
      .catch(() => {
        /* silencieux : en cas d'echec de chargement, on ne bloque pas l'UI */
      })
    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null
      }
    }
  }, [render])

  if (!SITE_KEY) return null

  return <div ref={containerRef} className="flex justify-center my-2" aria-label="Verification anti-robot" />
}
