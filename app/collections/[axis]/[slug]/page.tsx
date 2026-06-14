// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Header } from '@/components/Header';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import { buildSeoCollectionPlans } from '@/lib/seo-collection-planning';
import type { StorefrontProduct } from '@/lib/types';

export const revalidate = 300;
export const metadata = {
  robots: { index: false, follow: false },
  title: 'Collection Preview | TheFEYA',
};

type PageProps = { params: Promise<{ axis: string; slug: string }> };

async function loadProducts() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };
  const { data, error } = await supabase.from(STOREFRONT_VIEW_V4).select(STOREFRONT_V4_CARD_SELECT).limit(250);
  if (error) return { products: [], error: error.message };
  return { products: (data || []) as StorefrontProduct[], error: null };
}

function keySlug(key: string) {
  return key.split(':')[1] || key;
}

export default async function CollectionPreviewPage({ params }: PageProps) {
  const { axis, slug } = await params;
  const { products, error } = await loadProducts();
  const plans = buildSeoCollectionPlans(products, []);
  const plan = plans.find((item) => item.axis === axis && keySlug(item.key) === slug);

  if (error || !plan) {
    return <main className="min-h-screen bg-[#07070A]"><Header /><section className="container-feya pt-40 pb-16"><div className="glass rounded-xl p-6 text-bone-dim">{error || 'Collection preview not found.'}</div><Link href="/shop" className="btn-ghost mt-5">Back to shop</Link></section></main>;
  }

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]"><Header /><section className="container-feya pt-36 pb-16"><div className="border-b border-[rgba(216,214,211,.12)] pb-8 mb-8"><div className="eyebrow-gold mb-3">Collection Preview · noindex</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(46px,8vw,96px)' }}>{plan.label}</h1><p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Safe preview for future SEO collection page. This route is intentionally noindex and is not included in sitemap or feeds.</p><div className="mt-5 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--bone-dim)]"><span className="rounded-full border border-[rgba(216,214,211,.14)] px-3 py-1">{plan.axis}</span><span className="rounded-full border border-[rgba(216,214,211,.14)] px-3 py-1">{plan.productCount} products</span><span className="rounded-full border border-[rgba(216,214,211,.14)] px-3 py-1">{plan.planStage}</span></div></div>

    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{plan.sampleProducts.map((product) => <Link key={product.slug} href={`/shop/${product.slug}`} className="group rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden hover:border-[rgba(212,178,106,.38)] transition-colors"><div className="relative aspect-[4/5] bg-black/30 overflow-hidden">{product.imageUrl ? <img src={product.imageUrl} alt={product.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" /> : null}</div><div className="p-4"><div className="text-bone text-[16px] leading-snug line-clamp-2">{product.title}</div><div className="mt-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-[var(--gold-warm)]">View product <ArrowUpRight size={12} /></div></div></Link>)}</div>
  </section></main>;
}
