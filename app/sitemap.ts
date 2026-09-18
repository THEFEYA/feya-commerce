import type { MetadataRoute } from 'next';
import { getSupabaseReadClient } from '@/lib/supabase';
import { absoluteSiteUrl, isSearchIndexingEnabled } from '@/lib/siteConfig';

type PortfolioSitemapRow = {
  url_path?: string | null;
  updated_at?: string | null;
  indexation_intent?: string | null;
  portfolio_status?: string | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isSearchIndexingEnabled()) {
    return [];
  }

  const urls: MetadataRoute.Sitemap = [
    {
      url: absoluteSiteUrl('/'),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];

  const supabase = getSupabaseReadClient();
  if (!supabase) return urls;

  const { data, error } = await supabase
    .from('feya_commerce_v_seo_page_portfolio_safe_v1')
    .select('url_path,updated_at,indexation_intent,portfolio_status')
    .eq('indexation_intent', 'indexable')
    .eq('portfolio_status', 'active')
    .limit(50000);

  if (error) return urls;

  for (const row of (data || []) as PortfolioSitemapRow[]) {
    if (!row.url_path) continue;

    urls.push({
      url: absoluteSiteUrl(row.url_path),
      ...(row.updated_at ? { lastModified: new Date(row.updated_at) } : {}),
      changeFrequency: 'weekly',
      priority: row.url_path.startsWith('/shop/') ? 0.8 : 0.7,
    });
  }

  return urls;
}
