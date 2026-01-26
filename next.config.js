/** @type {import('next').NextConfig} */

const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
  },

  // Redirects for renamed routes
  async redirects() {
    return [
      {
        source: '/element-soup',
        destination: '/daily-alchemy',
        permanent: true,
      },
    ];
  },

  // IMPORTANT: Disable source maps in production for security
  productionBrowserSourceMaps: false,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'localhost' },
      { protocol: 'https', hostname: 'tandemdaily.com' },
      { protocol: 'https', hostname: 'www.tandemdaily.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
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
