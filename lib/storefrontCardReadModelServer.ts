import 'server-only';

import { getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';
import { buildStorefrontFacets } from '@/lib/storefrontFacets';
import type { StorefrontProduct } from '@/lib/types';

export const STOREFRONT_CARD_READ_MODEL_V1 = 'feya_storefront_product_cards_v1';
export const STOREFRONT_CARD_READ_MODEL_EXPECTED_COUNT = 207;
export const STOREFRONT_CARD_FACET_CONTRACT = 'feya-storefront-facets-v4';

export type StorefrontCardReadRowV1 = {
  canonical_product_id: string;
  seo_page_id: string;
  source_draft_id: string;
  approved_content_sha256: string;
  source_release_ref: string;
  product_slug: string;
  card_title: string;
  h1: string;
  seo_title: string;
  meta_description: string;
  product_type: string | null;
  material: string | null;
  color: string | null;
  currency: string | null;
  primary_image_url: string;
  primary_image_alt: string | null;
  secondary_image_url: string | null;
  hover_image_url: string | null;
  video_url: string | null;
  has_video: boolean | null;
  media_count: number | null;
  min_price: number | null;
  max_price: number | null;
  card_display_price_amount: number;
  category_label: string | null;
  world_label: string | null;
  canonical_color_label: string | null;
  color_options: string[] | null;
  parent_components_json: unknown;
  child_components_json: unknown;
  component_groups_json: unknown;
  component_values_json: unknown;
  sellable_component_values_json: unknown;
  event_values_json: unknown;
  style_values_json: unknown;
  persona_values_json: unknown;
  audience_values_json: unknown;
  material_values_json: unknown;
  membership_codes: string[];
  facet_contract_version: string;
  facet_snapshot_hash: string;
};

const CARD_SELECT = [
  'canonical_product_id','seo_page_id','source_draft_id','approved_content_sha256','source_release_ref',
  'product_slug','card_title','h1','seo_title','meta_description','product_type','material','color','currency',
  'primary_image_url','primary_image_alt','secondary_image_url','hover_image_url','video_url','has_video','media_count',
  'min_price','max_price','card_display_price_amount','category_label','world_label','canonical_color_label','color_options',
  'parent_components_json','child_components_json','component_groups_json','component_values_json','sellable_component_values_json',
  'event_values_json','style_values_json','persona_values_json','audience_values_json','material_values_json',
  'membership_codes','facet_contract_version','facet_snapshot_hash',
].join(',');

/**
 * Exact approved-corpus raw reader.
 *
 * Deliberately remains uncached so route-specific public cache wrappers can attach
 * the correct invalidation scope (catalog-wide for Shop, product-scoped for Home).
 */
export async function readApprovedStorefrontCardRowsV1(): Promise<StorefrontCardReadRowV1[]> {
  const service = getSupabaseServiceRoleClient();
  if (!service) throw new Error('STOREFRONT_CARD_READ_MODEL_SERVICE_UNAVAILABLE');

  const { data, error } = await service
    .from(STOREFRONT_CARD_READ_MODEL_V1)
    .select(CARD_SELECT)
    .order('canonical_product_id', { ascending: true });

  if (error) throw new Error(`STOREFRONT_CARD_READ_MODEL_READ_FAILED:${error.code || 'unknown'}`);

  const rows = (data || []) as unknown as StorefrontCardReadRowV1[];
  if (rows.length !== STOREFRONT_CARD_READ_MODEL_EXPECTED_COUNT) {
    throw new Error(`STOREFRONT_CARD_READ_MODEL_COUNT_MISMATCH:${rows.length}`);
  }

  const ids = new Set<string>();
  for (const row of rows) {
    if (!row.canonical_product_id || ids.has(row.canonical_product_id)) {
      throw new Error('STOREFRONT_CARD_READ_MODEL_IDENTITY_MISMATCH');
    }
    ids.add(row.canonical_product_id);

    if (!row.product_slug || !row.card_title || !row.primary_image_url || row.card_display_price_amount == null) {
      throw new Error(`STOREFRONT_CARD_READ_MODEL_REQUIRED_FIELD_MISSING:${row.canonical_product_id}`);
    }
    if (row.facet_contract_version !== STOREFRONT_CARD_FACET_CONTRACT) {
      throw new Error(`STOREFRONT_CARD_READ_MODEL_FACET_CONTRACT_MISMATCH:${row.canonical_product_id}`);
    }
    if (!/^[0-9a-f]{64}$/.test(row.approved_content_sha256) || !/^[0-9a-f]{64}$/.test(row.facet_snapshot_hash)) {
      throw new Error(`STOREFRONT_CARD_READ_MODEL_HASH_MISMATCH:${row.canonical_product_id}`);
    }
  }

  return rows;
}


function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/**
 * Minimal StorefrontProduct adapter for the existing frozen ShopClient/ProductCard contract.
 * Heavy PDP-only payloads stay empty; card price is projected into the existing
 * full_set_display_price_amount scalar so mainRegularPrice() keeps identical output.
 */
export async function readApprovedStorefrontCardProductsV1(): Promise<StorefrontProduct[]> {
  const rows = await readApprovedStorefrontCardRowsV1();

  return rows.map((row) => ({
    canonical_product_id: row.canonical_product_id,
    product_slug: row.product_slug,
    matched_etsy_listing_id: null,
    source_url: null,
    card_title: row.card_title,
    h1: row.h1,
    seo_title: row.seo_title,
    meta_description: row.meta_description,
    product_type: row.product_type,
    material: row.material,
    color: row.color,
    size_mode: null,
    production_profile: null,
    shipping_profile: null,
    handmade_flag: null,
    styled_imagery_flag: null,
    primary_image_url: row.primary_image_url,
    primary_image_alt: row.primary_image_alt,
    secondary_image_url: row.secondary_image_url,
    hover_image_url: row.hover_image_url,
    video_url: row.video_url,
    media_gallery: [],
    media_count: row.media_count,
    has_video: row.has_video,
    min_price: row.min_price == null ? null : Number(row.min_price),
    max_price: row.max_price == null ? null : Number(row.max_price),
    currency: row.currency,
    has_fallback_price: null,
    has_sampler_excluded_price: null,
    public_configuration_count: null,
    public_price_row_count: null,
    configurations: [],
    storefront_candidate_flag: true,
    full_set_display_price_amount: Number(row.card_display_price_amount),
    category_label: row.category_label,
    world_label: row.world_label,
    canonical_color_label: row.canonical_color_label,
    color_options: asStringArray(row.color_options),
    facets: buildStorefrontFacets(row, row.membership_codes),
  }));
}
