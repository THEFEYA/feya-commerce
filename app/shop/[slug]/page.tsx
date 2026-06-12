// @ts-nocheck
import Link from 'next/link';
import { Header } from '@/components/Header';
import { ProductDetailClient } from '@/components/ProductDetailClient';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_CARD_SELECT, STOREFRONT_PDP_SELECT, STOREFRONT_VIEW_V3 } from '@/lib/storefront';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ slug: string }> };

async function getProduct(slug: string) {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { product: null, related: [], error: getMissingSupabaseEnvMessage() };
  const { data, error } = await supabase.from(STOREFRONT_VIEW_V3).select(STOREFRONT_PDP_SELECT).eq('product_slug', slug).maybeSingle();
  if (error) return { product: null, related: [], error: error.message };
  const { data: related } = await supabase.from(STOREFRONT_VIEW_V3).select(STOREFRONT_CARD_SELECT).limit(8);
  return { product: data, related: related || [] };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const { product, related, error } = await getProduct(slug);
  if (error) return <main className="min-h-screen"><Header /><div className="container-feya pt-40"><div className="glass rounded-xl p-6 text-bone-dim">{error}</div></div></main>;
  if (!product) return <main className="min-h-screen"><Header /><div className="container-feya pt-40"><div className="glass rounded-xl p-6">Product not found. <Link className="text-gold" href="/shop">Back to shop</Link></div></div></main>;
  return <main className="relative min-h-screen"><Header /><ProductDetailClient product={product} related={related} /></main>;
}
