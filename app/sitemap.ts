import type { MetadataRoute } from 'next';
import { getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_VIEW_V4 } from '@/lib/storefront';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thefeya.com';
const PRODUCT_LIMIT = 500;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/collections`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ];

  const supabase = getSupabaseReadClient();
  if (!supabase) return staticRoutes;

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select('product_slug,updated_at')
    .limit(PRODUCT_LIMIT);

  if (error || !data?.length) return staticRoutes;

  const productRoutes: MetadataRoute.Sitemap = data
    .filter((row) => row.product_slug)
    .map((row) => ({
      url: `${siteUrl}/shop/${row.product_slug}`,
      lastModified: row.updated_at ? new Date(row.updated_at) : now,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

  return [...staticRoutes, ...productRoutes];
}
