import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { SecurityProvider } from '@/components/security-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { LanguageProvider } from '@/lib/i18n/language-provider'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://chapcam.com'),
  title: 'ChapCam - Face Swap en Temps Reel',
  description: 'Transforme instantanement ton apparence pendant tes streams, appels WhatsApp, Telegram, Zoom, Teams et autres plateformes video.',
  // Icone du site (onglet navigateur + resultats Google). On force l'icone
  // ChapCam pour remplacer l'icone Vercel par defaut.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/chapcam-icon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-icon.jpg',
  },
}

// viewportFit: 'cover' est indispensable pour que les env(safe-area-inset-*)
// (notch iPhone, Dynamic Island, decoupes Android) soient exploitables par le
// mode plein ecran mobile du Live Swap. N'affecte pas le rendu desktop.
export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="bg-background" suppressHydrationWarning>
      <head>
        {/* Filet de securite anti-page-vide + auto-recuperation (script inline,
            donc independant du bundle applicatif).
            1) REVEAL : revele le contenu critique masque par les animations
               d'entree si le JS principal tarde a s'hydrater (mobile lent).
               Voir la regle .mo-ready dans globals.css.
            2) AUTO-RECUPERATION : si un chunk JS de _next echoue a charger
               (typiquement un HTML en cache qui pointe vers un ANCIEN build
               apres un redeploiement -> 404 -> hydratation impossible -> page
               qui reste bloquee sur le fond sombre), on recharge UNE seule fois
               (garde-fou sessionStorage) pour recuperer un HTML frais qui
               reference les bons chunks. Evite le blocage "pendant des heures". */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){function r(){try{document.documentElement.classList.add('mo-ready')}catch(e){}}setTimeout(r,1500);window.addEventListener('load',function(){setTimeout(r,300)});window.addEventListener('error',function(e){try{var t=e&&e.target;var src=(t&&(t.src||t.href))||'';var isChunk=/ChunkLoadError|Loading chunk/.test((e&&e.message)||'')||(t&&t.tagName==='SCRIPT'&&/\\/_next\\//.test(src));if(isChunk){r();var last=+(sessionStorage.getItem('cc_chunk_reload')||0);if(Date.now()-last>30000){sessionStorage.setItem('cc_chunk_reload',String(Date.now()));location.reload()}}}catch(_){}}, true)})();",
          }}
        />
        {/* Google AdSense : validation de la propriete du site + diffusion des annonces.
            Injecte sur toutes les pages, dans le <head>, comme demande par AdSense. */}
        <Script
          id="google-adsense"
          async
          strategy="afterInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3679882038307653"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <LanguageProvider>
            <SecurityProvider>
              {children}
            </SecurityProvider>
          </LanguageProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
