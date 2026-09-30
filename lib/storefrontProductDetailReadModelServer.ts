import 'server-only';

import { getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';
import { applyOwnerReviewedStorefrontCorrections } from '@/lib/storefrontOwnerReviewedCorrections';
import type { StorefrontProduct } from '@/lib/types';

export const STOREFRONT_PRODUCT_DETAIL_READ_MODEL_V1 = 'feya_storefront_product_details_v1';
export const STOREFRONT_PRODUCT_DETAIL_RELEASE_V1 = 'feya-review-207-20260924';

type DetailRow = {
  canonical_product_id: string;
  seo_page_id: string;
  source_draft_id: string;
  approved_content_sha256: string;
  source_release_ref: string;
  url_path_snapshot: string;
  product_slug: string;
  product_json: Record<string, unknown>;
};

const DETAIL_SELECT = [
  'canonical_product_id','seo_page_id','source_draft_id','approved_content_sha256',
  'source_release_ref','url_path_snapshot','product_slug','product_json',
].join(',');

/**
 * Exact approved-corpus PDP data path. Additive and intentionally uncached.
 * SEO copy remains governed by the existing approved-copy reader.
 */
export async function readApprovedStorefrontProductDetailV1(slug: string): Promise<StorefrontProduct | null> {
  const cleanSlug = String(slug || '').trim();
  if (!cleanSlug || cleanSlug.length > 240 || !/^[a-z0-9-]+$/.test(cleanSlug)) return null;

  const service = getSupabaseServiceRoleClient();
  if (!service) throw new Error('STOREFRONT_PRODUCT_DETAIL_SERVICE_UNAVAILABLE');

  const { data, error } = await service
    .from(STOREFRONT_PRODUCT_DETAIL_READ_MODEL_V1)
    .select(DETAIL_SELECT)
    .eq('product_slug', cleanSlug)
    .maybeSingle();

  if (error) throw new Error('STOREFRONT_PRODUCT_DETAIL_READ_FAILED:' + (error.code || 'unknown'));
  if (!data) return null;

  const row = data as unknown as DetailRow;
  if (
    row.source_release_ref !== STOREFRONT_PRODUCT_DETAIL_RELEASE_V1
    || row.product_slug !== cleanSlug
    || row.url_path_snapshot !== '/shop/' + cleanSlug
    || !/^[0-9a-f]{64}$/.test(row.approved_content_sha256)
  ) throw new Error('STOREFRONT_PRODUCT_DETAIL_IDENTITY_MISMATCH');

  const product = row.product_json as unknown as StorefrontProduct;
  if (
    !product
    || product.canonical_product_id !== row.canonical_product_id
    || product.product_slug !== cleanSlug
    || !Array.isArray(product.configurations)
    || !Array.isArray(product.media_gallery)
  ) throw new Error('STOREFRONT_PRODUCT_DETAIL_PAYLOAD_MISMATCH');

  return applyOwnerReviewedStorefrontCorrections(product as Record<string, unknown>) as StorefrontProduct;
}
