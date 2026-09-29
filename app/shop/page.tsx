// @ts-nocheck
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { closedReviewRequested } from '@/lib/searchReviewPresentation';
import { filterShopProducts, parseShopNavigation, shopPageHref, SHOP_PAGE_SIZE } from '@/lib/shopCatalogNavigation';
import { Header } from '@/components/Header';
import { readApprovedStorefrontCardProductsV1 } from '@/lib/storefrontCardReadModelServer';
import { ShopClient } from '@/components/ShopClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getProducts() {
  const review = closedReviewRequested(process.env);
  try {
    return {
      products: await readApprovedStorefrontCardProductsV1(),
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
  return <main className="relative min-h-screen"><Header /><ShopClient key={navigation ? shopPageHref(navigation.page, navigation.filters) : 'legacy'} products={products} error={error} navigation={navigation} /></main>;
}

