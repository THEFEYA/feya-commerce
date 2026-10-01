// @ts-nocheck
export const instant = true;

import type { Metadata } from 'next';
import { cache, Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { ProductDetailClient } from '@/components/ProductDetailClient';
import { readProductLandingLinks } from '@/lib/searchProductLandingLinks';
import { getMedia, productTitle } from '@/lib/storefront';
import { readCachedStorefrontProductPresentation } from '@/lib/storefrontProductPresentationServer';
import { readCachedStorefrontProductMetadataV1 } from '@/lib/storefrontProductMetadataServer';
import { releaseRobotsForPath } from '@/lib/searchReleaseIndexationServer';
import type { StorefrontProduct } from '@/lib/types';
import { readApprovedStorefrontCopy } from '@/lib/seoApprovedStorefrontServer';
import approvedContentManifest from '@/config/approved-content-review-bindings.json';
import { approvedContentReviewMode } from '@/lib/seoApprovedStorefrontPolicy';
import { closedReviewRequested } from '@/lib/searchReviewPresentation';
import type { ApprovedCopyPayload } from '@/lib/seoApprovedContentProjection';
import { readClosedReviewPresentation } from '@/lib/searchReviewPresentationServer';
import { absoluteSiteUrl } from '@/lib/siteConfig';
import { isHybridVisualPreviewDeployment } from '@/lib/ownerPreviewPolicy';
import { projectApprovedOfferSnapshot } from '@/lib/storefrontApprovedOfferProjection';

type PageProps = { params: Promise<{ slug: string }> };
function canonicalProductUrl(slug: string) {
  return absoluteSiteUrl(`/shop/${slug}`);
}

function textValue(product: StorefrontProduct, keys: string[]) {
  const record = product as StorefrontProduct & Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function productDescription(product: StorefrontProduct) {
  return textValue(product, ['meta_description', 'seo_description', 'description_meta', 'description']) || `${productTitle(product)} by TheFEYA, an original handmade design for stage, festival, desert and editorial styling.`;
}

function productImages(product: StorefrontProduct) {
  const mediaUrls = getMedia(product).map((item) => item.url).filter(Boolean);
  const fallbackUrls = [product.primary_image_url, product.secondary_image_url, product.hover_image_url].filter(Boolean);
  return Array.from(new Set([...mediaUrls, ...fallbackUrls]));
}

function productJsonLd(product: StorefrontProduct, slug: string, approvedCopy: ApprovedCopyPayload | null = null) {
  // Phase 11 stays truthful to the current commerce boundary:
  // active internal offer revisions exist, but public order creation/payment are not enabled.
  // Merchant Offer/ProductGroup markup is added only when the page can actually preselect
  // and purchase the represented variant through a crawlable public URL.
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: approvedCopy?.draft.h1 || productTitle(product),
    description: approvedCopy?.metadata.description || productDescription(product),
    image: productImages(product),
    sku: product.canonical_product_id || slug,
    url: canonicalProductUrl(slug),
    brand: {
      '@type': 'Brand',
      name: 'TheFEYA',
    },
  };
}

function productBreadcrumbJsonLd(product: StorefrontProduct, slug: string, approvedCopy: ApprovedCopyPayload | null = null) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://thefeya.com/' },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: 'https://thefeya.com/shop' },
      {
        '@type': 'ListItem',
        position: 3,
        name: approvedCopy?.draft.h1 || productTitle(product),
        item: canonicalProductUrl(slug),
      },
    ],
  };
}

