'use client'

import { useState } from 'react'

/**
 * Logo de marque d'un service (WhatsApp, Telegram, Apple...).
 * Source : theSVG.org (logos officiels). Fond blanc arrondi pour rester lisible
 * sur fond sombre, y compris pour les logos noirs (Apple, X). Retombe sur les
 * initiales si l'image ne charge pas.
 */
export function ServiceLogo({
  logo,
  label,
  variant = 'default',
  size = 40,
  className = '',
}: {
  logo: string
  label: string
  variant?: string
  size?: number
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const dim = `${size}px`

  if (failed) {
    return (
      <span
        className={`flex items-center justify-center rounded-xl bg-blue-500/15 text-sm font-bold text-blue-300 ${className}`}
        style={{ width: dim, height: dim }}
        aria-hidden="true"
      >
        {label.slice(0, 2)}
      </span>
    )
  }

  return (
    <span
      className={`flex items-center justify-center overflow-hidden rounded-xl bg-white ${className}`}
      style={{ width: dim, height: dim }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://thesvg.org/icons/${logo}/${variant}.svg`}
        alt={`Logo ${label}`}
        width={size - 12}
        height={size - 12}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ width: size - 12, height: size - 12, objectFit: 'contain' }}
      />
    </span>
  )
}
