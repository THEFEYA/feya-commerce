// @ts-nocheck
import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { readClosedReviewPresentation } from '@/lib/searchReviewPresentationServer';
import { closedReviewRequested } from '@/lib/searchReviewPresentation';
import { filterShopProducts, parseShopNavigation, shopPageHref, SHOP_PAGE_SIZE } from '@/lib/shopCatalogNavigation';
import { Header } from '@/components/Header';
import { ShopClient } from '@/components/ShopClient';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { summarizeCollections } from '@/lib/public-collections';
import { STOREFRONT_CARD_SELECT, STOREFRONT_FALLBACK_CARD_SELECT, STOREFRONT_MEDIA_FAST_SELECT, STOREFRONT_MEDIA_FAST_VIEW, STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V1, STOREFRONT_VIEW_V2, STOREFRONT_VIEW_V3, STOREFRONT_VIEW_V4 } from '@/lib/storefront';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MEDIA_LOOKUP_CHUNK_SIZE = 35;
const SHOP_PRODUCTS_LIMIT = 500;

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

const getProducts = cache(async () => {
  const review = await readClosedReviewPresentation();
  if (review.status === 'blocked') notFound();
  if (review.status === 'review') return { products: review.release.entries.map(e => e.product), review: true };
  const supabase = getSupabaseReadClient();
  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };

  const v4 = await supabase.from(STOREFRONT_VIEW_V4).select(STOREFRONT_V4_CARD_SELECT).limit(SHOP_PRODUCTS_LIMIT);
  if (!v4.error && v4.data?.length) return { products: await mergeMedia(supabase, v4.data) };

  const v3 = await supabase.from(STOREFRONT_VIEW_V3).select(STOREFRONT_CARD_SELECT).limit(SHOP_PRODUCTS_LIMIT);
  if (!v3.error && v3.data?.length) return { products: await mergeMedia(supabase, v3.data) };

  const v2 = await supabase.from(STOREFRONT_VIEW_V2).select(STOREFRONT_FALLBACK_CARD_SELECT).limit(SHOP_PRODUCTS_LIMIT);
  if (!v2.error && v2.data?.length) return { products: await mergeMedia(supabase, v2.data) };

  const v1 = await supabase.from(STOREFRONT_VIEW_V1).select(STOREFRONT_FALLBACK_CARD_SELECT).limit(SHOP_PRODUCTS_LIMIT);
  if (!v1.error && v1.data?.length) return { products: await mergeMedia(supabase, v1.data) };

  return { products: [], error: v4.error?.message || v3.error?.message || v2.error?.message || v1.error?.message || 'No storefront products returned.' };
});

type ShopPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: ShopPageProps): Promise<Metadata> {
  const query = parseShopNavigation(await searchParams);
  return { title: 'Shop', alternates: { canonical: query ? shopPageHref(query.page, query.filters) : '/shop' },
    ...(closedReviewRequested(process.env) ? { robots: { index: false, follow: false } } : {}) };
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const { products, error, review } = await getProducts();
  const params = await searchParams;
  const navigation = review ? parseShopNavigation(params) : undefined;
  if (review && !navigation) notFound();
  if (navigation) {
    const count = filterShopProducts(products, navigation.filters).length;
    if (navigation.page > Math.max(1, Math.ceil(count / SHOP_PAGE_SIZE))) notFound();
    if (params.page === '1') redirect(shopPageHref(1, navigation.filters));
  }
  const collections = summarizeCollections(products);
  return <main className="relative min-h-screen"><Header /><ShopClient key={navigation ? shopPageHref(navigation.page, navigation.filters) : 'legacy'} products={products} error={error} collections={collections} navigation={navigation} /></main>;
}