// One request-scoped source for head, JSON-LD and existing PDP props.
// Only the public Product Truth/detail payload is persistent-cache backed.
// Review/auth overlays stay request-scoped and never enter the shared cache.
const getPresentation = cache(async (slug: string) => {
  const hybridVisualPreview = isHybridVisualPreviewDeployment(process.env);
  const review = hybridVisualPreview ? { status: 'disabled' as const, release: null } : await readClosedReviewPresentation();
  if (review.status === 'blocked') return { product: null, related: [], productCollections: null, approvedCopy: null, approvedOfferSnapshot: null, copyBlocked: true, error: null };
  if (review.status === 'review') {
    const entry = review.release.entries.find(e => e.product.product_slug === slug);
    return { product: entry?.product ?? null, related: [], productCollections: null, approvedCopy: entry?.copy ?? null, approvedOfferSnapshot: null, copyBlocked: !entry, error: null };
  }

  try {
    const result = await readCachedStorefrontProductPresentation(slug);
    const approved = result.product ? await readApprovedStorefrontCopy(result.product) : null;
    const projectedProduct = hybridVisualPreview && result.product && approved?.status === 'review'
      ? projectApprovedOfferSnapshot(result.product, approved.offerSnapshot)
      : result.product;
    return {
      ...result,
      product: projectedProduct,
      approvedCopy: approved?.copy ?? null,
      approvedOfferSnapshot: approved?.status === 'review' ? approved.offerSnapshot : null,
      copyBlocked: approved?.status === 'blocked',
    };
  } catch {
    return { product: null, related: [], productCollections: null, approvedCopy: null, approvedOfferSnapshot: null, copyBlocked: false, error: 'Product data is temporarily unavailable.' };
  }
});
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const path=`/shop/${slug}`;
  const protectedReviewMetadata = isHybridVisualPreviewDeployment(process.env)
    || closedReviewRequested(process.env)
    || approvedContentReviewMode(process.env, approvedContentManifest.version) !== 'disabled';

  // Protected review modes intentionally project pinned owner-approved copy and
  // must keep their authenticated/request-scoped source path. Public production
  // uses the slim metadata read model below so search-crawler <head> generation
  // does not depend on the full PDP presentation payload.
  if(protectedReviewMetadata){
    const {product,approvedCopy,copyBlocked}=await getPresentation(slug);
    if(!product||copyBlocked){
      return{
        title:'Product not found | TheFEYA',
        robots:{index:false,follow:true},
      };
    }

    const title=approvedCopy?.metadata.title||productTitle(product);
    const description=approvedCopy?.metadata.description||productDescription(product);
    const images=productImages(product);
    return{
      robots:approvedCopy?{index:false,follow:false}:await releaseRobotsForPath(path),
      title,
      description,
      alternates:{canonical:path},
      openGraph:{
        title,
        description,
        url:path,
        type:'website',
        images:images.slice(0,4),
      },
    };
  }

  const [metadata,robots]=await Promise.all([
    readCachedStorefrontProductMetadataV1(slug),
    releaseRobotsForPath(path),
  ]);

  if(!metadata){
    return{
      title:'Product not found | TheFEYA',
      alternates:{canonical:path},
      robots:{index:false,follow:true},
    };
  }

  return{
    robots,
    title:metadata.title,
    description:metadata.description,
    alternates:{canonical:path},
    openGraph:{
      title:metadata.title,
      description:metadata.description,
      url:path,
      type:'website',
      images:metadata.images.slice(0,4),
    },
  };
}

export default function ProductPage(props: PageProps) {
  return <Suspense fallback={<ProductRouteFallback />}>
    <ResolvedProductPage {...props} />
  </Suspense>;
}

function ProductRouteFallback() {
  return <main className="relative min-h-screen">
    <Suspense fallback={null}><Header /></Suspense>
  </main>;
}

async function ResolvedProductPage({ params }: PageProps) {
  const { slug } = await params;
  const { product, related, error, approvedCopy, copyBlocked, productCollections: cachedProductCollections } = await getPresentation(slug);
  if (copyBlocked) notFound();
  if (error) return <main className="min-h-screen"><Header /><div className="container-feya pt-40"><div className="glass rounded-xl p-6 text-bone-dim">{error}</div></div></main>;
  if (!product) return <main className="min-h-screen"><Header /><div className="container-feya pt-40"><div className="glass rounded-xl p-6">Product not found. <Link className="text-gold" href="/shop">Back to shop</Link></div></div></main>;

  const jsonLd = productJsonLd(product, slug, approvedCopy);
  const breadcrumbLd = productBreadcrumbJsonLd(product, slug, approvedCopy);
  const productCollections = cachedProductCollections ?? await readProductLandingLinks(String(product.canonical_product_id || ''));
  // This exact Vercel branch is an owner-protected visual storefront review.
  // Keep the immutable approved SEO copy projected, but do not replace the
  // existing cart controls with the generic content-review "Preview only" CTA.
  // Checkout/payment/indexing remain independently disabled by their own gates.
  const allowHybridPreviewCommerce = isHybridVisualPreviewDeployment(process.env);

  return <main className="relative min-h-screen">
    <Header />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c') }} />
    <ProductDetailClient product={product} related={related} draft={approvedCopy?.draft} previewMode={Boolean(approvedCopy) && !allowHybridPreviewCommerce} />
    {productCollections.length ? <section className="container-feya py-10 border-t border-[rgba(216,214,211,.12)]">
      <div className="eyebrow-gold mb-4">Explore related collections</div>
      <div className="flex flex-wrap gap-2">
        {productCollections.map((collection) => <Link key={collection.slug} href={`/collections/${collection.slug}`} className="chip">{collection.title}</Link>)}
      </div>
    </section> : null}
  </main>;
}

