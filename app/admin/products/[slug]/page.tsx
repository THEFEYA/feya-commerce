// @ts-nocheck
import Link from 'next/link';
import { AdminProductDetailView } from '@/components/AdminProductDetailView';
import { ADMIN_PRODUCT_BUILDER_DETAIL_SELECT, ADMIN_PRODUCT_BUILDER_DETAIL_VIEW, toBuilderStorefrontProduct } from '@/lib/admin-product-builder-detail';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_V4_PDP_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ slug: string }> };

async function getProduct(slug: string): Promise<{ product: StorefrontProduct | null; error?: string }> {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { product: null, error: getMissingSupabaseEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_PDP_SELECT)
    .eq('product_slug', slug)
    .maybeSingle();

  if (error) return { product: null, error: error.message };
  if (data) return { product: data as StorefrontProduct };

  const { data: builderData, error: builderError } = await supabase
    .from(ADMIN_PRODUCT_BUILDER_DETAIL_VIEW)
    .select(ADMIN_PRODUCT_BUILDER_DETAIL_SELECT)
    .eq('canonical_product_id', slug)
    .maybeSingle();

  if (builderError) return { product: null, error: builderError.message };
  return { product: builderData ? toBuilderStorefrontProduct(builderData) : null };
}

export default async function AdminProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const { product, error } = await getProduct(slug);

  if (error || !product) {
    return <main className="min-h-screen bg-[#07070A]"><section className="container-feya pt-10 pb-16"><div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-6 text-[var(--bone-dim)]">{error || 'Товар не найден.'}</div><Link href="/admin/products" className="btn-ghost mt-5">Назад к товарам</Link></section></main>;
  }

  return <AdminProductDetailView product={product} />;
}
