export type StorefrontMedia = {
  url?: string | null;
  alt?: string | null;
  media_type?: string | null;
  type?: string | null;
  is_primary?: boolean | null;
  sort_order?: number | null;
  [key: string]: unknown;
};

export type StorefrontConfiguration = {
  configuration_id?: string | null;
  configuration_price_id?: string | null;
  source_price_row_id?: string | null;
  sellable_configuration_id?: string | null;
  configuration_label?: string | null;
  configuration_name?: string | null;
  option_name?: string | null;
  option_value?: string | null;
  raw_option_value?: string | null;
  raw_option_text?: string | null;
  title?: string | null;
  label?: string | null;
  price_amount?: number | null;
  price?: number | null;
  amount?: number | null;
  min_price?: number | null;
  max_price?: number | null;
  currency?: string | null;
  has_fallback_price?: boolean | null;
  sort_order?: number | null;

  // v4 storefront contract fields. These are optional so the frontend remains
  // backward-compatible with v1/v2/v3 safe views until v4 exists in Supabase.
  public_label?: string | null;
  component_code?: string | null;
  component_family?: string | null;
  is_full_set?: boolean | null;
  is_bundle?: boolean | null;
  bundle_component_codes?: string[] | null;
  base_price_amount?: number | null;
  sale_price_amount?: number | null;
  compare_at_price_amount?: number | null;
  display_price_amount?: number | null;
  discount_percent?: number | null;
  price_source_mode?: string | null;
  price_confidence_status?: string | null;
  has_russian_raw_label?: boolean | null;
  needs_label_review?: boolean | null;
  [key: string]: unknown;
};

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
  secondary_image_url?: string | null;
  hover_image_url?: string | null;
  video_url?: string | null;
  media_gallery?: unknown;
  media_count?: number | null;
  has_video?: boolean | null;
  min_price: number | null;
  max_price: number | null;
  currency: string | null;
  has_fallback_price: boolean | null;
  has_sampler_excluded_price: boolean | null;
  public_configuration_count: number | null;
  public_price_row_count: number | null;
  pdp_option_count?: number | null;
  has_multiple_pdp_options?: boolean | null;
  configurations: unknown;
  storefront_candidate_flag: boolean | null;

  // v4 storefront contract fields. Optional until Supabase v4 exists.
  price_contract_version?: string | null;
  price_source_mode?: string | null;
  price_confidence_status?: string | null;
  has_unverified_discount?: boolean | null;
  has_russian_public_label?: boolean | null;
  needs_price_review?: boolean | null;
  needs_label_review?: boolean | null;
  full_set_display_price_amount?: number | null;
  component_sum_display_price_amount?: number | null;
  full_set_savings_amount?: number | null;
  full_set_savings_percent?: number | null;
  category_label?: string | null;
  world_label?: string | null;
  canonical_color_label?: string | null;
  color_options?: string[] | null;
  [key: string]: unknown;
};

export type ReviewQueueSummary = {
  queue_code?: string | null;
  queue_name?: string | null;
  status?: string | null;
  review_queue?: string | null;
  item_count?: number | null;
  count?: number | null;
  row_count?: number | null;
  total?: number | null;
  priority?: number | null;
  description?: string | null;
  [key: string]: unknown;
};

export type AdminCatalogRow = {
  canonical_product_id: string;
  matched_etsy_listing_id?: string | null;
  etsy_listing_id?: string | null;
  draft_site_title?: string | null;
  card_title?: string | null;
  h1?: string | null;
  source_title?: string | null;
  raw_title?: string | null;
  readiness_status?: string | null;
  readiness_label?: string | null;
  status?: string | null;
  publish_status?: string | null;
  storefront_status?: string | null;
  publication_status?: string | null;
  next_action?: string | null;
  notes?: string | null;
  review_reason?: string | null;
  blocker_reason?: string | null;
  do_not_publish_flag?: boolean | null;
  [key: string]: unknown;
};
