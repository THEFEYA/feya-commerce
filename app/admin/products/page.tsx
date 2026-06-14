// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Boxes, CheckCircle2, ImageIcon, Search, Tags, WalletCards } from 'lucide-react';
import { AdminProductsFilterClient, type AdminProductRow } from '@/components/AdminProductsFilterClient';
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

function productRow(product: StorefrontProduct, readiness: { label: string; tone: 'neutral' | 'warning' | 'danger' | 'success' }): AdminProductRow {
  const flags = productFlags(product);
  const price = product.min_price != null ? formatPrice(product.min_price, product.currency || 'EUR') : '—';
  const slug = productSlug(product);
  const chips = [];
  if (flags.labelReview) chips.push({ label: 'Label', tone: 'warning' });
  if (flags.priceReview) chips.push({ label: 'Price', tone: 'warning' });
  if (flags.missingComponent) chips.push({ label: `Component ${flags.missingComponent}`, tone: 'danger' });
  if (flags.mediaReview) chips.push({ label: 'Media', tone: 'danger' });
  if (!chips.length) chips.push({ label: 'OK', tone: 'neutral' });

  return {
    id: product.canonical_product_id || slug,
    slug,
    title: productTitle(product),
    imageUrl: product.primary_image_url,
    subtitle: `${worldLabel(product)} · ${product.category_label || product.product_type || 'Product'} · ${product.canonical_color_label || product.color || 'Color'}`,
    price,
    confidence: product.price_confidence_status || 'unknown',
    configCount: flags.configs.length,
    configNote: flags.fullSet ? 'Full set' : flags.bundle ? 'Bundle' : 'Options',
    readinessLabel: readiness.label,
    readinessTone: readiness.tone,
    reviewChips: chips,
  };
}

export default async function AdminProductsPage() {
  const [{ rows, error }, reviewEvents] = await Promise.all([getProducts(), getReviewEvents()]);
  const readinessRows = rows.map((product) => ({ product, readiness: readinessStatus(product, productEvents(product, reviewEvents)) }));
  const tableRows = readinessRows.map(({ product, readiness }) => productRow(product, readiness));
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
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Interactive v4 catalog control table with readiness filters from v4 flags and admin review events.</p>
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

      <AdminProductsFilterClient rows={tableRows} />
    </section>
  </main>;
}
