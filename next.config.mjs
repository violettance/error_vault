/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    return config;
  },
  experimental: {
    // asyncWebAssembly: true, // Removed as it's not recognized in Next.js 15
  },
}

export default nextConfig