/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // Remove this if not needed
  },
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;