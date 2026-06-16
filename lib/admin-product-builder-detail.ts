// @ts-nocheck
import type { StorefrontProduct } from '@/lib/types';

export const ADMIN_PRODUCT_BUILDER_DETAIL_VIEW = 'feya_commerce_v_step6_product_builder_detail';

export const ADMIN_PRODUCT_BUILDER_DETAIL_SELECT = [
  'canonical_product_id',
  'source_shop_code',
  'primary_source_listing_id',
  'matched_etsy_listing_id',
  'source_url',
  'draft_site_title',
  'card_title',
  'h1',
  'seo_title',
  'meta_description',
  'product_type',
  'material',
  'color',
  'size_mode',
  'production_profile',
  'shipping_profile',
  'handmade_flag',
  'styled_imagery_flag',
  'publish_status',
  'readiness_status',
  'do_not_publish_flag',
  'notes',
  'configurations',
  'media_items',
  'content_items',
  'match_items'
].join(',');

function asArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim() || value === 'null') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toNumber(value: unknown) {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function firstContent(row: any) {
  return asArray(row.content_items)[0] || {};
}

function normalizeBuilderConfigurations(row: any) {
  return asArray(row.configurations).map((configuration: any, index: number) => {
    const prices = asArray(configuration.prices);
    const primaryPrice = prices.find((price: any) => price && price.sampler_excluded_flag !== true) || prices[0] || {};
    const amount = toNumber(primaryPrice.public_price_amount)
      ?? toNumber(primaryPrice.manual_override_amount)
      ?? toNumber(primaryPrice.source_amount);

    return {
      ...configuration,
      configuration_id: configuration.sellable_configuration_id || configuration.configuration_id || String(index + 1),
      public_label: configuration.configuration_name || configuration.normalized_key || `Option ${index + 1}`,
      configuration_label: configuration.configuration_name || configuration.normalized_key || `Option ${index + 1}`,
      display_price_amount: amount,
      base_price_amount: amount,
      price_amount: amount,
      currency: primaryPrice.source_currency || 'EUR',
      is_full_set: configuration.is_default_whole_product === true,
      is_bundle: prices.length > 1,
      needs_label_review: Boolean(configuration.review_status && configuration.review_status !== 'approved'),
    };
  });
}

function normalizeBuilderMedia(row: any) {
  return asArray(row.media_items)
    .filter((item: any) => item && item.use_publicly_flag !== false && item.source_image_url)
    .sort((a: any, b: any) => Number(a.source_image_order || 0) - Number(b.source_image_order || 0))
    .map((item: any, index: number) => ({
      url: item.source_image_url,
      image_url: item.source_image_url,
      alt: item.alt_text_draft || row.card_title || row.h1 || row.draft_site_title || 'TheFEYA product image',
      media_type: 'image',
      position: Number(item.source_image_order || index + 1),
      assigned_role: item.assigned_role || null,
      ai_styled_image_flag: item.ai_styled_image_flag ?? null,
    }));
}

function priceStats(configurations: any[]) {
  const amounts = configurations
    .map((configuration) => toNumber(configuration.display_price_amount))
    .filter((amount) => amount != null) as number[];
  return {
    min: amounts.length ? Math.min(...amounts) : null,
    max: amounts.length ? Math.max(...amounts) : null,
  };
}

function builderCurrency(row: any) {
  for (const configuration of asArray(row.configurations)) {
    for (const price of asArray(configuration.prices)) {
      if (price?.source_currency) return price.source_currency;
    }
  }
  return 'EUR';
}

function builderNeedsPriceReview(row: any) {
  return asArray(row.configurations).some((configuration: any) => {
    if (configuration.review_status && configuration.review_status !== 'approved') return true;
    return asArray(configuration.prices).some((price: any) => price?.fallback_flag === true || price?.review_status !== 'approved');
  });
}

export function toBuilderStorefrontProduct(row: any): StorefrontProduct {
  const content = firstContent(row);
  const configurations = normalizeBuilderConfigurations(row);
  const mediaGallery = normalizeBuilderMedia(row);
  const prices = priceStats(configurations);
  const needsPriceReview = builderNeedsPriceReview(row);
  const needsLabelReview = asArray(row.match_items).some((item: any) => item?.review_status && item.review_status !== 'approved');
  const primaryMedia = mediaGallery[0] || null;
  const secondaryMedia = mediaGallery[1] || null;
  const hoverMedia = mediaGallery[2] || null;

  return {
    canonical_product_id: row.canonical_product_id,
    product_slug: row.canonical_product_id,
    matched_etsy_listing_id: row.matched_etsy_listing_id || row.primary_source_listing_id || null,
    source_url: row.source_url || null,
    card_title: content.card_title || row.card_title || row.draft_site_title || row.h1 || row.canonical_product_id,
    h1: content.h1 || row.h1 || row.card_title || row.draft_site_title || row.canonical_product_id,
    seo_title: content.seo_title || row.seo_title || null,
    meta_description: content.meta_description || row.meta_description || null,
    product_type: row.product_type || null,
    material: row.material || null,
    color: row.color === 'null' ? null : row.color || null,
    size_mode: row.size_mode || null,
    production_profile: row.production_profile || null,
    shipping_profile: row.shipping_profile || null,
    handmade_flag: row.handmade_flag ?? null,
    styled_imagery_flag: row.styled_imagery_flag ?? null,
    primary_image_url: primaryMedia?.url || null,
    primary_image_alt: primaryMedia?.alt || null,
    secondary_image_url: secondaryMedia?.url || null,
    hover_image_url: hoverMedia?.url || null,
    video_url: null,
    media_gallery: mediaGallery,
    media_count: mediaGallery.length,
    has_video: false,
    min_price: prices.min,
    max_price: prices.max,
    currency: builderCurrency(row),
    has_fallback_price: needsPriceReview,
    has_sampler_excluded_price: false,
    public_configuration_count: configurations.filter((configuration) => configuration.is_public_candidate !== false).length,
    public_price_row_count: configurations.length,
    configurations,
    storefront_candidate_flag: false,
    price_confidence_status: needsPriceReview ? 'Needs price review' : 'Public price',
    needs_price_review: needsPriceReview,
    needs_label_review: needsLabelReview,
    category_label: null,
    world_label: null,
    canonical_color_label: null,
    color_options: null,
  } as StorefrontProduct;
}
