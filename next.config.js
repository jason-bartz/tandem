/** @type {import('next').NextConfig} */

const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';
const isStandalone = process.env.NEXT_PUBLIC_STANDALONE_ALCHEMY === 'true';

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
  },

  // Redirects for renamed routes
  async redirects() {
    const redirects = [
      {
        source: '/element-soup',
        destination: '/daily-alchemy',
        permanent: true,
      },
    ];

    // Standalone mode: redirect other game routes to Daily Alchemy
    if (isStandalone) {
      redirects.push(
        { source: '/dailymini', destination: '/daily-alchemy', permanent: false },
        { source: '/reel-connections', destination: '/daily-alchemy', permanent: false }
      );
    }

    return redirects;
  },

  // Standalone mode: serve Daily Alchemy at the root path
  async rewrites() {
    if (isStandalone) {
      return [{ source: '/', destination: '/daily-alchemy' }];
    }
    return [];
  },

  // IMPORTANT: Disable source maps in production for security
  productionBrowserSourceMaps: false,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'localhost' },
      { protocol: 'https', hostname: 'tandemdaily.com' },
      { protocol: 'https', hostname: 'www.tandemdaily.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'dailyalchemy.fun' },
      { protocol: 'https', hostname: 'www.dailyalchemy.fun' },
    ],
    unoptimized: isCapacitorBuild,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Webpack configuration to handle Capacitor modules
  webpack: (config) => {
    // Ignore Capacitor modules during web builds
    if (!isCapacitorBuild) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@capacitor/core': false,
        '@capacitor-community/apple-sign-in': false,
      };
    }
    return config;
  },
  // For iOS static export
  ...(isCapacitorBuild && {
    output: 'export',
    trailingSlash: true,
    images: {
      unoptimized: true,
    },
  }),
};

module.exports = nextConfig;
