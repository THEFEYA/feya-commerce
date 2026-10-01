// @ts-nocheck
export const instant = true;

import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Globe2, Ruler, Scissors, Sparkles, Truck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { HomePieceCarousel } from '@/components/HomePieceCarousel';
import { HOME_PRESENTATION, homePresentationProductIds } from '@/config/homePresentation';
import { readClosedReviewPresentation } from '@/lib/searchReviewPresentationServer';
import { isHybridVisualPreviewDeployment } from '@/lib/ownerPreviewPolicy';
import { releaseRobotsForPath } from '@/lib/searchReleaseIndexationServer';
import type { StorefrontProduct } from '@/lib/types';
import { productTitle } from '@/lib/storefront';
import { readCachedHomePresentationProducts } from '@/lib/homePresentationServer';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'TheFEYA | Handmade Stagewear and Festival Looks',
    description: 'Original handmade designs for stage, festival, rave and Burning Man looks, with clear product configurations, fit guidance and selected customization.',
    alternates: { canonical: '/' },
    robots: await releaseRobotsForPath('/'),
  };
}

async function getPresentationProducts() {
  const ids = homePresentationProductIds();
  const hybridVisualPreview = isHybridVisualPreviewDeployment(process.env);
  const review = hybridVisualPreview ? { status: 'disabled' as const, release: null } : await readClosedReviewPresentation();
  if (review.status === 'blocked') notFound();

  if (review.status === 'review') {
    const products = review.release.entries
      .map((entry) => entry.product)
      .filter((product) => ids.includes(product.canonical_product_id));
    return new Map(products.map((product) => [product.canonical_product_id, product]));
  }

  try {
    const products = await readCachedHomePresentationProducts();
    return new Map(products.map((product) => [product.canonical_product_id, product]));
  } catch {
    return new Map<string, StorefrontProduct>();
  }
}

function TileMedia({
  product,
  label,
  className = '',
  priority = false,
  sizes = '(max-width: 1023px) 50vw, 25vw',
}: {
  product?: StorefrontProduct;
  label: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const src = product?.primary_image_url || '';
  if (!src) {
    return <div className={`absolute inset-0 bg-[radial-gradient(90%_70%_at_55%_20%,#28262d,#0d0d11)] ${className}`} />;
  }

  return (
    <Image
      src={src}
      alt={product.primary_image_alt || productTitle(product) || label}
      fill
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] ${className}`}
    />
  );
}

export default function HomePage() {
  return (
    <main className="visual-commerce-shell relative min-h-screen overflow-hidden">
      <Suspense fallback={null}><Header /></Suspense>
      <Suspense fallback={<HomeBodyFallback />}>
        <HomeBody />
      </Suspense>
      <Footer />
    </main>
  );
}

function HomeBodyFallback() {
  return <div className="min-h-[80vh]" aria-busy="true" />;
}

async function HomeBody() {
  await connection();
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
    <>
      <section aria-label="Hero" className="px-2.5 pt-[108px] sm:px-4 lg:px-5 lg:pt-[116px]">
        <div className="group relative mx-auto min-h-[560px] max-h-[820px] h-[72vh] overflow-hidden rounded-md border border-white/[0.06] bg-[#0d0d11]">
          <TileMedia product={hero} label="TheFEYA hero" className="scale-[1.01]" sizes="100vw" priority />
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
                <TileMedia product={getProduct(tile.productId)} label={tile.label} sizes={wide ? '(max-width: 767px) calc(100vw - 48px), 58vw' : '(max-width: 767px) calc(100vw - 48px), 42vw'} />
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
            <Link key={tile.code} href={tile.href} className="visual-hover-sheen group relative aspect-[3/4] overflow-hidden rounded-[14px] border border-[rgba(216,181,109,.10)] bg-[#111117] transition-[border-color,box-shadow] duration-300 hover:border-[rgba(216,181,109,.24)] hover:shadow-[0_22px_48px_-30px_rgba(216,181,109,.16)]">
              <TileMedia product={getProduct(tile.productId)} label={tile.label} sizes="(max-width: 1023px) 50vw, 25vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/16 to-transparent" />
              <div className="visual-tile-label-band visual-mood-label-band absolute inset-x-0 bottom-0 z-10 px-4 pb-4 pt-3 text-center">
                <span className="visual-axis-pill">{tile.axis}</span>
                <h3 className="font-tall mt-2 text-[clamp(24px,2.2vw,34px)] leading-none tracking-[.01em] text-[#f7f3ec]">{tile.label}</h3>
              </div>
            </Link>
          ))}
        </div>
      </EditorialSection>

      <section className="container-feya py-7 lg:py-9">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-white/[0.08] py-5 text-[10px] uppercase tracking-[0.18em] text-[#aaa2a0] md:grid-cols-5">
          <span className="flex items-center gap-2"><Scissors size={14} /> Handmade</span>
          <span className="flex items-center gap-2"><Ruler size={14} /> Fit guidance</span>
          <span className="flex items-center gap-2"><Truck size={14} /> Express options</span>
          <span className="flex items-center gap-2"><Globe2 size={14} /> Worldwide</span>
          <span className="flex items-center gap-2"><Sparkles size={14} /> Original designs</span>
        </div>
      </section>

    </>
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
      <div aria-hidden="true" className="visual-section-divider" />
      <div className="container-feya py-[clamp(52px,6vw,84px)]">
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
