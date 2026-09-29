// @ts-nocheck
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Globe2, Ruler, Scissors, Sparkles, Truck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { HomePieceCarousel } from '@/components/HomePieceCarousel';
import { HOME_PRESENTATION, homePresentationProductIds } from '@/config/homePresentation';
import { readClosedReviewPresentation } from '@/lib/searchReviewPresentationServer';
import { releaseRobotsForPath } from '@/lib/searchReleaseIndexationServer';
import { getSupabaseReadClient } from '@/lib/supabase';
import type { StorefrontProduct } from '@/lib/types';
import {
  STOREFRONT_FALLBACK_CARD_SELECT,
  STOREFRONT_MEDIA_FAST_SELECT,
  STOREFRONT_MEDIA_FAST_VIEW,
  STOREFRONT_VIEW_V2,
  STOREFRONT_VIEW_V4,
  STOREFRONT_V4_CARD_SELECT,
  productTitle,
} from '@/lib/storefront';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'TheFEYA | Handmade Stagewear and Festival Looks',
    description: 'Original handmade designs for stage, festival, rave and Burning Man looks, with clear product configurations, fit guidance and selected customization.',
    alternates: { canonical: '/' },
    robots: await releaseRobotsForPath('/'),
  };
}

async function mergeMedia(supabase, products: StorefrontProduct[]) {
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

async function getPresentationProducts() {
  const ids = homePresentationProductIds();
  const review = await readClosedReviewPresentation();
  if (review.status === 'blocked') notFound();

  if (review.status === 'review') {
    const products = review.release.entries
      .map((entry) => entry.product)
      .filter((product) => ids.includes(product.canonical_product_id));
    return new Map(products.map((product) => [product.canonical_product_id, product]));
  }

  const supabase = getSupabaseReadClient();
  if (!supabase) return new Map<string, StorefrontProduct>();

  const primary = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_CARD_SELECT)
    .in('canonical_product_id', ids);

  let products: StorefrontProduct[] = [];
  if (!primary.error && primary.data?.length) {
    products = await mergeMedia(supabase, primary.data);
  } else {
    const fallback = await supabase
      .from(STOREFRONT_VIEW_V2)
      .select(STOREFRONT_FALLBACK_CARD_SELECT)
      .in('canonical_product_id', ids);
    if (!fallback.error && fallback.data?.length) products = await mergeMedia(supabase, fallback.data);
  }

  return new Map(products.map((product) => [product.canonical_product_id, product]));
}

