// Detection des navigateurs "in-app" (webviews integrees dans les applis).
//
// Probleme resolu : quand un client ouvre un lien depuis TikTok, Instagram,
// Facebook, Messenger, Snapchat, WhatsApp, etc., la page s'ouvre dans un
// navigateur integre (webview). La page de paiement PayDunya (application
// React protegee par Cloudflare) ne se charge PAS correctement dans ces
// webviews : l'utilisateur voit une page blanche / un chargement infini.
//
// La solution standard (Stripe, PayPal, etc.) est de detecter ce contexte et
// d'inviter l'utilisateur a ouvrir le lien dans son vrai navigateur
// (Chrome / Safari), ou la page PayDunya fonctionne normalement.

export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent || (navigator as any).vendor || ''

  // Marqueurs des principaux navigateurs integres.
  const rules = [
    'FBAN', // Facebook app
    'FBAV',
    'FB_IAB',
    'FBIOS',
    'Instagram',
    'Messenger',
    'Line/',
    'TikTok',
    'BytedanceWebview',
    'musical_ly', // ancien TikTok
    'Snapchat',
    'Twitter',
    'WhatsApp',
    'Pinterest',
    'GSA/', // Google Search App
    'KAKAOTALK',
    'WeChat',
    'MicroMessenger',
  ]

  if (rules.some((r) => ua.includes(r))) return true

  // Heuristique iOS : un WebView (WKWebView) n'expose pas "Safari" dans l'UA,
  // contrairement au vrai Safari mobile.
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  if (isIOS && !/Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)) {
    return true
  }

  // Heuristique Android : les WebView contiennent souvent "; wv".
  if (/Android/i.test(ua) && /; wv\)/i.test(ua)) return true

  return false
}

// Plateforme approximative, pour adapter les instructions affichees.
export function getMobilePlatform(): 'ios' | 'android' | 'other' {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}
