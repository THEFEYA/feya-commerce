// @ts-nocheck
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { Header } from '@/components/Header';
import { ProductCard } from '@/components/ProductCard';
import { getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_MEDIA_FAST_SELECT, STOREFRONT_MEDIA_FAST_VIEW, STOREFRONT_VIEW_V4, STOREFRONT_V4_CARD_SELECT, productTitle } from '@/lib/storefront';
import { getPublicCollection, productsForCollection } from '@/lib/public-collections';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ axis: string }> };
const PRODUCT_LIMIT = 500;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thefeya.com';

async function mergeMedia(supabase, products) {
  const slugs = products.map((product) => product.product_slug).filter(Boolean);
  if (!slugs.length) return products;

  const media = await supabase.from(STOREFRONT_MEDIA_FAST_VIEW).select(STOREFRONT_MEDIA_FAST_SELECT).in('product_slug', slugs);
  if (media.error || !media.data?.length) return products;

  const bySlug = new Map(media.data.map((item) => [item.product_slug, item]));
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
  if (!supabase) return [];

  const { data, error } = await supabase.from(STOREFRONT_VIEW_V4).select(STOREFRONT_V4_CARD_SELECT).limit(PRODUCT_LIMIT);
  if (error || !data?.length) return [];
  return mergeMedia(supabase, data);
}

function collectionJsonLd(collection, products) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${collection.title} | TheFEYA`,
    description: collection.description,
    url: `${siteUrl}/collections/${collection.slug}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: products.slice(0, 24).map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${siteUrl}/shop/${product.product_slug}`,
        name: productTitle(product),
      })),
    },
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { axis } = await params;
  const collection = getPublicCollection(axis);
  if (!collection) return { title: 'Collection not found | TheFEYA', robots: { index: false, follow: true } };

  return {
    title: `${collection.title} | TheFEYA`,
    description: collection.description,
    alternates: { canonical: `/collections/${axis}` },
  };
}

export default async function CollectionDetailPage({ params }: PageProps) {
  const { axis } = await params;
  const collection = getPublicCollection(axis);
  if (!collection) notFound();

  const allProducts = await getProducts();
  const products = productsForCollection(allProducts, axis);
  if (!products.length) notFound();

  const jsonLd = collectionJsonLd(collection, products);

  return <main className="relative min-h-screen overflow-hidden">
    <Header />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    <section className="container-feya pt-32 pb-12">
      <div className="eyebrow-gold mb-5">TheFEYA · {collection.kind} collection</div>
      <h1 className="font-tall text-bone leading-[0.95] tracking-[0.03em]" style={{ fontSize: 'clamp(44px,5.5vw,82px)' }}>{collection.title}</h1>
      <p className="mt-6 max-w-3xl text-[16px] leading-relaxed text-[var(--bone-dim)]">{collection.description}</p>
      <div className="mt-6 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.18em] text-[var(--bone-dim)]">
        <span>{products.length} pieces</span>
        <span>Real storefront products only</span>
      </div>
    </section>

    <section className="container-feya pb-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">
        {products.map((product, index) => <ProductCard key={product.canonical_product_id || product.product_slug} product={product} index={index} />)}
      </div>
      <div className="mt-10">
        <Link href="/collections" className="btn-ghost">All collections <ArrowUpRight size={13} /></Link>
      </div>
    </section>
  </main>;
}
