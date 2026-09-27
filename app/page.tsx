// @ts-nocheck
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readClosedReviewPresentation } from '@/lib/searchReviewPresentationServer';
import Link from 'next/link';
import { ArrowUpRight, Globe2, Ruler, Scissors, Sparkles, Truck } from 'lucide-react';
import { Header } from '@/components/Header';
import { ProductCard } from '@/components/ProductCard';
import { Footer } from '@/components/Footer';
import { releaseRobotsForPath } from '@/lib/searchReleaseIndexationServer';
import { getSupabaseReadClient } from '@/lib/supabase';
import {
  STOREFRONT_FALLBACK_CARD_SELECT,
  STOREFRONT_MEDIA_FAST_SELECT,
  STOREFRONT_MEDIA_FAST_VIEW,
  STOREFRONT_VIEW_V2,
  STOREFRONT_VIEW_V4,
  STOREFRONT_V4_CARD_SELECT,
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

const HOME_PRODUCTS_LIMIT = 12;

const PIECE_GATEWAYS = [
  { label: 'Full Looks', href: '/shop?piece=Full%20Look', note: 'Multi-piece outfit configurations' },
  { label: 'Bodysuits', href: '/collections/bodysuits', note: 'Full-body statement pieces' },
  { label: 'Shoulders', href: '/collections/shoulder-armor', note: 'Shoulder pieces and armor-inspired forms' },
  { label: 'Masks', href: '/collections/costume-masks', note: 'Decorative costume masks' },
  { label: 'Headpieces', href: '/collections/costume-headpieces', note: 'Crowns, headpieces and sculpted forms' },
  { label: 'Belts', href: '/collections/costume-belts', note: 'Waist and belt pieces' },
  { label: 'Wings', href: '/shop?piece=Wings', note: 'Wearable wings and back-mounted structures' },
  { label: 'Tail', href: '/shop?piece=Tail', note: 'Sculptural tail pieces' },
  { label: 'Spine', href: '/shop?piece=Spine', note: 'Decorative spine structures' },
] as const;

const EVENT_GATEWAYS = [
  { label: 'Festival', href: '/collections/festival-outfits', note: 'Broad festival styling' },
  { label: 'Rave', href: '/collections/rave-outfits', note: 'Rave-focused looks and components' },
  { label: 'Burning Man', href: '/collections/burning-man-looks', note: 'Statement looks for Burning Man' },
  { label: 'Halloween', href: '/shop?event=Halloween', note: 'Costume-led Halloween looks' },
  { label: 'Pride', href: '/shop?event=Pride', note: 'Statement pieces for Pride styling' },
  { label: 'Cosplay', href: '/shop?event=Cosplay', note: 'Character and fantasy-led costume pieces' },
] as const;

const PERFORMANCE_GATEWAYS = [
  { label: 'Stage', href: '/collections/stage-outfits', note: 'Performance-focused pieces' },
  { label: 'Showgirl', href: '/shop?performance=Showgirl', note: 'Showgirl-oriented statement looks' },
  { label: 'Drag', href: '/shop?performance=Drag', note: 'Drag performance styling' },
  { label: 'Go-Go', href: '/shop?dance=Go-Go', note: 'Go-go dance looks and components' },
  { label: 'Pole', href: '/shop?dance=Pole', note: 'Pole performance styling' },
] as const;

const STYLE_GATEWAYS = [
  { label: 'Cyberpunk', href: '/shop?style=Cyberpunk', note: 'Cyberpunk visual direction' },
  { label: 'Futuristic', href: '/shop?style=Futuristic', note: 'Futuristic statement pieces' },
  { label: 'Sci-Fi', href: '/shop?style=Sci-Fi', note: 'Sci-fi inspired costume styling' },
  { label: 'Goth', href: '/shop?style=Goth', note: 'Dark goth visual direction' },
  { label: 'Glam', href: '/shop?style=Glam', note: 'High-impact glam looks' },
  { label: 'Warrior', href: '/shop?style=Warrior', note: 'Warrior-inspired sculptural looks' },
  { label: 'Goddess', href: '/shop?style=Goddess', note: 'Goddess-inspired styling' },
] as const;

async function mergeMedia(supabase, products) {
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

async function getProducts() {
  const review = await readClosedReviewPresentation();
  if (review.status === 'blocked') notFound();
  if (review.status === 'review') return review.release.entries.slice(0, HOME_PRODUCTS_LIMIT).map((entry) => entry.product);

  const supabase = getSupabaseReadClient();
  if (!supabase) return [];

  const primary = await supabase.from(STOREFRONT_VIEW_V4).select(STOREFRONT_V4_CARD_SELECT).limit(HOME_PRODUCTS_LIMIT);
  if (!primary.error && primary.data?.length) return mergeMedia(supabase, primary.data);

  const fallback = await supabase.from(STOREFRONT_VIEW_V2).select(STOREFRONT_FALLBACK_CARD_SELECT).limit(HOME_PRODUCTS_LIMIT);
  if (fallback.error || !fallback.data?.length) return [];
  return mergeMedia(supabase, fallback.data);
}

export default async function HomePage() {
  const products = await getProducts();
  const heroProducts = products.slice(0, 3);
  const currentPieces = products.slice(0, 8);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Header />

      <section className="relative min-h-[560px] pt-28 lg:pt-32 flex items-center border-b border-[rgba(216,214,211,0.12)] overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(216,214,211,0.26),transparent_32%),radial-gradient(circle_at_18%_82%,rgba(212,178,106,0.22),transparent_35%)]" />
          <div className="absolute right-0 top-0 bottom-0 w-[50%] opacity-20 text-[13vw] font-display tracking-[-0.08em] text-white/10 flex items-center justify-center">FEYA</div>
        </div>

        <div className="container-feya relative z-10 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6">
            <div className="eyebrow-gold mb-5">TheFEYA · Original handmade designs</div>
            <h1 className="font-tall text-bone leading-[0.95] tracking-[0.03em]" style={{ fontSize: 'clamp(44px,5.5vw,82px)' }}>
              Handmade stagewear for unforgettable looks
            </h1>
            <p className="editorial-italic text-[var(--bone-dim)] text-lg lg:text-xl mt-6 max-w-xl">
              Statement pieces for stage, festival, rave and Burning Man styling. Start with a product type, an event or a complete look.
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <Link href="/shop" className="btn-chrome">Shop catalog <ArrowUpRight size={14} /></Link>
              <Link href="/collections" className="btn-ghost">Explore collections <ArrowUpRight size={14} /></Link>
            </div>
          </div>

          <div className="lg:col-span-6 hidden lg:grid grid-cols-3 gap-4 opacity-90">
            {heroProducts.map((product, index) => (
              <Link
                href={`/shop/${product.product_slug}`}
                key={product.canonical_product_id}
                className={`relative rounded-md overflow-hidden border border-white/10 ${index === 1 ? 'translate-y-8' : ''}`}
              >
                <img src={product.primary_image_url || ''} className="w-full h-[360px] object-cover" alt={product.primary_image_alt || product.card_title || ''} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              </Link>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-[rgba(216,214,211,0.12)] bg-[rgba(7,7,10,0.45)] backdrop-blur">
          <div className="container-feya grid grid-cols-2 md:grid-cols-5 gap-4 py-5 text-[11px] tracking-[0.22em] uppercase text-[var(--bone-dim)]">
            <span className="flex items-center gap-2"><Scissors size={15} /> Handmade</span>
            <span className="flex items-center gap-2"><Ruler size={15} /> Fit guidance</span>
            <span className="flex items-center gap-2"><Truck size={15} /> Express options</span>
            <span className="flex items-center gap-2"><Globe2 size={15} /> Worldwide</span>
            <span className="flex items-center gap-2"><Sparkles size={15} /> Original designs</span>
          </div>
        </div>
      </section>

      <GatewaySection
        kicker="Shop by piece"
        title="Start with what you want to wear."
        description="Use the physical product structure first. Search terms stay in the SEO layer without turning every synonym into a storefront category."
        items={PIECE_GATEWAYS}
      />

      <GatewaySection
        kicker="Shop by event"
        title="Choose the setting."
        description="Festival is the broad entry. Rave and Burning Man remain separate because the shopping jobs and product mixes are different."
        items={EVENT_GATEWAYS}
      />

      <GatewaySection
        kicker="Performance & dance"
        title="Built for the visual moment."
        description="Choose by performance context without turning those shopper refinements into duplicate SEO landing owners."
        items={PERFORMANCE_GATEWAYS}
      />

      <GatewaySection
        kicker="Shop by style"
        title="Choose the visual world."
        description="Style is a governed storefront filter layer. It helps shoppers browse without creating a separate indexable page for every style label."
        items={STYLE_GATEWAYS}
      />

      {currentPieces.length > 0 ? (
        <ProductRail
          title="Current pieces."
          kicker="TheFEYA catalog"
          products={currentPieces}
        />
      ) : null}

      <section className="container-feya pb-16 lg:pb-24">
        <div className="rounded-xl border border-[rgba(212,178,106,.22)] bg-[rgba(212,178,106,.045)] p-7 lg:p-9">
          <div className="eyebrow-gold mb-4">Before you order</div>
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 className="text-bone text-2xl lg:text-3xl">Fit, shipping and care in one place.</h2>
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[var(--bone-dim)]">
                Check measurements, production and delivery information, care guidance and the current returns policy before choosing a configuration.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/size-guide" className="btn-ghost">Size guide</Link>
              <Link href="/shipping" className="btn-ghost">Shipping</Link>
              <Link href="/care" className="btn-ghost">Care</Link>
              <Link href="/returns" className="btn-ghost">Returns</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function GatewaySection({ kicker, title, description, items }) {
  return (
    <section className="container-feya py-14 lg:py-20 border-b border-[rgba(216,214,211,.08)]">
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <div>
          <div className="eyebrow-gold mb-4">{kicker}</div>
          <h2 className="display-section text-bone" style={{ fontSize: 'clamp(38px,4.8vw,68px)' }}>{title}</h2>
          <p className="mt-4 text-[14px] leading-6 text-[var(--bone-dim)]">{description}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group rounded-xl border border-[rgba(216,214,211,.14)] bg-white/[.025] p-6 transition-all hover:border-[rgba(212,178,106,.45)] hover:bg-[rgba(212,178,106,.05)]"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-xl text-bone">{item.label}</h3>
                <ArrowUpRight size={15} className="mt-1 text-[var(--bone-dim)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="mt-3 text-[13px] leading-5 text-[var(--bone-dim)]">{item.note}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductRail({ title, kicker, products }) {
  return (
    <section className="container-feya py-14 lg:py-20">
      <div className="flex items-end justify-between gap-8 mb-8">
        <div>
          <div className="eyebrow-gold mb-4">{kicker}</div>
          <h2 className="display-section text-bone" style={{ fontSize: 'clamp(42px,6vw,82px)' }}>{title}</h2>
        </div>
        <Link href="/shop" className="btn-ghost hidden md:inline-flex">All pieces <ArrowUpRight size={13} /></Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">
        {products.map((product, index) => <ProductCard key={product.canonical_product_id} product={product} index={index} />)}
      </div>
    </section>
  );
}
