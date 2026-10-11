// @ts-nocheck
export const instant = false;

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
import { ShopClient } from '@/components/ShopClient';
import {OwnerHubCatalogSkeleton} from '@/components/OwnerHubCatalogSkeleton';
import {OwnerShopSeoText} from '@/components/OwnerShopSeoText';
import {readOwnerRemoteCatalogPreviewV1} from '@/lib/ownerRemoteCatalogPreviewServer';
import {isOwnerUnifiedStorefrontPreview} from '@/lib/ownerUnifiedStorefrontPreview';

async function getProducts() {
  const reviewGate = await readClosedReviewPresentation();
  if (reviewGate.status === 'blocked') notFound();
  const review = reviewGate.status === 'review';
  try {
    const started=Date.now();
    // Read the SAME 207 approved product card payload. The remote cache is
    // already isolated to this SSO-only preview and tagged for invalidation.
    // Closed review releases still use the historic protected data projection.
    const products=review
      ? await readCachedApprovedStorefrontCatalogV1()
      : await readOwnerRemoteCatalogPreviewV1();
    console.info('owner_shop_catalog_timing',JSON.stringify({
      elapsed_ms:Date.now()-started,product_count:products.length,closed_review:review,
    }));
    return { products,review };
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
  const filterState=Boolean(query&&shopNavigationHasFilterState(query));
  return {
    title: 'Shop',
    alternates: { canonical: query ? shopPageHref(query.page, query.filters) : '/shop' },
    robots: { index:false, follow:false },

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
    <section className="container-feya pt-20 pb-4 sm:pt-24" aria-label="TheFEYA catalog">
      <p className="mb-3 text-[10px] uppercase tracking-[.18em] text-[#aaa2a0]">TheFEYA catalog</p>
      <h1 className="visual-display text-[clamp(34px,4.2vw,56px)] leading-tight text-[#f7f3ec]">Find your piece.</h1>
      <p className="mt-3 text-[14px] text-[var(--bone-dim)]">Discover original TheFEYA costume pieces and complete looks.</p>
    </section>
    <div className="container-feya py-6"><OwnerHubCatalogSkeleton/></div>
  </main>;
}

async function ResolvedShopPage({ searchParams }: ShopPageProps) {
  if(!isOwnerUnifiedStorefrontPreview(process.env))notFound();
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
  />
  {products.length>0 && navigation.page===1 && !shopNavigationHasFilterState(navigation) && !utilityState
    ? <OwnerShopSeoText/>
    : null}
  </main>;
}

