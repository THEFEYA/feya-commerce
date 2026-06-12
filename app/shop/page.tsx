// @ts-nocheck
import { Header } from '@/components/Header';
import { ShopClient } from '@/components/ShopClient';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_CARD_SELECT, STOREFRONT_VIEW_V3 } from '@/lib/storefront';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getProducts() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };
  const { data, error } = await supabase.from(STOREFRONT_VIEW_V3).select(STOREFRONT_CARD_SELECT).limit(250);
  if (error) return { products: [], error: error.message };
  return { products: data || [] };
}

export default async function ShopPage() {
  const { products, error } = await getProducts();
  return <main className="relative min-h-screen"><Header /><ShopClient products={products} error={error} /></main>;
}
