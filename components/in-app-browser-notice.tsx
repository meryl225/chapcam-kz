'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink, AlertTriangle, MoreVertical, Share } from 'lucide-react'
import { getMobilePlatform } from '@/lib/in-app-browser'

// Overlay affiche lorsqu'un client est dans un navigateur integre (TikTok,
// Instagram, Facebook, WhatsApp...) ou la page de paiement PayDunya ne se
// charge pas. On l'invite a ouvrir le lien dans son vrai navigateur.
export function InAppBrowserNotice({
  url,
  onClose,
}: {
  url: string
  onClose?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const platform = getMobilePlatform()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Repli : selection manuelle impossible via JS, on ne fait rien.
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl border border-hairline bg-card p-6 sm:rounded-3xl">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-500/15">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
          </span>
          <div>
            <h3 className="text-lg font-black text-foreground">Ouvre dans ton navigateur</h3>
            <p className="text-sm text-muted-foreground">
              Le paiement ne fonctionne pas dans cette application.
            </p>
          </div>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Tu es dans le navigateur interne d&apos;une application (TikTok, Instagram,
          Facebook...). La page de paiement ne s&apos;affiche pas ici. Ouvre le lien dans{' '}
          <span className="font-semibold text-foreground">
            {platform === 'ios' ? 'Safari' : platform === 'android' ? 'Chrome' : 'ton navigateur'}
          </span>{' '}
          pour payer en toute securite.
        </p>

        {/* Instructions selon la plateforme */}
        <div className="mb-5 rounded-2xl border border-hairline bg-secondary/50 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-text-faint">
            Comment faire
          </p>
          {platform === 'ios' ? (
            <ol className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Share className="h-4 w-4 flex-shrink-0 text-primary" />
                Touche l&apos;icone de partage ou les{' '}
                <MoreVertical className="inline h-4 w-4" /> en haut
              </li>
              <li>Choisis « Ouvrir dans Safari »</li>
            </ol>
          ) : (
            <ol className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <MoreVertical className="h-4 w-4 flex-shrink-0 text-primary" />
                Touche le menu (3 points) en haut a droite
              </li>
              <li>Choisis « Ouvrir dans le navigateur » ou « Chrome »</li>
            </ol>
          )}
          <p className="mt-3 text-xs text-text-faint">
            Ou copie le lien ci-dessous et colle-le dans Chrome / Safari.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={copy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-bold text-black transition-all hover:brightness-110"
          >
            {copied ? (
              <>
                <Check className="h-5 w-5" />
                Lien copie !
              </>
            ) : (
              <>
                <Copy className="h-5 w-5" />
                Copier le lien de paiement
              </>
            )}
          </button>

          {/* Tentative d'ouverture directe (fonctionne sur certains webviews) */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-hairline bg-secondary py-3 font-semibold text-foreground transition-colors hover:border-primary"
          >
            <ExternalLink className="h-4 w-4" />
            Essayer d&apos;ouvrir directement
          </a>

          {onClose && (
            <button
              onClick={onClose}
              className="w-full py-2 text-sm text-text-faint transition-colors hover:text-muted-foreground"
            >
              Annuler
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
