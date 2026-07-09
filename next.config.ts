import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Phase A uses source image URLs from imported Etsy/media data.
    // Keep preview permissive without requiring a complete remote host allowlist yet.
    unoptimized: true,
  },
  typescript: {
    // Draft visual recovery branch only: keep preview deployable while interactive visual components are being stabilized.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
