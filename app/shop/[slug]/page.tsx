// @ts-nocheck
import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { ProductDetailClient } from '@/components/ProductDetailClient';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import {
  STOREFRONT_FALLBACK_CARD_SELECT,
  STOREFRONT_MEDIA_FAST_SELECT,
  STOREFRONT_MEDIA_FAST_VIEW,
  STOREFRONT_PDP_SELECT,
  STOREFRONT_V4_PDP_SELECT,
  STOREFRONT_VIEW_V1,
  STOREFRONT_VIEW_V2,
  STOREFRONT_VIEW_V3,
  STOREFRONT_VIEW_V4,
  getMedia,
  mainRegularPrice,
  productTitle,
} from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ slug: string }> };
type SupabaseReader = NonNullable<ReturnType<typeof getSupabaseReadClient>>;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thefeya.com';
const PDP_FAST_SELECT = `${STOREFRONT_FALLBACK_CARD_SELECT},configurations,pdp_option_count,has_multiple_pdp_options`;

function canonicalProductUrl(slug: string) {
  return `${siteUrl}/shop/${slug}`;
}

function textValue(product: StorefrontProduct, keys: string[]) {
  const record = product as StorefrontProduct & Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function productDescription(product: StorefrontProduct) {
  return textValue(product, ['meta_description', 'seo_description', 'description_meta', 'description']) || `${productTitle(product)} by TheFEYA, an original handmade design for stage, festival, desert and editorial styling.`;
}

function productImages(product: StorefrontProduct) {
  const mediaUrls = getMedia(product).map((item) => item.url).filter(Boolean);
  const fallbackUrls = [product.primary_image_url, product.secondary_image_url, product.hover_image_url].filter(Boolean);
  return Array.from(new Set([...mediaUrls, ...fallbackUrls]));
}

function productJsonLd(product: StorefrontProduct, slug: string) {
  const price = mainRegularPrice(product);
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productTitle(product),
    description: productDescription(product),
    image: productImages(product),
    sku: product.canonical_product_id || slug,
    url: canonicalProductUrl(slug),
    brand: {
      '@type': 'Brand',
      name: 'TheFEYA',
    },
  };

  if (price != null) {
    jsonLd.offers = {
      '@type': 'Offer',
      url: canonicalProductUrl(slug),
      price: String(price),
      priceCurrency: product.currency || 'EUR',
      availability: 'https://schema.org/PreOrder',
      itemCondition: 'https://schema.org/NewCondition',
    };
  }

  return jsonLd;
}

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

  const v4 = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_PDP_SELECT)
    .eq('product_slug', slug)
    .maybeSingle();

  if (!v4.error && v4.data) return { product: await attachMedia(supabase, v4.data as StorefrontProduct, slug), related: [] };

  const v3 = await supabase
    .from(STOREFRONT_VIEW_V3)
    .select(STOREFRONT_PDP_SELECT)
    .eq('product_slug', slug)
    .maybeSingle();

  if (!v3.error && v3.data) return { product: await attachMedia(supabase, v3.data as StorefrontProduct, slug), related: [] };

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
  return { product: null, related: [], error: v4.error?.message || v3.error?.message || v2.error?.message || v1.error?.message || 'Product not found.' };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getProduct(slug);

  if (!product) {
    return {
      title: 'Product not found | TheFEYA',
      robots: { index: false, follow: true },
    };
  }

  const title = productTitle(product);
  const description = productDescription(product);
  const images = productImages(product);

  return {
    title,
    description,
    alternates: { canonical: `/shop/${slug}` },
    openGraph: {
      title,
      description,
      url: `/shop/${slug}`,
      type: 'website',
      images: images.slice(0, 4),
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const { product, related, error } = await getProduct(slug);
  if (error) return <main className="min-h-screen"><Header /><div className="container-feya pt-40"><div className="glass rounded-xl p-6 text-bone-dim">{error}</div></div></main>;
  if (!product) return <main className="min-h-screen"><Header /><div className="container-feya pt-40"><div className="glass rounded-xl p-6">Product not found. <Link className="text-gold" href="/shop">Back to shop</Link></div></div></main>;

  const jsonLd = productJsonLd(product, slug);

  return <main className="relative min-h-screen">
    <Header />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    <ProductDetailClient product={product} related={related} />
  </main>;
}
