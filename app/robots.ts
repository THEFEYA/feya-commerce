import type { MetadataRoute } from 'next';
import { absoluteSiteUrl, isSearchIndexingEnabled } from '@/lib/siteConfig';

export default function robots(): MetadataRoute.Robots {
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
