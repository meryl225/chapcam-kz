'use client'

import { useState } from 'react'
import { Download, KeyRound, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export function DesktopDownloadSection({ downloadUrl }: { downloadUrl: string }) {
  const [licenseKey, setLicenseKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)

  const openDownload = () => {
    window.open(downloadUrl, '_blank', 'noopener,noreferrer')
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
        setVerified(true)
        openDownload()
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
        <p className="mt-3 flex items-center gap-1.5 text-xs text-primary">
          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
          Licence valide — le telechargement a demarre.{' '}
          <button onClick={openDownload} className="underline underline-offset-2">
            Relancer
          </button>
        </p>
      )}

      <p className="mt-4 text-xs text-text-faint text-pretty">
        Logiciel Windows. Compatible GPU NVIDIA. Cle activable sur 1 PC.
      </p>
    </section>
  )
}
