import type { NextConfig } from 'next';

// A public, non-secret build label so the exact SSO-protected Preview's
// PDP client and server render the same corrected owner-review shipping text.
// The normal Production build compiles this flag to '0' by default.
const visualV2Preview =
  process.env.VERCEL === '1' &&
  process.env.VERCEL_ENV === 'preview' &&
  process.env.VERCEL_PROJECT_ID === 'prj_ePIymo4sUG33wrRjHBxWrSlaxPID' &&
  process.env.VERCEL_GIT_COMMIT_REF === 'work/owner-visual-commercial-review-v2-20261010' &&
  process.env.FEYA_OWNER_PREVIEW_DISABLED !== 'true';

const nextConfig: NextConfig = {
  env: {NEXT_PUBLIC_FEYA_OWNER_V2_COPY_REVIEW: visualV2Preview ? '1' : '0'},
  cacheComponents: true,
  // Owner-approved browser-visible visual candidate: Next.js beforeFiles
  // rewrites are required because the original URLs already have real pages.
  // Exact branch + Vercel SSO preview only; no Production routing changes.
  async rewrites() {
    const preview = visualV2Preview;
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
