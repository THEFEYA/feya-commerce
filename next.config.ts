import type { NextConfig } from 'next';

// Owner-approved V13 navigation: Production on this project or the two exact
// protected V13 preview branches. No env flags are enabled for payments.
const v13Navigation=process.env.VERCEL==='1'
  &&process.env.VERCEL_PROJECT_ID==='prj_ePIymo4sUG33wrRjHBxWrSlaxPID'
  &&(process.env.VERCEL_ENV==='production'
    ||(process.env.VERCEL_ENV==='preview'
      &&['work/v13-public-presentation-release-20261012','work/v13-public-hubs-release-20261012'].includes(process.env.VERCEL_GIT_COMMIT_REF||'')
      &&process.env.FEYA_OWNER_PREVIEW_DISABLED!=='true'));

const nextConfig: NextConfig = {
  env:{NEXT_PUBLIC_FEYA_V13_PUBLIC_DESIGN:v13Navigation?'1':'0'},
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
