'use client'

// Ecran de secours de dernier recours : capture les erreurs survenant dans le
// root layout (providers) et les erreurs d'hydratation non rattrapees ailleurs.
// Sans ce fichier, une telle erreur laissait l'utilisateur sur une page vide
// (uniquement le fond sombre). Ici on affiche un message clair + un bouton
// "Reessayer" et un rechargement complet, sans dependre du bundle applicatif.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(ellipse at top, #1a1f35, #0a0e1a 60%, #0a0e1a)',
          color: '#ffffff',
          fontFamily:
            'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              background: 'linear-gradient(90deg, #00ff88, #00d4ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 12,
            }}
          >
            ChapCam
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
            La page n&apos;a pas pu se charger
          </h1>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.7)',
              margin: '0 0 24px',
            }}
          >
            Une erreur temporaire est survenue, souvent liee a une connexion
            instable. Reessaie : la page se rechargera correctement.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => reset()}
              style={{
                appearance: 'none',
                border: 'none',
                cursor: 'pointer',
                background: '#00ff88',
                color: '#0a0e1a',
                fontWeight: 700,
                fontSize: 14,
                padding: '12px 22px',
                borderRadius: 12,
              }}
            >
              Reessayer
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') window.location.reload()
              }}
              style={{
                appearance: 'none',
                cursor: 'pointer',
                background: 'transparent',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 14,
                padding: '12px 22px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              Recharger la page
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
