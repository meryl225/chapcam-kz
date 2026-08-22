import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { SecurityProvider } from '@/components/security-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { LanguageProvider } from '@/lib/i18n/language-provider'
import './globals.css'

// display: 'swap' => le texte s'affiche immediatement avec la police de repli,
// puis bascule sur Geist des qu'elle est prete : aucune police distante ne
// bloque le premier rendu (pas de FOIT). Sous-ensemble latin uniquement.
const _geist = Geist({ subsets: ["latin"], display: "swap" });
const _geistMono = Geist_Mono({ subsets: ["latin"], display: "swap" });

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
        {/* ===== CSS CRITIQUE INLINE (anti-FOUC au PREMIER acces) =====
            Corrige le "flash de page en police serif / liens bleus soulignes"
            visible UNIQUEMENT lors de la toute premiere visite sur mobile lent.

            Cause : la feuille de style principale (~40 Ko gzip) est render-blocking
            et n'est pas encore en cache au 1er acces. Sur 4G, pendant son
            telechargement, Safari (streaming SSR Next.js) peint le HTML deja recu
            SANS style -> fond blanc, texte serif, liens bleus. Aux visites
            suivantes le CSS est en cache immutable, donc le probleme disparait.

            Ce bloc est INLINE dans le HTML (servi frais, aucun aller-retour reseau)
            donc il s'applique des le tout premier octet. Il reprend EXACTEMENT les
            valeurs du theme sombre (--background:#070c18 / --foreground:#eef2fb),
            si bien que lorsque le gros CSS arrive et prend le relais, il n'y a
            AUCUN changement visible (pas de second flash). L'app est forcee en
            theme sombre (defaultTheme="dark", enableSystem=false), donc ces valeurs
            sont toujours correctes. */}
        <style
          dangerouslySetInnerHTML={{
            __html:
              "html{background:#070c18;color:#eef2fb;" +
              "font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;" +
              "-webkit-text-size-adjust:100%;text-size-adjust:100%}" +
              "body{background:#070c18;color:#eef2fb;margin:0}" +
              "a{color:inherit;text-decoration:none}",
          }}
        />
        {/* Filet de securite anti-page-vide + auto-recuperation (script inline,
            donc TOUJOURS frais : le HTML est servi en max-age=0, alors que les
            chunks /_next/static/* sont en cache immutable. Ce script s'execute
            donc meme quand TOUS les chunks 404.)

            1) REVEAL : revele le contenu critique masque par les animations
               d'entree si le JS principal tarde a s'hydrater (mobile lent).
               Voir la regle .mo-ready dans globals.css.

            2) AUTO-RECUPERATION (assets _next 404) : cause racine du bug
               "page en police serif sans style" / "fond sombre bloque". Un onglet
               Safari laisse ouvert > la fenetre de Skew Protection redemande, apres
               un redeploiement, d'ANCIENS chunks /_next/static/*.css|*.js qui
               n'existent plus -> 404 -> le CSS/JS ne s'applique pas.
               On recharge alors UNE SEULE FOIS pour obtenir un HTML frais qui
               pointe vers les bons chunks.

               Garde anti-boucle STRICTE :
                 - cle sessionStorage indexee par la VERSION de deploiement (?dpl=
                   du script courant, sinon le build id). => au plus 1 reload
                   automatique par (session x version). Un nouveau deploiement
                   autorise 1 nouvelle tentative ; l'ancien onglet est repare.
                 - si l'asset echoue ENCORE apres le reload (meme version deja
                   marquee) => on N'ESSAIE PLUS : la page s'affiche telle quelle.
               Declencheur UNIQUEMENT sur un vrai asset critique termine par .js ou
               .css sous /_next/static/ (ou ChunkLoadError). Jamais pour une image,
               une API, Supabase, ou une erreur reseau generale. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){" +
              "function r(){try{document.documentElement.classList.add('mo-ready')}catch(e){}}" +
              "setTimeout(r,800);window.addEventListener('load',function(){setTimeout(r,200)});" +
              // Version de deploiement : ?dpl= du <script> courant, sinon fallback build.
              "var V='v';try{var cs=document.currentScript;var m=cs&&cs.src&&cs.src.match(/[?&]dpl=([^&]+)/);if(m){V=m[1]}else{var s=document.querySelector('script[src*=\"/_next/static/\"]');var mm=s&&s.src&&s.src.match(/[?&]dpl=([^&]+)/);V=(mm&&mm[1])||'nodpl'}}catch(_){}" +
              "var KEY='cc_asset_reload';" +
              "function healed(){try{return sessionStorage.getItem(KEY)===V}catch(_){return true}}" +
              "function mark(){try{sessionStorage.setItem(KEY,V)}catch(_){}}" +
              // Detecte un echec de chargement d'un asset CRITIQUE _next (.js ou .css).
              "function isCriticalAsset(t){if(!t)return false;var tag=t.tagName;var url=(t.src||t.href||'');if(!/\\/_next\\/static\\//.test(url))return false;if(tag==='SCRIPT')return /\\.js(\\?|$)/.test(url);if(tag==='LINK'){var rel=(t.rel||'').toLowerCase();return (rel==='stylesheet'||rel==='preload'||rel==='modulepreload')&&/\\.(css|js)(\\?|$)/.test(url)}return false}" +
              "function recover(reason){r();if(healed()){return}mark();try{location.reload()}catch(_){}}" +
              // 1) Erreurs de ressources (capture=true : les erreurs de <link>/<script> ne bouillonnent pas).
              "window.addEventListener('error',function(e){try{var t=e&&e.target;if(t&&t!==window&&isCriticalAsset(t)){recover('asset')}else if(/ChunkLoadError|Loading (CSS )?chunk .* failed/i.test((e&&e.message)||'')){recover('chunkerr')}}catch(_){}} ,true);" +
              // 2) import() dynamique de chunk qui rejette (framer-motion, sections dynamic()).
              "window.addEventListener('unhandledrejection',function(e){try{var msg=((e&&e.reason&&(e.reason.message||e.reason))||'')+'';if(/ChunkLoadError|Loading chunk .* failed|Importing a module script failed|error loading dynamically imported module/i.test(msg)){recover('promise')}}catch(_){}});" +
              "})();",
          }}
        />
        {/* Filet ultime pour JS TOTALEMENT desactive (ou moteur JS bloque) : le
            script ci-dessus ne peut alors pas s'executer. On revele donc TOUT le
            contenu masque par framer-motion (opacity:0 inline) via une regle CSS
            pure. Comme elle est dans <noscript>, elle n'a AUCUN effet quand le JS
            fonctionne : zero impact sur les utilisateurs normaux. */}
        <noscript>
          {/* eslint-disable-next-line react/no-danger */}
          <style
            dangerouslySetInnerHTML={{
              __html:
                '[style*="opacity:0"],[style*="opacity: 0"]{opacity:1!important;transform:none!important}',
            }}
          />
        </noscript>
        {/* Google AdSense : validation de la propriete du site + diffusion des annonces.
            strategy="lazyOnload" => le script publicitaire n'est charge qu'APRES que
            la page et ses ressources essentielles soient pretes (evenement load).
            Il ne bloque donc jamais le premier rendu ni l'interactivite de la
            homepage. AdSense valide toujours la propriete du site normalement. */}
        <Script
          id="google-adsense"
          strategy="lazyOnload"
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
