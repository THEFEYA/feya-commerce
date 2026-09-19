import type { StorefrontProduct } from '@/lib/types';

export const ADMIN_PRODUCT_CATALOG_FALLBACK_VIEW = 'feya_commerce_v_step6_product_catalog_overview';

export const ADMIN_PRODUCT_CATALOG_FALLBACK_SELECT = [
  'canonical_product_id',
  'source_shop_code',
  'primary_source_listing_id',
  'matched_etsy_listing_id',
  'source_url',
  'draft_site_title',
  'card_title',
  'product_type',
  'publish_status',
  'readiness_status',
  'do_not_publish_flag',
  'handmade_flag',
  'styled_imagery_flag',
  'configuration_count',
  'public_configuration_count',
  'price_row_count',
  'public_price_row_count',
  'public_min_price',
  'public_max_price',
  'has_fallback_price',
  'has_sampler_excluded_price',
  'missing_price_row_count',
  'media_count',
  'public_primary_media_count',
  'content_draft_count',
  'listing_match_count',
  'listing_match_review_count'
].join(',');

type JsonRecord = Record<string, unknown>;

type CatalogFallbackRow = JsonRecord & {
  canonical_product_id: string;
  primary_source_listing_id?: string | null;
  matched_etsy_listing_id?: string | null;
  source_url?: string | null;
  draft_site_title?: string | null;
  card_title?: string | null;
  product_type?: string | null;
  handmade_flag?: boolean | null;
  styled_imagery_flag?: boolean | null;
  public_configuration_count?: unknown;
  public_price_row_count?: unknown;
  public_min_price?: unknown;
  public_max_price?: unknown;
  has_fallback_price?: boolean | null;
  has_sampler_excluded_price?: boolean | null;
  missing_price_row_count?: unknown;
  media_count?: unknown;
  listing_match_review_count?: unknown;
};

function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() && value !== 'null' ? value.trim() : null;
}

function isPositive(value: unknown): boolean {
  return (toNumber(value) || 0) > 0;
}

export function toCatalogFallbackStorefrontProduct(rawRow: unknown): StorefrontProduct {
  const row = rawRow as CatalogFallbackRow;
  const title = textOrNull(row.card_title)
    || textOrNull(row.draft_site_title)
    || textOrNull(row.matched_etsy_listing_id)
    || row.canonical_product_id;
  const needsPriceReview = Boolean(row.has_fallback_price) || isPositive(row.missing_price_row_count) || !isPositive(row.public_price_row_count);
  const needsLabelReview = isPositive(row.listing_match_review_count);

  return {
    canonical_product_id: row.canonical_product_id,
    product_slug: row.canonical_product_id,
    matched_etsy_listing_id: textOrNull(row.matched_etsy_listing_id) || textOrNull(row.primary_source_listing_id),
    source_url: textOrNull(row.source_url),
    card_title: title,
    h1: title,
    seo_title: null,
    meta_description: null,
    product_type: textOrNull(row.product_type),
    material: null,
    color: null,
    size_mode: null,
    production_profile: null,
    shipping_profile: null,
    handmade_flag: row.handmade_flag ?? null,
    styled_imagery_flag: row.styled_imagery_flag ?? null,
    primary_image_url: null,
    primary_image_alt: null,
    secondary_image_url: null,
    hover_image_url: null,
    video_url: null,
    media_gallery: [],
    media_count: toNumber(row.media_count),
    has_video: false,
    min_price: toNumber(row.public_min_price),
    max_price: toNumber(row.public_max_price),
    currency: 'USD',
    has_fallback_price: row.has_fallback_price ?? null,
    has_sampler_excluded_price: row.has_sampler_excluded_price ?? null,
    public_configuration_count: toNumber(row.public_configuration_count),
    public_price_row_count: toNumber(row.public_price_row_count),
    configurations: [],
    storefront_candidate_flag: false,
    price_confidence_status: needsPriceReview ? 'Needs price review' : 'Public price',
    needs_price_review: needsPriceReview,
    needs_label_review: needsLabelReview,
    category_label: null,
    world_label: null,
    canonical_color_label: null,
    color_options: null,
  };
}
