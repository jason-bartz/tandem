/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'tandemdaily.com', 'www.tandemdaily.com'],
  },
}

module.exports = nextConfig