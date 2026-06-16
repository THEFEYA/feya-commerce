// @ts-nocheck
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Header } from '@/components/Header';
import { getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_MEDIA_FAST_SELECT, STOREFRONT_MEDIA_FAST_VIEW, STOREFRONT_VIEW_V4, STOREFRONT_V4_CARD_SELECT } from '@/lib/storefront';
import { summarizeCollections } from '@/lib/public-collections';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Collections | TheFEYA',
  description: 'Explore TheFEYA handmade stagewear and festival looks by product type, styling world and real storefront product groups.',
  alternates: { canonical: '/collections' },
};

const PRODUCT_LIMIT = 500;

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

export default async function CollectionsPage() {
  const products = await getProducts();
  const collections = summarizeCollections(products);

  return <main className="relative min-h-screen overflow-hidden">
    <Header />
    <section className="container-feya pt-32 pb-16">
      <div className="eyebrow-gold mb-5">TheFEYA · Real product groups</div>
      <h1 className="font-tall text-bone leading-[0.95] tracking-[0.03em]" style={{ fontSize: 'clamp(44px,5.5vw,82px)' }}>Collections</h1>
      <p className="mt-6 max-w-3xl text-[16px] leading-relaxed text-[var(--bone-dim)]">Explore TheFEYA by real storefront product groups. These pages are generated only when matching products exist, so collection structure stays connected to the actual catalog.</p>
    </section>

    <section className="container-feya pb-20">
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {collections.map((collection) => {
          const hero = collection.products[0];
          return <Link key={collection.slug} href={`/collections/${collection.slug}`} className="group relative min-h-[360px] overflow-hidden rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]">
            {hero?.primary_image_url ? <img src={hero.primary_image_url} alt={hero.primary_image_alt || collection.title} className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-[1.04]" /> : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <div className="eyebrow-gold mb-3">{collection.products.length} pieces · {collection.kind}</div>
              <h2 className="text-bone text-[28px] leading-tight font-medium">{collection.title}</h2>
              <p className="mt-3 text-[13px] leading-relaxed text-[var(--bone-dim)]">{collection.description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--gold-warm)]">View collection <ArrowUpRight size={13} /></span>
            </div>
          </Link>;
        })}
      </div>

      {!collections.length ? <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-6 text-[13px] text-[var(--bone-dim)]">No public collections are ready yet because no storefront products were returned.</div> : null}
    </section>
  </main>;
}
