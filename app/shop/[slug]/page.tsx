// @ts-nocheck
import Link from 'next/link';
import { Header } from '@/components/Header';
import { ProductDetailClient } from '@/components/ProductDetailClient';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_FALLBACK_CARD_SELECT, STOREFRONT_VIEW_V1, STOREFRONT_VIEW_V2 } from '@/lib/storefront';

export const revalidate = 300;

type PageProps = { params: Promise<{ slug: string }> };

const PDP_FAST_SELECT = `${STOREFRONT_FALLBACK_CARD_SELECT},configurations,pdp_option_count,has_multiple_pdp_options`;

async function getProduct(slug: string) {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { product: null, related: [], error: getMissingSupabaseEnvMessage() };

  const v2 = await supabase
    .from(STOREFRONT_VIEW_V2)
    .select(PDP_FAST_SELECT)
    .eq('product_slug', slug)
    .maybeSingle();

  if (!v2.error && v2.data) return { product: v2.data, related: [] };

  const v1 = await supabase
    .from(STOREFRONT_VIEW_V1)
    .select(STOREFRONT_FALLBACK_CARD_SELECT)
    .eq('product_slug', slug)
    .maybeSingle();

  if (!v1.error && v1.data) return { product: v1.data, related: [] };
  return { product: null, related: [], error: v2.error?.message || v1.error?.message || 'Product not found.' };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const { product, related, error } = await getProduct(slug);
  if (error) return <main className="min-h-screen"><Header /><div className="container-feya pt-40"><div className="glass rounded-xl p-6 text-bone-dim">{error}</div></div></main>;
  if (!product) return <main className="min-h-screen"><Header /><div className="container-feya pt-40"><div className="glass rounded-xl p-6">Product not found. <Link className="text-gold" href="/shop">Back to shop</Link></div></div></main>;
  return <main className="relative min-h-screen"><Header /><ProductDetailClient product={product} related={related} /></main>;
}
