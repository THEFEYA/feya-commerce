import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Owner-approved Shipping & Delivery V13 public presentation; canonical URL
  // and ACTIVE Search Release v12 index/noindex behavior remain /shipping.
  // Other public routes, Footer and Contact do not participate in this rewrite.
  async rewrites() {
    return {beforeFiles:[
      {source:'/shipping',destination:'/shipping-public-v13'},
    ],afterFiles:[],fallback:[]};
  },
  async redirects() {
    return [
      { source: '/collections/burning-man-looks', destination: '/collections/burning-man-outfits', permanent: true },
      { source: '/collections/stage-outfits', destination: '/collections/performance-costumes', permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.etsystatic.com',
        pathname: '/**',
      },
    ],
    // Current imported Etsy media paths carry versioned image identifiers.
    // Keep optimized variants warm without treating the external source as immutable forever.
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
};

export default nextConfig;
