// @ts-nocheck
export const instant = true;

import type { Metadata } from 'next';
import { cache, Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { ProductDetailClient } from '@/components/ProductDetailClient';
import { readProductLandingLinks } from '@/lib/searchProductLandingLinks';
import { getMedia, mainRegularPrice, productTitle } from '@/lib/storefront';
import { readCachedStorefrontProductPresentation } from '@/lib/storefrontProductPresentationServer';
import type { StorefrontProduct } from '@/lib/types';
import { readApprovedStorefrontCopy } from '@/lib/seoApprovedStorefrontServer';
import type { ApprovedCopyPayload } from '@/lib/seoApprovedContentProjection';
import { readClosedReviewPresentation } from '@/lib/searchReviewPresentationServer';
import { absoluteSiteUrl } from '@/lib/siteConfig';
import { isHybridVisualPreviewDeployment } from '@/lib/ownerPreviewPolicy';
import { projectApprovedOfferSnapshot } from '@/lib/storefrontApprovedOfferProjection';

type PageProps = { params: Promise<{ slug: string }> };
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
  const { product, approvedCopy, copyBlocked } = await getPresentation(slug);

  if (!product || copyBlocked) {
    return {
      title: 'Product not found | TheFEYA',
      robots: { index: false, follow: true },
    };
  }

  const title = approvedCopy?.metadata.title || productTitle(product);
  const description = approvedCopy?.metadata.description || productDescription(product);
  const images = productImages(product);

  return {
    ...(approvedCopy ? { robots: { index: false, follow: false } } : {}),
    title,
    description,
    alternates: { canonical: `/shop/${slug}` },
    openGraph: {
      title,
      description,
      url: `/shop/${slug}`,
      type: 'website',
      images: images.slice(0, 4),
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
  const productCollections = cachedProductCollections ?? await readProductLandingLinks(String(product.canonical_product_id || ''));
  // This exact Vercel branch is an owner-protected visual storefront review.
  // Keep the immutable approved SEO copy projected, but do not replace the
  // existing cart controls with the generic content-review "Preview only" CTA.
  // Checkout/payment/indexing remain independently disabled by their own gates.
  const allowHybridPreviewCommerce = isHybridVisualPreviewDeployment(process.env);

  return <main className="relative min-h-screen">
    <Header />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    <ProductDetailClient product={product} related={related} draft={approvedCopy?.draft} previewMode={Boolean(approvedCopy) && !allowHybridPreviewCommerce} />
    {productCollections.length ? <section className="container-feya py-10 border-t border-[rgba(216,214,211,.12)]">
      <div className="eyebrow-gold mb-4">Explore related collections</div>
      <div className="flex flex-wrap gap-2">
        {productCollections.map((collection) => <Link key={collection.slug} href={`/collections/${collection.slug}`} className="chip">{collection.title}</Link>)}
      </div>
    </section> : null}
  </main>;
}

