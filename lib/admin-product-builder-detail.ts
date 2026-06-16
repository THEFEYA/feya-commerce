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

type JsonRecord = Record<string, unknown>;

type BuilderPrice = JsonRecord & {
  sampler_excluded_flag?: boolean | null;
  public_price_amount?: unknown;
  manual_override_amount?: unknown;
  source_amount?: unknown;
  source_currency?: string | null;
  fallback_flag?: boolean | null;
  review_status?: string | null;
};

type BuilderConfiguration = JsonRecord & {
  prices?: unknown;
  sellable_configuration_id?: string | number | null;
  configuration_id?: string | number | null;
  configuration_name?: string | null;
  normalized_key?: string | null;
  is_default_whole_product?: boolean | null;
  is_public_candidate?: boolean | null;
  review_status?: string | null;
};

type BuilderMediaItem = JsonRecord & {
  use_publicly_flag?: boolean | null;
  source_image_url?: string | null;
  source_image_order?: number | string | null;
  alt_text_draft?: string | null;
  assigned_role?: string | null;
  ai_styled_image_flag?: boolean | null;
};

type BuilderContentItem = JsonRecord & {
  card_title?: string | null;
  h1?: string | null;
  seo_title?: string | null;
  meta_description?: string | null;
};

type BuilderMatchItem = JsonRecord & {
  review_status?: string | null;
};

type BuilderRow = JsonRecord & {
  canonical_product_id: string;
  primary_source_listing_id?: string | null;
  matched_etsy_listing_id?: string | null;
  source_url?: string | null;
  draft_site_title?: string | null;
  card_title?: string | null;
  h1?: string | null;
  seo_title?: string | null;
  meta_description?: string | null;
  product_type?: string | null;
  material?: string | null;
  color?: string | null;
  size_mode?: string | null;
  production_profile?: string | null;
  shipping_profile?: string | null;
  handmade_flag?: boolean | null;
  styled_imagery_flag?: boolean | null;
  configurations?: unknown;
  media_items?: unknown;
  content_items?: unknown;
  match_items?: unknown;
};

type NormalizedConfiguration = BuilderConfiguration & {
  configuration_id: string;
  public_label: string;
  configuration_label: string;
  display_price_amount: number | null;
  base_price_amount: number | null;
  price_amount: number | null;
  currency: string;
  is_full_set: boolean;
  is_bundle: boolean;
  needs_label_review: boolean;
};

type NormalizedMedia = {
  url: string;
  image_url: string;
  alt: string;
  media_type: 'image';
  position: number;
  assigned_role: string | null;
  ai_styled_image_flag: boolean | null;
};

function asArray<T extends JsonRecord = JsonRecord>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== 'string' || !value.trim() || value === 'null') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() && value !== 'null' ? value.trim() : null;
}

function firstContent(row: BuilderRow): BuilderContentItem {
  return asArray<BuilderContentItem>(row.content_items)[0] || {};
}

function normalizeBuilderConfigurations(row: BuilderRow): NormalizedConfiguration[] {
  return asArray<BuilderConfiguration>(row.configurations).map((configuration, index) => {
    const prices = asArray<BuilderPrice>(configuration.prices);
    const primaryPrice = prices.find((price) => price.sampler_excluded_flag !== true) || prices[0] || {};
    const amount = toNumber(primaryPrice.public_price_amount)
      ?? toNumber(primaryPrice.manual_override_amount)
      ?? toNumber(primaryPrice.source_amount);
    const label = textOrNull(configuration.configuration_name)
      || textOrNull(configuration.normalized_key)
      || `Option ${index + 1}`;

    return {
      ...configuration,
      configuration_id: String(configuration.sellable_configuration_id || configuration.configuration_id || index + 1),
      public_label: label,
      configuration_label: label,
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

function normalizeBuilderMedia(row: BuilderRow): NormalizedMedia[] {
  return asArray<BuilderMediaItem>(row.media_items)
    .filter((item) => item.use_publicly_flag !== false && Boolean(item.source_image_url))
    .sort((a, b) => Number(a.source_image_order || 0) - Number(b.source_image_order || 0))
    .map((item, index) => ({
      url: String(item.source_image_url),
      image_url: String(item.source_image_url),
      alt: textOrNull(item.alt_text_draft)
        || textOrNull(row.card_title)
        || textOrNull(row.h1)
        || textOrNull(row.draft_site_title)
        || 'TheFEYA product image',
      media_type: 'image' as const,
      position: Number(item.source_image_order || index + 1),
      assigned_role: textOrNull(item.assigned_role),
      ai_styled_image_flag: item.ai_styled_image_flag ?? null,
    }));
}

function priceStats(configurations: NormalizedConfiguration[]) {
  const amounts = configurations
    .map((configuration) => toNumber(configuration.display_price_amount))
    .filter((amount): amount is number => amount != null);
  return {
    min: amounts.length ? Math.min(...amounts) : null,
    max: amounts.length ? Math.max(...amounts) : null,
  };
}

function builderCurrency(row: BuilderRow): string {
  for (const configuration of asArray<BuilderConfiguration>(row.configurations)) {
    for (const price of asArray<BuilderPrice>(configuration.prices)) {
      if (price.source_currency) return price.source_currency;
    }
  }
  return 'EUR';
}

function builderNeedsPriceReview(row: BuilderRow): boolean {
  return asArray<BuilderConfiguration>(row.configurations).some((configuration) => {
    if (configuration.review_status && configuration.review_status !== 'approved') return true;
    return asArray<BuilderPrice>(configuration.prices).some((price) => price.fallback_flag === true || price.review_status !== 'approved');
  });
}

export function toBuilderStorefrontProduct(rawRow: unknown): StorefrontProduct {
  const row = rawRow as BuilderRow;
  const content = firstContent(row);
  const configurations = normalizeBuilderConfigurations(row);
  const mediaGallery = normalizeBuilderMedia(row);
  const prices = priceStats(configurations);
  const needsPriceReview = builderNeedsPriceReview(row);
  const needsLabelReview = asArray<BuilderMatchItem>(row.match_items).some((item) => item.review_status && item.review_status !== 'approved');
  const primaryMedia = mediaGallery[0] || null;
  const secondaryMedia = mediaGallery[1] || null;
  const hoverMedia = mediaGallery[2] || null;
  const title = textOrNull(content.card_title)
    || textOrNull(row.card_title)
    || textOrNull(row.draft_site_title)
    || textOrNull(row.h1)
    || row.canonical_product_id;
  const h1 = textOrNull(content.h1) || textOrNull(row.h1) || title;

  return {
    canonical_product_id: row.canonical_product_id,
    product_slug: row.canonical_product_id,
    matched_etsy_listing_id: textOrNull(row.matched_etsy_listing_id) || textOrNull(row.primary_source_listing_id),
    source_url: textOrNull(row.source_url),
    card_title: title,
    h1,
    seo_title: textOrNull(content.seo_title) || textOrNull(row.seo_title),
    meta_description: textOrNull(content.meta_description) || textOrNull(row.meta_description),
    product_type: textOrNull(row.product_type),
    material: textOrNull(row.material),
    color: textOrNull(row.color),
    size_mode: textOrNull(row.size_mode),
    production_profile: textOrNull(row.production_profile),
    shipping_profile: textOrNull(row.shipping_profile),
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
  };
}
