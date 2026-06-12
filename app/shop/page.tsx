// @ts-nocheck
import { Header } from '@/components/Header';
import { ShopClient } from '@/components/ShopClient';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_FALLBACK_CARD_SELECT, STOREFRONT_VIEW_V1, STOREFRONT_VIEW_V2 } from '@/lib/storefront';

export const revalidate = 300;

async function getProducts() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };

  const v2 = await supabase.from(STOREFRONT_VIEW_V2).select(STOREFRONT_FALLBACK_CARD_SELECT).limit(120);
  if (!v2.error && v2.data?.length) return { products: v2.data };

  const v1 = await supabase.from(STOREFRONT_VIEW_V1).select(STOREFRONT_FALLBACK_CARD_SELECT).limit(120);
  if (!v1.error && v1.data?.length) return { products: v1.data, error: v2.error ? `v1 fallback active: ${v2.error.message}` : undefined };

  return { products: [], error: v2.error?.message || v1.error?.message || 'No storefront products returned.' };
}

export default async function ShopPage() {
  const { products, error } = await getProducts();
  return <main className="relative min-h-screen"><Header /><ShopClient products={products} error={error} /></main>;
}
