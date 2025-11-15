/** @type {import('next').NextConfig} */

const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
  },

  // IMPORTANT: Disable source maps in production for security
  productionBrowserSourceMaps: false,

  images: {
    domains: ['localhost', 'tandemdaily.com', 'www.tandemdaily.com'],
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
