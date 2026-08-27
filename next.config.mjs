/** @type {import('next').NextConfig} */
const nextConfig = {
  // CORRECTIF « page dé-stylée après un déploiement ».
  // Next ajoute `?dpl=<VERCEL_DEPLOYMENT_ID>` à TOUTES les URLs d'assets statiques
  // (JS/CSS). Le probleme : le HTML de la landing est mis en cache CDN
  // (s-maxage + stale-while-revalidate). Apres une nouvelle publication, le CDN
  // sert encore l'ancien HTML pendant quelques minutes ; celui-ci pointait vers
  // l'ancien hash de CSS qui n'existait plus sur le nouveau deploiement -> 404 ->
  // page rendue SANS aucun style (voir capture mobile Safari).
  // En versionnant les assets avec l'ID de deploiement, ces requetes sont
  // routees vers LEUR deploiement d'origine, garde disponible par la Skew
  // Protection Vercel (activee, fenetre 7 jours). Le CSS repond donc toujours 200.
  // En local (VERCEL_DEPLOYMENT_ID absent) la valeur est undefined => aucun effet.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,

  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Optimisation reactivee : Next redimensionne, convertit en WebP/AVIF et
    // applique le lazy-load. C'est le principal levier pour la vitesse cote client
    // (le dossier public pesait ~17 Mo d'images pleine resolution servies brutes).
    formats: ['image/avif', 'image/webp'],
    qualities: [70, 75],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
        ],
      },
      {
        // IMPORTANT : on EXCLUT /api/videos/file de cette regle.
        // Cette route sert des octets video (lecture + seek) et definit elle-meme
        // `Cache-Control: private, max-age=3600`. Si on lui imposait `no-store`
        // ici, Safari (iOS ET macOS) REFUSERAIT de lire la video -> ecran noir +
        // icone de lecture barree EN PRODUCTION (l'apercu v0 supprime ces en-tetes,
        // d'ou "ca marche cote v0 mais pas sur le site"). Le lookahead negatif
        // `(?!videos/file)` laisse toutes les autres routes /api en `no-store`.
        // Le middleware applique deja `no-store` aux autres routes API : aucune
        // perte de securite. Le streaming video est par ailleurs bypasse dans le
        // middleware, donc cette route n'a plus AUCUNE source de `no-store`.
        source: '/api/((?!videos/file).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ]
  },
  
  // Rewrites to mask internal endpoints
  async rewrites() {
    return [
      // Mask Decart endpoints
      {
        source: '/api/v1/session',
        destination: '/api/decart-session',
      },
      {
        source: '/api/v1/token',
        destination: '/api/decart-token',
      },
      // Mask swap endpoints
      {
        source: '/api/v1/transform',
        destination: '/api/swap/cloud',
      },
      {
        source: '/api/v1/stream',
        destination: '/api/faceswap/stream',
      },
    ]
  },
  
  // Block access to sensitive paths
  async redirects() {
    return [
      {
        source: '/.env',
        destination: '/404',
        permanent: false,
      },
      {
        source: '/.env.local',
        destination: '/404',
        permanent: false,
      },
      {
        source: '/api/test-decart',
        destination: '/404',
        permanent: false,
      },
    ]
  },
  
  // Production optimizations
  productionBrowserSourceMaps: false, // Disable source maps in production
  
  // Minimize and obfuscate
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Experimental features for better security
  experimental: {
    // Reduce client-side JavaScript exposure
  },
}

export default nextConfig
