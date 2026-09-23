import type { MetadataRoute } from 'next';
import { getSupabaseReadClient } from '@/lib/supabase';
import { getSiteUrl, isSearchIndexingEnabled } from '@/lib/siteConfig';
import { portfolioSitemapUrls, readCompletePortfolio, type SitemapPortfolioRow } from '@/lib/searchSitemapPolicy';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isSearchIndexingEnabled()) return [];
  const supabase = getSupabaseReadClient();
  if (!supabase) throw new Error('Sitemap source unavailable');
  const rows = await readCompletePortfolio<SitemapPortfolioRow>(async (from, to) => {
    const result = await supabase
      .from('feya_commerce_v_seo_page_portfolio_safe_v1')
      .select('seo_page_id,url_path,indexation_intent,portfolio_status')
      .eq('indexation_intent', 'indexable')
      .eq('portfolio_status', 'active')
      .order('seo_page_id', { ascending: true })
      .range(from, to);
    return { data: result.data as SitemapPortfolioRow[] | null, error: result.error };
  });
  // Home/Shop must be actual approved portfolio rows, never implicit entries.
  return portfolioSitemapUrls(rows, getSiteUrl().origin);
}
