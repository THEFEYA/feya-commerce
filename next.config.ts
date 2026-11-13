import type { NextConfig } from 'next';

// Owner-approved V13 navigation: Production on this project or the two exact
// protected V13 preview branches. No env flags are enabled for payments.
const v13Navigation=process.env.VERCEL==='1'
  &&process.env.VERCEL_PROJECT_ID==='prj_ePIymo4sUG33wrRjHBxWrSlaxPID'
  &&(process.env.VERCEL_ENV==='production'
    ||(process.env.VERCEL_ENV==='preview'
      &&['work/v13-public-presentation-release-20261012','work/v13-public-hubs-release-20261012','work/paired-set-buyer-checkout-20261026','work/approved-color-ux-recovery-20261106','work/social-links-product-actions-20261106', 'work/collections-directory-route-boundary-20261106'].includes(process.env.VERCEL_GIT_COMMIT_REF||'')
      &&process.env.FEYA_OWNER_PREVIEW_DISABLED!=='true'));

const nextConfig: NextConfig = {
  env:{NEXT_PUBLIC_FEYA_V13_PUBLIC_DESIGN:v13Navigation?'1':'0'},
  cacheComponents: true,
  // Next.js 16.3.8 treats bare "Googlebot" as a JS-executing DOM bot and streams
  // title/description/robots/canonical into <body>. Google accepts rel=canonical
  // only in <head>; URL Inspection of indexed PDPs showed "User-declared canonical:
  // None". This is Next's default html-limited list (v16.3.8 html-bots.ts) plus
  // Googlebot, so Search crawlers get blocking <head> metadata exactly like
  // Google-InspectionTool already does. Human visitors keep streaming metadata.
  htmlLimitedBots: /Googlebot|[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight/i,
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
