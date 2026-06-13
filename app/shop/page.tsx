// @ts-nocheck
import { Header } from '@/components/Header';
import { ShopClient } from '@/components/ShopClient';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_CARD_SELECT, STOREFRONT_FALLBACK_CARD_SELECT, STOREFRONT_MEDIA_FAST_SELECT, STOREFRONT_MEDIA_FAST_VIEW, STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V1, STOREFRONT_VIEW_V2, STOREFRONT_VIEW_V3, STOREFRONT_VIEW_V4 } from '@/lib/storefront';

export const revalidate = 300;

const MEDIA_LOOKUP_CHUNK_SIZE = 35;

function chunkValues(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function fetchMediaForSlugs(supabase, slugs) {
  const rows = [];
  const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)));

  for (const chunk of chunkValues(uniqueSlugs, MEDIA_LOOKUP_CHUNK_SIZE)) {
    const media = await supabase
      .from(STOREFRONT_MEDIA_FAST_VIEW)
      .select(STOREFRONT_MEDIA_FAST_SELECT)
      .in('product_slug', chunk);

    if (!media.error && media.data?.length) {
      rows.push(...media.data);
    }
  }

  return rows;
}

async function mergeMedia(supabase, products) {
  const slugs = products.map((product) => product.product_slug).filter(Boolean);
  if (!slugs.length) return products;

  const mediaRows = await fetchMediaForSlugs(supabase, slugs);
  if (!mediaRows.length) return products;

  const bySlug = new Map(mediaRows.map((item) => [item.product_slug, item]));
  return products.map((product) => {
    const item = bySlug.get(product.product_slug);
    if (!item) return product;
    return {
      ...product,
      primary_image_url: item.primary_image_url || product.primary_image_url,
      primary_image_alt: item.primary_image_alt || product.primary_image_alt,
      secondary_image_url: item.secondary_image_url || product.secondary_image_url,
      hover_image_url: item.hover_image_url || product.hover_image_url,
      video_url: item.video_url || product.video_url,
      has_video: item.has_video ?? product.has_video,
      media_count: item.media_count ?? product.media_count,
      media_gallery: item.media_gallery || product.media_gallery,
    };
  });
}

async function getProducts() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };

  const v4 = await supabase.from(STOREFRONT_VIEW_V4).select(STOREFRONT_V4_CARD_SELECT).limit(250);
  if (!v4.error && v4.data?.length) return { products: await mergeMedia(supabase, v4.data) };

  const v3 = await supabase.from(STOREFRONT_VIEW_V3).select(STOREFRONT_CARD_SELECT).limit(250);
  if (!v3.error && v3.data?.length) return { products: await mergeMedia(supabase, v3.data) };

  const v2 = await supabase.from(STOREFRONT_VIEW_V2).select(STOREFRONT_FALLBACK_CARD_SELECT).limit(250);
  if (!v2.error && v2.data?.length) return { products: await mergeMedia(supabase, v2.data) };

  const v1 = await supabase.from(STOREFRONT_VIEW_V1).select(STOREFRONT_FALLBACK_CARD_SELECT).limit(250);
  if (!v1.error && v1.data?.length) return { products: await mergeMedia(supabase, v1.data) };

  return { products: [], error: v4.error?.message || v3.error?.message || v2.error?.message || v1.error?.message || 'No storefront products returned.' };
}

export default async function ShopPage() {
  const { products, error } = await getProducts();
  return <main className="relative min-h-screen"><Header /><ShopClient products={products} error={error} /></main>;
}
