// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Boxes, CheckCircle2, ImageIcon, Search, Tags, WalletCards } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient, getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4, formatPrice, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontConfiguration, StorefrontProduct } from '@/lib/types';

export const revalidate = 300;

const ADMIN_PRODUCTS_LIMIT = 250;

type ReviewEvent = {
  review_event_id: string;
  event_type: string;
  event_status?: string | null;
  product_slug?: string | null;
  canonical_product_id?: string | null;
  created_at?: string | null;
};

function parseConfigurations(value: unknown): StorefrontConfiguration[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as StorefrontConfiguration[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed as StorefrontConfiguration[] : [];
    } catch {
      return [];
    }
  }
  return [];
}

function hasSecondMedia(product: StorefrontProduct) {
  return Boolean(product.secondary_image_url || product.hover_image_url || product.has_video || Number(product.media_count || 0) > 1);
}

function productFlags(product: StorefrontProduct) {
  const configs = parseConfigurations(product.configurations);
  const missingComponent = configs.filter((config) => !config.component_code).length;
  const labelReview = Boolean(product.needs_label_review || configs.some((config) => config.needs_label_review));
  const priceReview = product.price_confidence_status === 'unverified' || Boolean(product.needs_price_review);
  const mediaReview = !hasSecondMedia(product);
  const fullSet = configs.some((config) => config.is_full_set);
  const bundle = configs.some((config) => config.is_bundle);

  return { configs, missingComponent, labelReview, priceReview, mediaReview, fullSet, bundle };
}

async function getProducts(): Promise<{ rows: StorefrontProduct[]; error?: string }> {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { rows: [], error: getMissingSupabaseEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_CARD_SELECT)
    .limit(ADMIN_PRODUCTS_LIMIT);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as StorefrontProduct[] };
}

async function getReviewEvents(): Promise<ReviewEvent[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('feya_commerce_v_admin_review_events_v1')
    .select('review_event_id,event_type,event_status,product_slug,canonical_product_id,created_at')
    .limit(1000);

  if (error) return [];
  return (data || []) as ReviewEvent[];
}

function productEvents(product: StorefrontProduct, events: ReviewEvent[]) {
  const slug = productSlug(product);
  return events
    .filter((event) => event.product_slug === slug || event.canonical_product_id === product.canonical_product_id)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}

function latestEventMap(events: ReviewEvent[]) {
  const map = new Map<string, ReviewEvent>();
  for (const event of events) {
    if (!map.has(event.event_type)) map.set(event.event_type, event);
  }
  return map;
}

function readinessStatus(product: StorefrontProduct, events: ReviewEvent[]) {
  const flags = productFlags(product);
  const latest = latestEventMap(events);

  if (latest.has('needs_fix')) return { label: 'Blocked', tone: 'danger' };
  if (!events.length) return { label: 'Draft', tone: 'neutral' };

  const labelOk = !flags.labelReview || latest.has('label_review_approved');
  const priceOk = !flags.priceReview || latest.has('price_review_approved');
  const componentOk = !flags.missingComponent || latest.has('component_mapping_checked');
  const mediaOk = !flags.mediaReview || latest.has('media_checked');
  const seoOk = latest.has('seo_ready_checked');

  if (!labelOk) return { label: 'Needs Label Review', tone: 'warning' };
  if (!priceOk) return { label: 'Needs Price Review', tone: 'warning' };
  if (!componentOk) return { label: 'Needs Component Mapping', tone: 'warning' };
  if (!mediaOk) return { label: 'Needs Media QA', tone: 'warning' };
  if (!seoOk) return { label: 'SEO Ready', tone: 'warning' };
  return { label: 'Ready for Storefront', tone: 'success' };
}

function StatusChip({ children, tone = 'neutral' }) {
  const className = tone === 'danger'
    ? 'border-[rgba(196,64,88,.36)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
      : tone === 'success'
        ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]'
        : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>;
}

function Metric({ label, value, note, icon: Icon }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="eyebrow-dim">{label}</div>
      <Icon size={16} className="text-[var(--gold-warm)]" />
    </div>
    <div className="font-price text-gold-grad text-[38px] leading-none">{value}</div>
    <div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div>
  </div>;
}

