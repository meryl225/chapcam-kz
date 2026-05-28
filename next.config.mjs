/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
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
        source: '/api/:path*',
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
