// @ts-nocheck
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Globe2, Ruler, Scissors, Sparkles, Truck } from 'lucide-react';
import { Header } from '@/components/Header';
import { ProductCard } from '@/components/ProductCard';
import { getSupabaseReadClient } from '@/lib/supabase';
import {
  STOREFRONT_FALLBACK_CARD_SELECT,
  STOREFRONT_MEDIA_FAST_SELECT,
  STOREFRONT_MEDIA_FAST_VIEW,
  STOREFRONT_VIEW_V2,
  STOREFRONT_VIEW_V4,
  STOREFRONT_V4_CARD_SELECT,
} from '@/lib/storefront';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'TheFEYA | Handmade Stagewear and Festival Looks',
  description: 'Original handmade designs for stage, festival, desert and editorial looks. Adjustable sizing and selected color/detail customization for existing TheFEYA designs.',
  alternates: { canonical: '/' },
};

const HOME_PRODUCTS_LIMIT = 16;

async function mergeMedia(supabase, products) {
  const slugs = products.map((product) => product.product_slug).filter(Boolean);
  if (!slugs.length) return products;

  const media = await supabase
    .from(STOREFRONT_MEDIA_FAST_VIEW)
    .select(STOREFRONT_MEDIA_FAST_SELECT)
    .in('product_slug', slugs);

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

  const primary = await supabase.from(STOREFRONT_VIEW_V4).select(STOREFRONT_V4_CARD_SELECT).limit(HOME_PRODUCTS_LIMIT);
  if (!primary.error && primary.data?.length) return mergeMedia(supabase, primary.data);

  const fallback = await supabase.from(STOREFRONT_VIEW_V2).select(STOREFRONT_FALLBACK_CARD_SELECT).limit(HOME_PRODUCTS_LIMIT);
  if (fallback.error || !fallback.data?.length) return [];
  return mergeMedia(supabase, fallback.data);
}

export default async function HomePage() {
  const products = await getProducts();
  const best = products.slice(0, 4);
  const fresh = products.slice(4, 8);
  const express = products.slice(8, 12);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Header />

      <section className="relative min-h-[560px] pt-28 lg:pt-32 flex items-center border-b border-[rgba(216,214,211,0.12)] overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(216,214,211,0.26),transparent_32%),radial-gradient(circle_at_18%_82%,rgba(212,178,106,0.22),transparent_35%)]" />
          <div className="absolute right-0 top-0 bottom-0 w-[50%] opacity-20 text-[13vw] font-display tracking-[-0.08em] text-white/10 flex items-center justify-center">FEYA</div>
        </div>

        <div className="container-feya relative z-10 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6">
            <div className="eyebrow-gold mb-5">TheFEYA · Original handmade designs</div>
            <h1 className="font-tall text-bone leading-[0.95] tracking-[0.03em]" style={{ fontSize: 'clamp(44px,5.5vw,82px)' }}>Handmade stagewear for unforgettable looks</h1>
            <p className="editorial-italic text-[var(--bone-dim)] text-lg lg:text-xl mt-6 max-w-xl">Statement pieces for stage, festival, desert and editorial styling. Designed by TheFEYA, with adjustable sizing and selected detail customization for existing designs.</p>
            <div className="flex flex-wrap gap-4 mt-8">
              <Link href="/shop" className="btn-chrome">Shop catalog <ArrowUpRight size={14} /></Link>
              <Link href="/collections" className="btn-ghost">Explore collections <ArrowUpRight size={14} /></Link>
            </div>
          </div>

          <div className="lg:col-span-6 hidden lg:grid grid-cols-3 gap-4 opacity-90">
            {best.slice(0, 3).map((p, i) => (
              <Link href={`/shop/${p.product_slug}`} key={p.canonical_product_id} className={`relative rounded-md overflow-hidden border border-white/10 ${i === 1 ? 'translate-y-8' : ''}`}>
                <img src={p.primary_image_url || ''} className="w-full h-[360px] object-cover" alt={p.primary_image_alt || p.card_title || ''} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              </Link>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-[rgba(216,214,211,0.12)] bg-[rgba(7,7,10,0.45)] backdrop-blur">
          <div className="container-feya grid grid-cols-2 md:grid-cols-5 gap-4 py-5 text-[11px] tracking-[0.22em] uppercase text-[var(--bone-dim)]">
            <span className="flex items-center gap-2"><Scissors size={15} /> Handmade</span>
            <span className="flex items-center gap-2"><Ruler size={15} /> Adjustable sizing</span>
            <span className="flex items-center gap-2"><Truck size={15} /> Express options</span>
            <span className="flex items-center gap-2"><Globe2 size={15} /> Worldwide</span>
            <span className="flex items-center gap-2"><Sparkles size={15} /> Original designs</span>
          </div>
        </div>
      </section>

      <ProductRail title="Stage-ready statement pieces." kicker="Best sellers · Editorial picks" products={best} />
      <ProductRail title="New for desert and festival styling." kicker="New arrivals · Handmade looks" products={fresh} />
      <ProductRail title="Complete the look." kicker="Sets and statement pieces" products={express} />
    </main>
  );
}

function ProductRail({ title, kicker, products }) {
  return (
    <section className="container-feya py-14 lg:py-20">
      <div className="flex items-end justify-between gap-8 mb-8">
        <div>
          <div className="eyebrow-gold mb-4">{kicker}</div>
          <h2 className="display-section text-bone" style={{ fontSize: 'clamp(42px,6vw,82px)' }}>{title}</h2>
        </div>
        <Link href="/shop" className="btn-ghost hidden md:inline-flex">All pieces <ArrowUpRight size={13} /></Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">
        {products.map((p, i) => <ProductCard key={p.canonical_product_id} product={p} index={i} />)}
      </div>
    </section>
  );
}
