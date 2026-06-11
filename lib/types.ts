export type StorefrontProduct = {
  canonical_product_id: string;
  product_slug: string | null;
  matched_etsy_listing_id: string | null;
  source_url: string | null;
  card_title: string | null;
  h1: string | null;
  seo_title: string | null;
  meta_description: string | null;
  product_type: string | null;
  material: string | null;
  color: string | null;
  size_mode: string | null;
  production_profile: string | null;
  shipping_profile: string | null;
  handmade_flag: boolean | null;
  styled_imagery_flag: boolean | null;
  primary_image_url: string | null;
  primary_image_alt: string | null;
  min_price: number | null;
  max_price: number | null;
  currency: string | null;
  has_fallback_price: boolean | null;
  has_sampler_excluded_price: boolean | null;
  public_configuration_count: number | null;
  public_price_row_count: number | null;
  configurations: unknown;
  storefront_candidate_flag: boolean | null;
};

export type ReviewQueueSummary = {
  queue_code?: string | null;
  queue_name?: string | null;
  item_count?: number | null;
  priority?: number | null;
  description?: string | null;
  [key: string]: unknown;
};

export type AdminCatalogRow = {
  canonical_product_id: string;
  matched_etsy_listing_id?: string | null;
  draft_site_title?: string | null;
  card_title?: string | null;
  readiness_status?: string | null;
  publish_status?: string | null;
  do_not_publish_flag?: boolean | null;
  [key: string]: unknown;
};
