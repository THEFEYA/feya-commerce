import 'server-only';

import {cacheLife, cacheTag} from 'next/cache';
import {getSupabaseServiceRoleClient} from '@/lib/supabaseAdmin';
import {STOREFRONT_CACHE_TAGS} from '@/lib/storefrontCacheInvalidation';
import {STOREFRONT_CARD_READ_MODEL_EXPECTED_COUNT} from '@/lib/storefrontCardReadModelServer';
import {STOREFRONT_PRODUCT_DETAIL_READ_MODEL_V1, STOREFRONT_PRODUCT_DETAIL_RELEASE_V1} from '@/lib/storefrontProductDetailReadModelServer';
import type {SitemapImageProduct} from '@/lib/sitemapProductImages';

type SitemapMediaRow = SitemapImageProduct & {
  source_draft_id: string;
  source_release_ref: string;
  url_path_snapshot: string;
  media_gallery: unknown;
};

/** One bounded, cached, media-only query to the EXISTING approved projection.
 * Never loads configuration/price/SEO JSON or fans out to individual PDPs.
 * Keeping current media here prevents removed photos from surviving in XML.
 * Shared media/catalog invalidation also invalidates this server-only cache.
 */
export async function readCachedApprovedStorefrontSitemapMediaV1(): Promise<SitemapMediaRow[]> {
  'use cache';
  cacheLife('max');
  cacheTag(STOREFRONT_CACHE_TAGS.site, STOREFRONT_CACHE_TAGS.catalog);
  const service = getSupabaseServiceRoleClient();
  if (!service) throw new Error('STOREFRONT_SITEMAP_MEDIA_SERVICE_UNAVAILABLE');
  const {data, error} = await service.from(STOREFRONT_PRODUCT_DETAIL_READ_MODEL_V1)
    .select('canonical_product_id,source_draft_id,source_release_ref,url_path_snapshot,product_slug,primary_image_url:product_json->>primary_image_url,media_gallery:product_json->media_gallery')
    .order('canonical_product_id', {ascending: true})
    .limit(STOREFRONT_CARD_READ_MODEL_EXPECTED_COUNT + 1);
  if (error) throw new Error('STOREFRONT_SITEMAP_MEDIA_READ_FAILED');
  const rows = (data || []) as unknown as SitemapMediaRow[];
  if (rows.length !== STOREFRONT_CARD_READ_MODEL_EXPECTED_COUNT) throw new Error('STOREFRONT_SITEMAP_MEDIA_COUNT_MISMATCH');
  for (const row of rows) {
    if (row.source_release_ref !== STOREFRONT_PRODUCT_DETAIL_RELEASE_V1
      || !row.source_draft_id || !row.product_slug
      || row.url_path_snapshot !== `/shop/${row.product_slug}`
      || !Array.isArray(row.media_gallery)) throw new Error('STOREFRONT_SITEMAP_MEDIA_IDENTITY_MISMATCH');
  }
  return rows;
}
