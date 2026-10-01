import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.etsystatic.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
