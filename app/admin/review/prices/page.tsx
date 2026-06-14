// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, BadgePercent, Calculator, CircleDollarSign, WalletCards } from 'lucide-react';
import { AdminQueueQuickReviewClient } from '@/components/AdminQueueQuickReviewClient';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4, formatPrice, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontConfiguration, StorefrontProduct } from '@/lib/types';

export const revalidate = 300;

const PRICE_REVIEW_LIMIT = 250;

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

function money(value: number | null | undefined, currency = 'EUR') {
  return value == null ? '—' : formatPrice(value, currency);
}

function configPrice(config: StorefrontConfiguration) {
  return config.display_price_amount ?? config.sale_price_amount ?? config.price_amount ?? config.price ?? config.amount ?? config.min_price ?? null;
}

function labelText(config: StorefrontConfiguration) {
  return config.public_label || config.configuration_label || config.configuration_name || config.option_value || config.title || config.label || 'Option';
}

function needsPriceReview(product: StorefrontProduct) {
  const configs = parseConfigurations(product.configurations);
  return Boolean(
    product.needs_price_review ||
    product.price_confidence_status === 'unverified' ||
    product.has_unverified_discount ||
    configs.some((config) => config.price_confidence_status === 'unverified' || config.has_fallback_price || configPrice(config) == null)
  );
}

async function loadProducts(): Promise<{ rows: StorefrontProduct[]; error?: string }> {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { rows: [], error: getMissingSupabaseEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_CARD_SELECT)
    .limit(PRICE_REVIEW_LIMIT);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as StorefrontProduct[] };
}

function Chip({ children, tone = 'neutral' }) {
  const className = tone === 'danger'
    ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
      : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>;
}

function Metric({ label, value, note, icon: Icon }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
    <div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div>
    <div className="font-price text-gold-grad text-[38px] leading-none">{value}</div>
    <div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div>
  </div>;
}

export default async function AdminPriceReviewPage() {
  const { rows, error } = await loadProducts();
  const reviewRows = rows
    .filter(needsPriceReview)
    .slice(0, 160);

  const unverifiedProducts = rows.filter((product) => product.price_confidence_status === 'unverified' || product.needs_price_review).length;
  const fallbackConfigs = rows.reduce((sum, product) => sum + parseConfigurations(product.configurations).filter((config) => config.has_fallback_price).length, 0);
  const missingConfigPrices = rows.reduce((sum, product) => sum + parseConfigurations(product.configurations).filter((config) => configPrice(config) == null).length, 0);
  const unverifiedDiscounts = rows.filter((product) => product.has_unverified_discount).length;

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.12),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Admin Review · Prices</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Price review</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Очередь проверки цен перед запуском payment, feeds и SEO. Здесь видно unverified confidence, fallback prices, missing configuration prices и full set vs component sum.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin" className="btn-ghost">Admin cockpit <ArrowUpRight size={13} /></Link>
          <Link href="/admin/products" className="btn-ghost">Products <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Metric icon={WalletCards} label="Unverified" value={unverifiedProducts} note="Products with unverified or review price status." />
        <Metric icon={CircleDollarSign} label="Fallback configs" value={fallbackConfigs} note="Configurations using fallback price logic." />
        <Metric icon={Calculator} label="Missing prices" value={missingConfigPrices} note="Configurations without a detected price." />
        <Metric icon={BadgePercent} label="Discount flags" value={unverifiedDiscounts} note="Products with unverified discount state." />
      </div>

      <div className="space-y-4">
        {reviewRows.map((product) => {
          const currency = product.currency || 'EUR';
          const configs = parseConfigurations(product.configurations);
          const flaggedConfigs = configs.filter((config) => config.price_confidence_status === 'unverified' || config.has_fallback_price || configPrice(config) == null).slice(0, 6);
          const fullSetPrice = product.full_set_display_price_amount;
          const componentSum = product.component_sum_display_price_amount;
          const savings = product.full_set_savings_amount;
          const adminHref = `/admin/products/${productSlug(product)}`;
          return <article key={product.canonical_product_id} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="grid grid-cols-[76px_1fr_auto] gap-4 items-start">
              <div className="relative h-24 w-[76px] rounded-lg overflow-hidden bg-black/30 border border-[rgba(216,214,211,.10)]">
                {product.primary_image_url ? <img src={product.primary_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
              </div>
              <div>
                <Link href={adminHref} className="text-bone text-[17px] leading-snug hover:text-[var(--gold-warm)] transition-colors">{productTitle(product)}</Link>
                <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{worldLabel(product)} · {product.category_label || product.product_type || 'Product'} · {product.canonical_color_label || product.color || 'Color'}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Chip tone="warning">{product.price_confidence_status || 'unknown price'}</Chip>
                  {product.needs_price_review ? <Chip tone="danger">Needs price review</Chip> : null}
                  {product.has_unverified_discount ? <Chip tone="danger">Unverified discount</Chip> : null}
                </div>
                <AdminQueueQuickReviewClient productSlug={productSlug(product)} canonicalProductId={product.canonical_product_id} sourceRoute="/admin/review/prices" approvedEventType="price_review_approved" subjectType="price" approvedLabel="Mark price reviewed" />
              </div>
              <Link href={adminHref} className="btn-ghost px-4 py-3 text-[10px]">Review <ArrowUpRight size={12} /></Link>
            </div>

            <div className="mt-5 grid md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
                <div className="eyebrow-dim mb-2">Full set</div>
                <div className="font-price text-bone text-[22px] leading-none">{money(fullSetPrice, currency)}</div>
              </div>
              <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
                <div className="eyebrow-dim mb-2">Component sum</div>
                <div className="font-price text-bone text-[22px] leading-none">{money(componentSum, currency)}</div>
              </div>
              <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
                <div className="eyebrow-dim mb-2">Savings</div>
                <div className="font-price text-gold-grad text-[22px] leading-none">{money(savings, currency)}</div>
              </div>
            </div>

            <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {flaggedConfigs.map((config, index) => <div key={config.configuration_id || `${product.canonical_product_id}-${index}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
                <div className="eyebrow-dim mb-2">Configuration price</div>
                <div className="text-bone text-[14px] leading-snug">{labelText(config)}</div>
                <div className="mt-2 font-price text-gold-grad text-[21px] leading-none">{money(configPrice(config), config.currency || currency)}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {config.price_confidence_status === 'unverified' ? <Chip tone="warning">Unverified</Chip> : null}
                  {config.has_fallback_price ? <Chip tone="danger">Fallback price</Chip> : null}
                  {configPrice(config) == null ? <Chip tone="danger">Missing price</Chip> : null}
                </div>
              </div>)}
              {!flaggedConfigs.length ? <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 text-[13px] text-[var(--bone-dim)]">Product-level price flag only. No flagged configuration rows in current payload.</div> : null}
            </div>
          </article>;
        })}

        {!reviewRows.length ? <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-6 text-[13px] text-[var(--bone-dim)]">No price review rows returned from v4.</div> : null}
      </div>
    </section>
  </main>;
}
