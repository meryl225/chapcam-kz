'use client'

import { useState } from 'react'
import { Download, KeyRound, Loader2, CheckCircle2, AlertCircle, Apple, Monitor } from 'lucide-react'

export function DesktopDownloadSection() {
  const [licenseKey, setLicenseKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)
  // Les liens de telechargement ne sont connus du navigateur QU'APRES une
  // validation serveur reussie de la cle de licence (reponse de l'API). Ils ne
  // sont jamais rendus dans le HTML de la page pour un visiteur non paye.
  const [downloadUrl, setDownloadUrl] = useState('')
  const [macDownloadUrl, setMacDownloadUrl] = useState('')

  const openDownload = (url: string) => {
    if (!url) {
      setError('Le lien de telechargement est momentanement indisponible. Reessaie plus tard ou contacte le support sur chapcam.com.')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const verifyAndDownload = async () => {
    setError(null)
    if (!licenseKey.trim()) {
      setError('Entre ta cle de licence.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/desktop/license-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: licenseKey }),
      })
      const data = await res.json()
      if (res.ok && data.valid) {
        const win = String(data.downloadUrl || '')
        const mac = String(data.macDownloadUrl || '')
        setDownloadUrl(win)
        setMacDownloadUrl(mac)
        setVerified(true)
        // Si une seule plateforme est disponible, on lance directement.
        if (!mac) openDownload(win)
      } else {
        setError(data.message || 'Cle de licence invalide.')
      }
    } catch {
      setError('Erreur de connexion. Reessaie.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      aria-label="Deja client ChapCam PC"
      className="rounded-2xl border border-hairline bg-card p-6 md:p-8"
    >
      <div className="mb-1 flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Deja client ?</h2>
      </div>
      <p className="mb-5 text-sm text-muted-foreground text-pretty">
        Entre la cle de licence recue par email pour telecharger ChapCam PC.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={licenseKey}
          onChange={(e) => {
            setLicenseKey(e.target.value)
            setVerified(false)
            setError(null)
            setDownloadUrl('')
            setMacDownloadUrl('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') verifyAndDownload()
          }}
          placeholder="CHAPCAM-XXXX-XXXX-XXXX-XXXX"
          aria-label="Cle de licence"
          className="w-full flex-1 rounded-xl border border-hairline bg-background px-4 py-3 font-mono text-sm uppercase tracking-wider text-foreground outline-none transition-colors placeholder:text-text-faint focus:border-primary/50"
        />
        <button
          onClick={verifyAndDownload}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-black transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Download className="h-4 w-4" />
              Telecharger
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
      {verified && !error && (
        <div className="mt-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs text-primary">
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
            Licence valide — choisis ta version.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => openDownload(downloadUrl)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-black transition-colors hover:bg-primary/90"
            >
              <Monitor className="h-4 w-4" />
              Telecharger pour Windows
            </button>
            {macDownloadUrl && (
              <button
                onClick={() => openDownload(macDownloadUrl)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-hairline bg-background px-5 py-3 font-bold text-foreground transition-colors hover:bg-card"
              >
                <Apple className="h-4 w-4" />
                Telecharger pour MacBook
              </button>
            )}
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-text-faint text-pretty">
        Compatible Windows et MacBook. Cle activable sur 1 ordinateur.
      </p>
    </section>
  )
}
