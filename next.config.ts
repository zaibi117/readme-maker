/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*"],
  crossOrigin: 'anonymous',
  experimental: {
    serverComponentsExternalPackages: ["mongoose"],
  },
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    MONGODB_URI: process.env.MONGODB_URI,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