export default async function AdminProductsPage() {
  const [{ rows, error }, reviewEvents] = await Promise.all([getProducts(), getReviewEvents()]);
  const readinessRows = rows.map((product) => ({ product, readiness: readinessStatus(product, productEvents(product, reviewEvents)) }));
  const totals = rows.reduce((acc, product) => {
    const flags = productFlags(product);
    const readiness = readinessStatus(product, productEvents(product, reviewEvents));
    acc.configs += flags.configs.length;
    acc.label += flags.labelReview ? 1 : 0;
    acc.price += flags.priceReview ? 1 : 0;
    acc.components += flags.missingComponent;
    acc.media += flags.mediaReview ? 1 : 0;
    acc.ready += readiness.label === 'Ready for Storefront' ? 1 : 0;
    acc.blocked += readiness.label === 'Blocked' ? 1 : 0;
    return acc;
  }, { configs: 0, label: 0, price: 0, components: 0, media: 0, ready: 0, blocked: 0 });

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.12),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Admin · Product Control</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Products</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Read-only v4 catalog control table with consolidated readiness from v4 flags and admin review events.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin" className="btn-ghost">Admin cockpit <ArrowUpRight size={13} /></Link>
          <Link href="/shop" className="btn-ghost">Storefront <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <Metric icon={Search} label="Products" value={rows.length} note="Loaded from v4 safe contract." />
        <Metric icon={Boxes} label="Configurations" value={totals.configs} note="Public sellable options in current slice." />
        <Metric icon={Tags} label="Label review" value={totals.label} note="Products with label review flags." />
        <Metric icon={WalletCards} label="Price review" value={totals.price} note="Unverified price confidence." />
        <Metric icon={ImageIcon} label="Media QA" value={totals.media} note="Missing second/hover/gallery signal." />
        <Metric icon={CheckCircle2} label="Ready" value={totals.ready} note={`Blocked: ${totals.blocked}`} />
      </div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
        <div className="grid grid-cols-[80px_1.6fr_0.9fr_0.7fr_1.2fr_1.2fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.22em] text-[var(--smoke)]">
          <div>Media</div>
          <div>Product</div>
          <div>Readiness</div>
          <div>Price</div>
          <div>Config</div>
          <div>Review state</div>
        </div>

        <div className="divide-y divide-[rgba(216,214,211,.08)]">
          {readinessRows.map(({ product, readiness }) => {
            const flags = productFlags(product);
            const price = product.min_price != null ? formatPrice(product.min_price, product.currency || 'EUR') : '—';
            const slug = productSlug(product);
            return <Link key={product.canonical_product_id} href={`/admin/products/${slug}`} className="grid grid-cols-[80px_1.6fr_0.9fr_0.7fr_1.2fr_1.2fr] gap-4 items-center px-5 py-4 hover:bg-[rgba(212,178,106,.045)] transition-colors">
              <div className="relative h-20 w-16 rounded-lg overflow-hidden bg-black/30 border border-[rgba(216,214,211,.10)]">
                {product.primary_image_url ? <img src={product.primary_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
              </div>
              <div>
                <div className="text-bone text-[15px] leading-snug line-clamp-2">{productTitle(product)}</div>
                <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{worldLabel(product)} · {product.category_label || product.product_type || 'Product'} · {product.canonical_color_label || product.color || 'Color'}</div>
              </div>
              <div><StatusChip tone={readiness.tone}>{readiness.label}</StatusChip></div>
              <div>
                <div className="font-price text-gold-grad text-[21px] leading-none">{price}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--smoke)]">{product.price_confidence_status || 'unknown'}</div>
              </div>
              <div>
                <div className="text-bone text-[14px]">{flags.configs.length}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--smoke)]">{flags.fullSet ? 'Full set' : flags.bundle ? 'Bundle' : 'Options'}</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {flags.labelReview ? <StatusChip tone="warning">Label</StatusChip> : null}
                {flags.priceReview ? <StatusChip tone="warning">Price</StatusChip> : null}
                {flags.missingComponent ? <StatusChip tone="danger">Component {flags.missingComponent}</StatusChip> : null}
                {flags.mediaReview ? <StatusChip tone="danger">Media</StatusChip> : null}
                {!flags.labelReview && !flags.priceReview && !flags.missingComponent && !flags.mediaReview ? <StatusChip>OK</StatusChip> : null}
              </div>
            </Link>;
          })}

          {!rows.length ? <div className="p-6 text-[13px] text-[var(--bone-dim)]">No products returned from v4.</div> : null}
        </div>
      </div>
    </section>
  </main>;
}
