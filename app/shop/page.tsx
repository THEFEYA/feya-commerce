// @ts-nocheck
export const instant = true;

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { readClosedReviewPresentation } from '@/lib/searchReviewPresentationServer';
import { closedReviewRequested } from '@/lib/searchReviewPresentation';
import { filterShopProducts, parseShopNavigation, shopPageHref, SHOP_PAGE_SIZE } from '@/lib/shopCatalogNavigation';
import { Header } from '@/components/Header';
import { readCachedApprovedStorefrontCatalogV1 } from '@/lib/storefrontCatalogCacheServer';
import { ShopClient } from '@/components/ShopClient';

async function getProducts() {
  const reviewGate = await readClosedReviewPresentation();
  if (reviewGate.status === 'blocked') notFound();
  const review = reviewGate.status === 'review';
  try {
    return {
      products: await readCachedApprovedStorefrontCatalogV1(),
      review,
    };
  } catch (error) {
    const code = error instanceof Error ? error.message.split(':')[0] : 'unavailable';
    console.warn('storefront_card_read_model_failed', code);
    if (review) notFound();
    return {
      products: [],
      error: 'Storefront catalog is temporarily unavailable.',
      review: false,
    };
  }
}

type ShopPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: ShopPageProps): Promise<Metadata> {
  const query = parseShopNavigation(await searchParams);
  return { title: 'Shop', alternates: { canonical: query ? shopPageHref(query.page, query.filters) : '/shop' },
    ...(closedReviewRequested(process.env) ? { robots: { index: false, follow: false } } : {}) };
}

export default function ShopPage(props: ShopPageProps) {
  return <Suspense fallback={<ShopRouteFallback />}>
    <ResolvedShopPage {...props} />
  </Suspense>;
}

function ShopRouteFallback() {
  return <main className="relative min-h-screen">
    <Suspense fallback={null}><Header /></Suspense>
  </main>;
}

async function ResolvedShopPage({ searchParams }: ShopPageProps) {
  // Resolve URL runtime data first so Cache Components can prerender/stream the
  // shell without touching the catalog source during build-time prerendering.
  const params = await searchParams;
  const { products, error, review } = await getProducts();
  const navigation = review ? parseShopNavigation(params) : undefined;
  if (review && !navigation) notFound();
  if (navigation) {
    const count = filterShopProducts(products, navigation.filters).length;
    if (navigation.page > Math.max(1, Math.ceil(count / SHOP_PAGE_SIZE))) notFound();
    if (params.page === '1') redirect(shopPageHref(1, navigation.filters));
  }
  return <main className="relative min-h-screen"><Header /><ShopClient key={navigation ? shopPageHref(navigation.page, navigation.filters) : 'legacy'} products={products} error={error} navigation={navigation} /></main>;
}

