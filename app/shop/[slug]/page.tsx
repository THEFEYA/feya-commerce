// @ts-nocheck
import Link from 'next/link';
import { Header } from '@/components/Header';
import { ProductDetailClient } from '@/components/ProductDetailClient';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_FALLBACK_CARD_SELECT, STOREFRONT_MEDIA_FAST_SELECT, STOREFRONT_MEDIA_FAST_VIEW, STOREFRONT_VIEW_V1, STOREFRONT_VIEW_V2 } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ slug: string }> };
type SupabaseReader = NonNullable<ReturnType<typeof getSupabaseReadClient>>;

const PDP_FAST_SELECT = `${STOREFRONT_FALLBACK_CARD_SELECT},configurations,pdp_option_count,has_multiple_pdp_options`;

async function attachMedia(supabase: SupabaseReader, product: StorefrontProduct, slug: string) {
  if (!product) return product;
  const media = await supabase
    .from(STOREFRONT_MEDIA_FAST_VIEW)
    .select(STOREFRONT_MEDIA_FAST_SELECT)
    .eq('product_slug', slug)
    .maybeSingle();

  if (media.error || !media.data) return product;
  return {
    ...product,
    primary_image_url: media.data.primary_image_url || product.primary_image_url,
    primary_image_alt: media.data.primary_image_alt || product.primary_image_alt,
    secondary_image_url: media.data.secondary_image_url || product.secondary_image_url,
    hover_image_url: media.data.hover_image_url || product.hover_image_url,
    video_url: media.data.video_url || product.video_url,
    has_video: media.data.has_video ?? product.has_video,
    media_count: media.data.media_count ?? product.media_count,
    media_gallery: media.data.media_gallery || product.media_gallery,
  };
}

async function getProduct(slug: string) {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { product: null, related: [], error: getMissingSupabaseEnvMessage() };

  const v2 = await supabase
    .from(STOREFRONT_VIEW_V2)
    .select(PDP_FAST_SELECT)
    .eq('product_slug', slug)
    .maybeSingle();

  if (!v2.error && v2.data) return { product: await attachMedia(supabase, v2.data as StorefrontProduct, slug), related: [] };

  const v1 = await supabase
    .from(STOREFRONT_VIEW_V1)
    .select(STOREFRONT_FALLBACK_CARD_SELECT)
    .eq('product_slug', slug)
    .maybeSingle();

  if (!v1.error && v1.data) return { product: await attachMedia(supabase, v1.data as StorefrontProduct, slug), related: [] };
  return { product: null, related: [], error: v2.error?.message || v1.error?.message || 'Product not found.' };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const { product, related, error } = await getProduct(slug);
  if (error) return <main className="min-h-screen"><Header /><div className="container-feya pt-40"><div className="glass rounded-xl p-6 text-bone-dim">{error}</div></div></main>;
  if (!product) return <main className="min-h-screen"><Header /><div className="container-feya pt-40"><div className="glass rounded-xl p-6">Product not found. <Link className="text-gold" href="/shop">Back to shop</Link></div></div></main>;
  return <main className="relative min-h-screen"><Header /><ProductDetailClient product={product} related={related} /></main>;
}
