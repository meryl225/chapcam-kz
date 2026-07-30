import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SecurityProvider } from '@/components/security-provider'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'ChapCam - Face Swap en Temps Reel',
  description: 'Transforme instantanement ton apparence pendant tes streams, appels WhatsApp, Telegram, Zoom, Teams et autres plateformes video.',
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
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SecurityProvider>
            {children}
          </SecurityProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
