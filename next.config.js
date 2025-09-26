/** @type {import('next').NextConfig} */

const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
  },
  images: {
    domains: ['localhost', 'tandemdaily.com', 'www.tandemdaily.com'],
    unoptimized: isCapacitorBuild,
  },
  // For iOS static export
  ...(isCapacitorBuild && {
    output: 'export',
    trailingSlash: true,
    images: {
      unoptimized: true,
    },
  }),
}

module.exports = nextConfig