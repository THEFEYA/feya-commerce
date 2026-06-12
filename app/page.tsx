// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Sparkles, Scissors, Ruler, Truck, Globe2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { ProductCard } from '@/components/ProductCard';
import { getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_FALLBACK_CARD_SELECT, STOREFRONT_MEDIA_FAST_SELECT, STOREFRONT_MEDIA_FAST_VIEW, STOREFRONT_VIEW_V2 } from '@/lib/storefront';

export const revalidate = 300;

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
  const { data, error } = await supabase.from(STOREFRONT_VIEW_V2).select(STOREFRONT_FALLBACK_CARD_SELECT).limit(16);
  if (error || !data?.length) return [];
  return mergeMedia(supabase, data);
}

export default async function HomePage() {
  const products = await getProducts();
  const best = products.slice(0, 4);
  const fresh = products.slice(4, 8);
  const express = products.slice(8, 12);

  return <main className="relative min-h-screen overflow-hidden"><Header />
    <section className="relative min-h-[760px] pt-32 lg:pt-40 flex items-center border-b border-[rgba(216,214,211,0.12)] overflow-hidden">
      <div className="absolute inset-0 opacity-40"><div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(216,214,211,0.26),transparent_32%),radial-gradient(circle_at_18%_82%,rgba(212,178,106,0.22),transparent_35%)]" /><div className="absolute right-0 top-0 bottom-0 w-[58%] opacity-30 text-[22vw] font-display tracking-[-0.08em] text-white/10 flex items-center justify-center">FEYA</div></div>
      <div className="container-feya relative z-10 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7"><div className="eyebrow-gold mb-6">Atelier · Berlin · Est. 2018 — 20% storewide</div><h1 className="display-hero text-bone" style={{ fontSize:'clamp(54px,8vw,128px)' }}>20% off every <span className="editorial-italic text-gold-grad">made-to-order</span> piece.</h1><p className="editorial-italic text-[var(--bone-dim)] text-xl lg:text-2xl mt-8 max-w-2xl">Hand-cut mirror acrylic. Vegan leather harnesses. Armor for festivals, performances and the desert sun.</p><div className="flex flex-wrap gap-4 mt-9"><Link href="/shop" className="btn-chrome">Shop the sale <ArrowUpRight size={14} /></Link><Link href="/shop" className="btn-ghost">Express ready in 7d <ArrowUpRight size={14} /></Link></div></div>
        <div className="lg:col-span-5 hidden lg:grid grid-cols-2 gap-4 opacity-90">{best.map((p, i) => <div key={p.canonical_product_id} className={`relative rounded-md overflow-hidden border border-white/10 ${i % 2 ? 'translate-y-14' : ''}`}><img src={p.primary_image_url || ''} className="w-full h-[310px] object-cover" alt="" /><div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" /></div>)}</div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 border-t border-[rgba(216,214,211,0.12)] bg-[rgba(7,7,10,0.45)] backdrop-blur"><div className="container-feya grid grid-cols-2 md:grid-cols-5 gap-4 py-5 text-[11px] tracking-[0.22em] uppercase text-[var(--bone-dim)]"><span className="flex items-center gap-2"><Scissors size={15} /> Handmade</span><span className="flex items-center gap-2"><Ruler size={15} /> Custom sizing</span><span className="flex items-center gap-2"><Truck size={15} /> Express DHL</span><span className="flex items-center gap-2"><Globe2 size={15} /> Worldwide</span><span className="flex items-center gap-2"><Sparkles size={15} /> Made to order</span></div></div>
    </section>
    <ProductRail title="Stage-ready, made-to-order." kicker="Best sellers · Editorial picks" products={best} />
    <ProductRail title="New for the desert run." kicker="Just dropped · New arrivals" products={fresh} />
    <ProductRail title="Complete the look for less." kicker="Atelier special · −20% storewide" products={express} />
  </main>;
}

function ProductRail({ title, kicker, products }) {
  return <section className="container-feya py-14 lg:py-20"><div className="flex items-end justify-between gap-8 mb-8"><div><div className="eyebrow-gold mb-4">{kicker}</div><h2 className="display-section text-bone" style={{ fontSize:'clamp(42px,6vw,82px)' }}>{title}</h2></div><Link href="/shop" className="btn-ghost hidden md:inline-flex">All pieces <ArrowUpRight size={13} /></Link></div><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">{products.map((p, i)=><ProductCard key={p.canonical_product_id} product={p} index={i} />)}</div></section>;
}
