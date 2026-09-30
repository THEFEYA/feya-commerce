// @ts-nocheck
export const instant = true;

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { readClosedReviewPresentation } from '@/lib/searchReviewPresentationServer';
import { closedReviewRequested } from '@/lib/searchReviewPresentation';
import {
  filterShopProducts,
  parseShopNavigation,
  shopHrefWithTracking,
  shopNavigationHasUtilityState,
  shopNavigationNeedsNormalization,
  shopPageHref,
  SHOP_PAGE_SIZE,
} from '@/lib/shopCatalogNavigation';
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
  const utilityState=Boolean(query&&shopNavigationHasUtilityState(query));
  return {
    title: 'Shop',
    alternates: { canonical: query ? shopPageHref(query.page, query.filters) : '/shop' },
    ...(closedReviewRequested(process.env)
      ? { robots: { index: false, follow: false } }
      : utilityState
        ? { robots: { index: false, follow: true } }
        : {}),
  };
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
  // URL state is request-time; the 207-product slim catalog remains one shared cache.
  const params = await searchParams;
  const navigation = parseShopNavigation(params);
  if (!navigation) notFound();

  const { products, error, review } = await getProducts();
  const filteredCount = filterShopProducts(products, navigation.filters).length;
  const utilityState = shopNavigationHasUtilityState(navigation);

  if (products.length && utilityState && filteredCount===0) notFound();
  if (navigation.page > Math.max(1, Math.ceil(filteredCount / SHOP_PAGE_SIZE))) notFound();

  const normalizedHref=shopPageHref(navigation.page,navigation.filters);
  if (shopNavigationNeedsNormalization(params,navigation)) {
    redirect(shopHrefWithTracking(normalizedHref,params));
  }

  // Closed review and explicit page>1 keep crawlable real-anchor pagination.
  // Normal page-1 browsing keeps the approved zero-network load-more UX while
  // receiving normalized server filters for direct-load SSR.
  const strictNavigation = review || navigation.page>1 ? navigation : undefined;
  const initialNavigation = strictNavigation ? undefined : navigation;

  return <main className="relative min-h-screen"><Header /><ShopClient
    key={normalizedHref}
    products={products}
    error={error}
    navigation={strictNavigation}
    initialNavigation={initialNavigation}
  /></main>;
}

