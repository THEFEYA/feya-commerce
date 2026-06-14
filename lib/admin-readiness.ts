import { formatPrice, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontConfiguration, StorefrontProduct } from '@/lib/types';

export type AdminReviewEvent = {
  review_event_id?: string | null;
  event_type: string;
  event_status?: string | null;
  product_slug?: string | null;
  canonical_product_id?: string | null;
  configuration_id?: string | null;
  order_draft_id?: string | null;
  created_at?: string | null;
};

export type ReadinessTone = 'neutral' | 'warning' | 'danger' | 'success';

export type ProductReadiness = {
  label: 'Draft' | 'Needs Label Review' | 'Needs Price Review' | 'Needs Component Mapping' | 'Needs Media QA' | 'SEO Ready' | 'Ready for Storefront' | 'Blocked';
  tone: ReadinessTone;
};

export type ReviewChip = {
  label: string;
  tone?: ReadinessTone;
};

export type ProductFlags = {
  configs: StorefrontConfiguration[];
  missingComponent: number;
  labelReview: boolean;
  priceReview: boolean;
  mediaReview: boolean;
  fullSet: boolean;
  bundle: boolean;
};

export type AdminProductTableRow = {
  id: string;
  slug: string;
  title: string;
  imageUrl?: string | null;
  subtitle: string;
  price: string;
  confidence: string;
  configCount: number;
  configNote: string;
  readinessLabel: string;
  readinessTone: ReadinessTone;
  reviewChips: ReviewChip[];
};

export function parseConfigurations(value: unknown): StorefrontConfiguration[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as StorefrontConfiguration[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed as StorefrontConfiguration[] : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function hasSecondMedia(product: StorefrontProduct) {
  return Boolean(product.secondary_image_url || product.hover_image_url || product.has_video || Number(product.media_count || 0) > 1);
}

export function getProductFlags(product: StorefrontProduct): ProductFlags {
  const configs = parseConfigurations(product.configurations);
  const missingComponent = configs.filter((config) => !config.component_code).length;
  const labelReview = Boolean(product.needs_label_review || configs.some((config) => config.needs_label_review));
  const priceReview = product.price_confidence_status === 'unverified' || Boolean(product.needs_price_review);
  const mediaReview = !hasSecondMedia(product);
  const fullSet = configs.some((config) => config.is_full_set);
  const bundle = configs.some((config) => config.is_bundle);

  return { configs, missingComponent, labelReview, priceReview, mediaReview, fullSet, bundle };
}

export function getProductEvents(product: StorefrontProduct, events: AdminReviewEvent[]) {
  const slug = productSlug(product);
  return events
    .filter((event) => event.product_slug === slug || event.canonical_product_id === product.canonical_product_id)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}

export function getLatestEventMap(events: AdminReviewEvent[]) {
  const map = new Map<string, AdminReviewEvent>();
  for (const event of events) {
    if (!map.has(event.event_type)) map.set(event.event_type, event);
  }
  return map;
}

export function getProductReadiness(product: StorefrontProduct, events: AdminReviewEvent[]): ProductReadiness {
  const flags = getProductFlags(product);
  const latest = getLatestEventMap(events);

  if (latest.has('needs_fix')) return { label: 'Blocked', tone: 'danger' };
  if (!events.length) return { label: 'Draft', tone: 'neutral' };

  const labelOk = !flags.labelReview || latest.has('label_review_approved');
  const priceOk = !flags.priceReview || latest.has('price_review_approved');
  const componentOk = !flags.missingComponent || latest.has('component_mapping_checked');
  const mediaOk = !flags.mediaReview || latest.has('media_checked');
  const seoOk = latest.has('seo_ready_checked');

  if (!labelOk) return { label: 'Needs Label Review', tone: 'warning' };
  if (!priceOk) return { label: 'Needs Price Review', tone: 'warning' };
  if (!componentOk) return { label: 'Needs Component Mapping', tone: 'warning' };
  if (!mediaOk) return { label: 'Needs Media QA', tone: 'warning' };
  if (!seoOk) return { label: 'SEO Ready', tone: 'warning' };
  return { label: 'Ready for Storefront', tone: 'success' };
}

export function getReviewChips(product: StorefrontProduct): ReviewChip[] {
  const flags = getProductFlags(product);
  const chips: ReviewChip[] = [];
  if (flags.labelReview) chips.push({ label: 'Label', tone: 'warning' });
  if (flags.priceReview) chips.push({ label: 'Price', tone: 'warning' });
  if (flags.missingComponent) chips.push({ label: `Component ${flags.missingComponent}`, tone: 'danger' });
  if (flags.mediaReview) chips.push({ label: 'Media', tone: 'danger' });
  if (!chips.length) chips.push({ label: 'OK', tone: 'neutral' });
  return chips;
}

export function toAdminProductTableRow(product: StorefrontProduct, readiness: ProductReadiness): AdminProductTableRow {
  const flags = getProductFlags(product);
  const slug = productSlug(product);
  return {
    id: product.canonical_product_id || slug,
    slug,
    title: productTitle(product),
    imageUrl: product.primary_image_url,
    subtitle: `${worldLabel(product)} · ${product.category_label || product.product_type || 'Product'} · ${product.canonical_color_label || product.color || 'Color'}`,
    price: product.min_price != null ? formatPrice(product.min_price, product.currency || 'EUR') : '—',
    confidence: product.price_confidence_status || 'unknown',
    configCount: flags.configs.length,
    configNote: flags.fullSet ? 'Full set' : flags.bundle ? 'Bundle' : 'Options',
    readinessLabel: readiness.label,
    readinessTone: readiness.tone,
    reviewChips: getReviewChips(product),
  };
}
