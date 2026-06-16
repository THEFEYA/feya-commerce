// @ts-nocheck
import Link from 'next/link';
import { AdminProductDetailView } from '@/components/AdminProductDetailView';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_V4_PDP_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ADMIN_PRODUCTS_VIEW = 'feya_commerce_v_step6_product_catalog_overview';

const ADMIN_PRODUCT_FALLBACK_SELECT = [
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

type PageProps = { params: Promise<{ slug: string }> };

function toNumber(value: unknown) {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toAdminFallbackProduct(row: any): StorefrontProduct {
  const minPrice = toNumber(row.public_min_price);
  const maxPrice = toNumber(row.public_max_price);
  const priceNeedsReview = Boolean(row.has_fallback_price) || toNumber(row.missing_price_row_count) > 0 || toNumber(row.public_price_row_count) === 0;

  return {
    canonical_product_id: row.canonical_product_id,
    product_slug: row.canonical_product_id,
    matched_etsy_listing_id: row.matched_etsy_listing_id || row.primary_source_listing_id || null,
    source_url: row.source_url || null,
    card_title: row.card_title || row.draft_site_title || row.matched_etsy_listing_id || row.canonical_product_id,
    h1: row.card_title || row.draft_site_title || row.matched_etsy_listing_id || row.canonical_product_id,
    seo_title: null,
    meta_description: null,
    product_type: row.product_type || null,
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
    min_price: minPrice,
    max_price: maxPrice,
    currency: 'USD',
    has_fallback_price: row.has_fallback_price ?? null,
    has_sampler_excluded_price: row.has_sampler_excluded_price ?? null,
    public_configuration_count: toNumber(row.public_configuration_count),
    public_price_row_count: toNumber(row.public_price_row_count),
    configurations: [],
    storefront_candidate_flag: false,
    price_confidence_status: priceNeedsReview ? 'Needs price review' : 'Public price',
    needs_price_review: priceNeedsReview,
    needs_label_review: toNumber(row.listing_match_review_count) > 0,
    category_label: null,
    world_label: null,
    canonical_color_label: null,
    color_options: null,
  } as StorefrontProduct;
}

async function getProduct(slug: string): Promise<{ product: StorefrontProduct | null; error?: string }> {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { product: null, error: getMissingSupabaseEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_PDP_SELECT)
    .eq('product_slug', slug)
    .maybeSingle();

  if (error) return { product: null, error: error.message };
  if (data) return { product: data as StorefrontProduct };

  const { data: fallbackData, error: fallbackError } = await supabase
    .from(ADMIN_PRODUCTS_VIEW)
    .select(ADMIN_PRODUCT_FALLBACK_SELECT)
    .eq('canonical_product_id', slug)
    .maybeSingle();

  if (fallbackError) return { product: null, error: fallbackError.message };
  if (!fallbackData) return { product: null };

  return { product: toAdminFallbackProduct(fallbackData) };
}

export default async function AdminProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const { product, error } = await getProduct(slug);

  if (error || !product) {
    return <main className="min-h-screen bg-[#07070A]"><section className="container-feya pt-10 pb-16"><div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-6 text-[var(--bone-dim)]">{error || 'Товар не найден.'}</div><Link href="/admin/products" className="btn-ghost mt-5">Назад к товарам</Link></section></main>;
  }

  return <AdminProductDetailView product={product} />;
}
