import { isCanonicalPagePath } from './searchPortfolioPolicy.ts';

export type SitemapPortfolioRow = {
  seo_page_id: string;
  url_path: string;
  portfolio_status: string;
  indexation_intent: string;
};

export function portfolioSitemapUrls(rows: SitemapPortfolioRow[], origin: string) {
  const urls: Array<{ url: string }> = [];
  const seenIds = new Set<string>();
  const seenPaths = new Set<string>();
  for (const row of rows) {
    if (row.portfolio_status !== 'active' || row.indexation_intent !== 'indexable') continue;
    if (!row.seo_page_id || !isCanonicalPagePath(row.url_path)) throw new Error('Invalid canonical portfolio entry');
    if (seenIds.has(row.seo_page_id) || seenPaths.has(row.url_path)) throw new Error('Ambiguous canonical portfolio entry');
    seenIds.add(row.seo_page_id);
    seenPaths.add(row.url_path);
    // Operational updated_at never becomes sitemap lastmod.
    urls.push({ url: new URL(row.url_path, origin).toString() });
  }
  return urls;
}

export async function readCompletePortfolio<T>(readPage: (from: number, to: number) => Promise<{
  data: T[] | null; error: { message: string } | null;
}>, pageSize = 500, maximumRows = 10000): Promise<T[]> {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || !Number.isSafeInteger(maximumRows) || maximumRows < pageSize) throw new Error('Invalid portfolio pagination limits');
  const rows: T[] = [];
  while (rows.length <= maximumRows) {
    // Use actual row count, not requested page size: API caps can shorten pages.
    const result = await readPage(rows.length, rows.length + pageSize - 1);
    if (result.error || result.data === null) throw new Error('Portfolio source unavailable');
    if (!result.data.length) return rows;
    rows.push(...result.data);
    if (rows.length > maximumRows) throw new Error('Portfolio row budget exceeded; refusing partial result');
  }
  throw new Error('Portfolio completeness could not be established');
}