function TileMedia({
  product,
  label,
  className = '',
  priority = false,
}: {
  product?: StorefrontProduct;
  label: string;
  className?: string;
  priority?: boolean;
}) {
  const src = product?.primary_image_url || '';
  if (!src) {
    return <div className={`absolute inset-0 bg-[radial-gradient(90%_70%_at_55%_20%,#28262d,#0d0d11)] ${className}`} />;
  }

  return (
    <img
      src={src}
      alt={product.primary_image_alt || productTitle(product) || label}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] ${className}`}
    />
  );
}

export default async function HomePage() {
  const byId = await getPresentationProducts();
  const getProduct = (id: string) => byId.get(id);

  const hero = getProduct(HOME_PRESENTATION.heroProductId);
  const curatedSelected = HOME_PRESENTATION.selectedProductIds
    .map(getProduct)
    .filter(Boolean) as StorefrontProduct[];
  const curatedSelectedIds = new Set(curatedSelected.map((product) => product.canonical_product_id));
  const selectedFallbacks = [...byId.values()]
    .filter((product) => !curatedSelectedIds.has(product.canonical_product_id));
  const selected = [...curatedSelected, ...selectedFallbacks].slice(0, 8);

  return (
    <main className="visual-commerce-shell relative min-h-screen overflow-hidden">
      <Header />

      <section aria-label="Hero" className="px-2.5 pt-[108px] sm:px-4 lg:px-5 lg:pt-[116px]">
        <div className="group relative mx-auto min-h-[560px] max-h-[820px] h-[72vh] overflow-hidden rounded-md border border-white/[0.06] bg-[#0d0d11]">
          <TileMedia product={hero} label="TheFEYA hero" className="scale-[1.01]" priority />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,6,8,.82)_0%,rgba(6,6,8,.35)_50%,rgba(6,6,8,.06)_82%),linear-gradient(0deg,rgba(6,6,8,.76)_0%,transparent_52%)]" />
          <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-8 sm:px-9 sm:pb-10 lg:px-[5vw] lg:pb-[5vw]">
            <div className="max-w-[720px]">
              <div className="mb-5 text-[11px] uppercase tracking-[0.18em] text-[#e7cf96]">TheFEYA · Handmade stage & festival wear</div>
              <h1 className="font-tall m-0 max-w-[680px] text-[clamp(48px,6vw,86px)] leading-[.94] tracking-[.005em] text-[#f7f3ec]">
                Sculpted for the spotlight.
              </h1>
              <p className="mt-6 max-w-[500px] text-[15px] leading-[1.65] text-[#d6cfc6] sm:text-[17px]">
                Original handmade pieces and full looks for festival, stage, fashion and performance.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/shop" className="visual-primary-cta visual-hero-cta">Shop catalog</Link>
                <Link href="/shop?piece=Full%20Look" className="visual-secondary-cta">Explore full looks</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <EditorialSection
        eyebrow="Shop by piece"
        title="Build it piece by piece."
        tone="plain"
        action={<Link href="/shop" className="visual-text-link">Shop all <ArrowUpRight size={13} /></Link>}
      >
        <HomePieceCarousel
          items={HOME_PRESENTATION.pieceTiles.map((tile) => {
            const product = getProduct(tile.productId);
            return {
              code: tile.code,
              label: tile.label,
              href: tile.href,
              imageUrl: product?.primary_image_url || '',
              imageAlt: product?.primary_image_alt || productTitle(product) || tile.label,
            };
          })}
        />
      </EditorialSection>

      <EditorialSection eyebrow="Events & Performance" title="Dressed for where you’re going." tone="raised">
        <div className="grid grid-cols-12 gap-3 lg:gap-4">
          {HOME_PRESENTATION.eventTiles.map((tile, index) => {
            const wide = index === 0 || index === 3;
            return (
              <article
                key={tile.code}
                className={`group relative col-span-12 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111117] md:col-span-6 ${wide ? 'lg:col-span-7' : 'lg:col-span-5'}`}
                style={{ minHeight: wide ? 500 : 420 }}
              >
                <TileMedia product={getProduct(tile.productId)} label={tile.label} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 z-10 p-6 lg:p-8">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#e7cf96]">{tile.eyebrow}</div>
                  <h2 className="font-tall text-[clamp(28px,2.7vw,42px)] leading-[1.02] tracking-[.01em] text-[#f7f3ec]">
                    <Link href={tile.href}>{tile.label}</Link>
                  </h2>
                  <p className="mt-3 max-w-[520px] text-[14px] leading-6 text-[#d0c9c0]">{tile.description}</p>
                  {tile.shortcuts?.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {tile.shortcuts.map((shortcut) => (
                        <Link key={shortcut.label} href={shortcut.href} className="visual-chip">{shortcut.label}</Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </EditorialSection>


      {selected.length ? (
        <EditorialSection
          eyebrow="Selected pieces"
          title="TheFEYA Edit"
          tone="raised"
          action={<Link href="/shop" className="visual-text-link">Shop all <ArrowUpRight size={13} /></Link>}
        >
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
            {selected.map((product, index) => (
              <ProductCard key={product.canonical_product_id} product={product} index={index} />
            ))}
          </div>
        </EditorialSection>
      ) : null}

      <EditorialSection eyebrow="Find your look" title="Start from a mood." tone="deep">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {HOME_PRESENTATION.findTiles.map((tile) => (
            <Link key={tile.code} href={tile.href} className="group relative aspect-[3/4] overflow-hidden rounded-[14px] border border-[rgba(216,181,109,.10)] bg-[#111117] transition-[border-color,box-shadow] duration-300 hover:border-[rgba(216,181,109,.24)] hover:shadow-[0_22px_48px_-30px_rgba(216,181,109,.16)]">
              <TileMedia product={getProduct(tile.productId)} label={tile.label} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/16 to-transparent" />
              <div className="visual-tile-label-band visual-mood-label-band absolute inset-x-0 bottom-0 z-10 px-4 pb-4 pt-3 text-center">
                <span className="visual-axis-pill">{tile.axis}</span>
                <h3 className="font-tall mt-2 text-[clamp(24px,2.2vw,34px)] leading-none tracking-[.01em] text-[#f7f3ec]">{tile.label}</h3>
              </div>
            </Link>
          ))}
        </div>
      </EditorialSection>

      <section className="container-feya py-14 lg:py-20">
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 border-y border-white/[0.08] py-7 text-[10px] uppercase tracking-[0.18em] text-[#aaa2a0] md:grid-cols-5">
          <span className="flex items-center gap-2"><Scissors size={14} /> Handmade</span>
          <span className="flex items-center gap-2"><Ruler size={14} /> Fit guidance</span>
          <span className="flex items-center gap-2"><Truck size={14} /> Express options</span>
          <span className="flex items-center gap-2"><Globe2 size={14} /> Worldwide</span>
          <span className="flex items-center gap-2"><Sparkles size={14} /> Original designs</span>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function EditorialSection({
  eyebrow,
  title,
  action,
  children,
  tone = 'plain',
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  tone?: 'plain' | 'raised' | 'deep';
}) {
  return (
    <section className={`visual-home-section visual-home-section--${tone}`}>
      <div className="container-feya py-[clamp(56px,7vw,96px)]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5 lg:mb-10">
          <div>
            <div className="mb-3 text-[10px] uppercase tracking-[0.18em] text-[#aaa2a0]">{eyebrow}</div>
            <h2 className="font-tall text-[clamp(32px,3.7vw,52px)] leading-[1.02] tracking-[.012em] text-[#f7f3ec]">{title}</h2>
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}
