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
  shopNavigationHasFilterState,
  shopNavigationHasUtilityState,
  shopNavigationNeedsNormalization,
  shopPageHref,
  SHOP_PAGE_SIZE,
} from '@/lib/shopCatalogNavigation';
import { Header } from '@/components/Header';
import { readCachedApprovedStorefrontCatalogV1 } from '@/lib/storefrontCatalogCacheServer';
import { ShopCatalogWireClient } from '@/components/ShopCatalogWireClient';
import { packStorefrontCatalog } from '@/lib/storefrontCatalogWire';
import {OwnerShopSeoText} from '@/components/OwnerShopSeoText';

/** Keep high-volume successful Shop traces opt-in; error/404 warnings stay on. */
function shouldTraceShop() {
  return process.env.VERCEL_ENV === 'production' && process.env.FEYA_SHOP_TRACE_ENABLED === 'true';
}

async function getProducts() {
  // The closed review must NEVER gate the public Production Shop. An old
  // review environment flag could otherwise cause an invisible streamed 404
  // in the catalog even though the approved 207-card source is available.
  // Owner review remains strictly confined to protected non-Production routes.
  const reviewGate = process.env.VERCEL_ENV === 'production'
    ? { status: 'disabled' as const, release: null }
    : await readClosedReviewPresentation();
  if (shouldTraceShop()) {
    console.info('feya_shop_trace_v1',JSON.stringify({stage:'review',isProduction:process.env.VERCEL_ENV === 'production',review:reviewGate.status}));
  }
  if (reviewGate.status === 'blocked') console.warn('feya_shop_not_found','review_gate_blocked');
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
  const query = parseShopNavigation(await searchParams,{ignoreUnknownParams:process.env.VERCEL_ENV === 'production'});
  const filterState=Boolean(query&&shopNavigationHasFilterState(query));
  return {
    title: 'Shop',
    alternates: { canonical: query ? shopPageHref(query.page, query.filters) : '/shop' },
    ...(closedReviewRequested(process.env)
      ? { robots: { index: false, follow: false } }
      : filterState
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
  // Unknown auxiliary query keys cannot hide the entire public catalog.
  // Approved facet/page values remain validated by parseShopNavigation.
  const navigation = parseShopNavigation(params,{ignoreUnknownParams:process.env.VERCEL_ENV === 'production'});
  if (shouldTraceShop()) {
    console.info('feya_shop_trace_v1',JSON.stringify({stage:'navigation',keys:Object.keys(params).length,valid:Boolean(navigation)}));
  }
  if (!navigation) console.warn('feya_shop_not_found','invalid_navigation');
  if (!navigation) notFound();

  const { products, error, review } = await getProducts();
  const filteredCount = filterShopProducts(products, navigation.filters).length;
  const utilityState = shopNavigationHasUtilityState(navigation);

  if (shouldTraceShop()) {
    console.info('feya_shop_trace_v1',JSON.stringify({stage:'catalog_ready',items:products.length,matched:filteredCount,page:navigation.page,hasError:Boolean(error)}));
  }
  // Empty filtered catalog is valid: customers can switch to color availability
  // without a false 404. Utility/filter routes already carry noindex.
  if (products.length && utilityState && filteredCount===0) console.info('feya_shop_filter_empty','valid_zero_matches');
  if (navigation.page > Math.max(1, Math.ceil(filteredCount / SHOP_PAGE_SIZE))) console.warn('feya_shop_not_found','invalid_page_number');
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

  return <main className="relative min-h-screen"><Header /><ShopCatalogWireClient
    key={normalizedHref}
    catalog={packStorefrontCatalog(products)}
    error={error}
    navigation={strictNavigation}
    initialNavigation={initialNavigation}
  />
  {products.length>0 && navigation.page===1 && !shopNavigationHasFilterState(navigation) && !utilityState ? <OwnerShopSeoText/> : null}
  </main>;
}

