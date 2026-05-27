/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Export statique pour Electron (uniquement en build electron)
  ...(process.env.ELECTRON_BUILD === 'true' ? { output: 'export' } : {}),
}

export default nextConfig
