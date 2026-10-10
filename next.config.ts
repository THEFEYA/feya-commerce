import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Owner-approved browser-visible visual candidate: Next.js beforeFiles
  // rewrites are required because the original URLs already have real pages.
  // Exact branch + Vercel SSO preview only; no Production routing changes.
  async rewrites() {
    const preview =
      process.env.VERCEL === '1' &&
      process.env.VERCEL_ENV === 'preview' &&
      process.env.VERCEL_PROJECT_ID === 'prj_ePIymo4sUG33wrRjHBxWrSlaxPID' &&
      process.env.VERCEL_GIT_COMMIT_REF === 'work/owner-visual-commercial-review-v2-20261010' &&
      process.env.FEYA_OWNER_PREVIEW_DISABLED !== 'true';
    return {
      beforeFiles: preview ? [
        {source: '/events-performance', destination: '/events-performance-review'},
        {source: '/style', destination: '/style-review'},
        {source: '/about', destination: '/about-review'},
        {source: '/shipping', destination: '/shipping-review'},
        {source: '/returns', destination: '/returns-review'},
        {source: '/size-guide', destination: '/size-guide-review'},
        {source: '/contact', destination: '/contact-review'},
      ] : [],
      afterFiles: [],
      fallback: [],
    };
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
