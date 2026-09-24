import type { MetadataRoute } from 'next';
import { absoluteSiteUrl, isSearchIndexingEnabled } from '@/lib/siteConfig';
import { closedReviewRequested } from '@/lib/searchReviewPresentation';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  if (closedReviewRequested(process.env)) return { rules: [{ userAgent: '*', disallow: '/' }] };
  const indexingEnabled = isSearchIndexingEnabled();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/internal/'],
      },
    ],
    ...(indexingEnabled ? { sitemap: absoluteSiteUrl('/sitemap.xml') } : {}),
  };
}
