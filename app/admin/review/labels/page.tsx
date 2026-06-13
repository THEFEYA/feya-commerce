// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Languages, Search, Tags } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontConfiguration, StorefrontProduct } from '@/lib/types';

export const revalidate = 300;

const LABEL_REVIEW_LIMIT = 250;

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

function labelText(config: StorefrontConfiguration) {
  return config.public_label || config.configuration_label || config.configuration_name || config.option_value || config.title || config.label || 'Option';
}

function rawLabelText(config: StorefrontConfiguration) {
  return config.raw_option_text || config.raw_option_value || config.configuration_name || config.option_value || '—';
}

function labelReviewReasons(product: StorefrontProduct) {
  const configs = parseConfigurations(product.configurations);
  const reasons: string[] = [];
  if (product.needs_label_review) reasons.push('Product label review');
  if (product.has_russian_public_label) reasons.push('Russian public label flag');
  if (configs.some((config) => config.needs_label_review)) reasons.push('Configuration label review');
  if (configs.some((config) => config.has_russian_raw_label)) reasons.push('Russian raw source label exists');
  if (!configs.length) reasons.push('No configurations returned');
  return reasons;
}

async function loadProducts(): Promise<{ rows: StorefrontProduct[]; error?: string }> {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { rows: [], error: getMissingSupabaseEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_CARD_SELECT)
    .limit(LABEL_REVIEW_LIMIT);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as StorefrontProduct[] };
}

function Chip({ children, tone = 'neutral' }) {
  const className = tone === 'warning'
    ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
    : tone === 'danger'
      ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
      : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>;
}

export default async function AdminLabelReviewPage() {
  const { rows, error } = await loadProducts();
  const reviewRows = rows
    .map((product) => ({ product, configs: parseConfigurations(product.configurations), reasons: labelReviewReasons(product) }))
    .filter((row) => row.reasons.length)
    .slice(0, 120);

  const configReviewCount = reviewRows.reduce((sum, row) => sum + row.configs.filter((config) => config.needs_label_review || config.has_russian_raw_label || !config.public_label).length, 0);
  const russianRawCount = reviewRows.reduce((sum, row) => sum + row.configs.filter((config) => config.has_russian_raw_label).length, 0);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.12),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Admin Review · Labels</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Label review</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Очередь проверки buyer-facing названий вариантов. Смысл: не выпускать raw collector labels, русские внутренние подписи и непонятные варианты в SEO, PDP, cart и future feeds.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin" className="btn-ghost">Admin cockpit <ArrowUpRight size={13} /></Link>
          <Link href="/admin/products" className="btn-ghost">Products <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Metric icon={Tags} label="Products queued" value={reviewRows.length} note="Products with label review reasons in current v4 slice." />
        <Metric icon={Languages} label="Config rows" value={configReviewCount} note="Configuration labels needing review or missing public label." />
        <Metric icon={Search} label="Russian raw" value={russianRawCount} note="Raw source still exists internally; not buyer-facing." />
        <Metric icon={Tags} label="Loaded" value={rows.length} note="Products read from v4 safe contract." />
      </div>

      <div className="space-y-4">
        {reviewRows.map(({ product, configs, reasons }) => {
          const flaggedConfigs = configs.filter((config) => config.needs_label_review || config.has_russian_raw_label || !config.public_label).slice(0, 4);
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
                  {reasons.map((reason) => <Chip key={reason} tone={reason.includes('Russian') ? 'danger' : 'warning'}>{reason}</Chip>)}
                </div>
              </div>
              <Link href={adminHref} className="btn-ghost px-4 py-3 text-[10px]">Review <ArrowUpRight size={12} /></Link>
            </div>

            <div className="mt-5 grid md:grid-cols-2 gap-3">
              {flaggedConfigs.map((config, index) => <div key={config.configuration_id || `${product.canonical_product_id}-${index}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
                <div className="eyebrow-dim mb-2">Configuration</div>
                <div className="text-bone text-[14px] leading-snug">{labelText(config)}</div>
                <div className="mt-2 text-[11px] leading-relaxed text-[var(--bone-dim)]">Raw/source: {rawLabelText(config)}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {!config.public_label ? <Chip tone="danger">Missing public label</Chip> : null}
                  {config.needs_label_review ? <Chip tone="warning">Needs review</Chip> : null}
                  {config.has_russian_raw_label ? <Chip tone="danger">Russian raw</Chip> : null}
                  {config.component_code ? <Chip>{config.component_code}</Chip> : null}
                </div>
              </div>)}
              {!flaggedConfigs.length ? <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 text-[13px] text-[var(--bone-dim)]">Product-level label flag only. No flagged configuration rows in current payload.</div> : null}
            </div>
          </article>;
        })}

        {!reviewRows.length ? <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-6 text-[13px] text-[var(--bone-dim)]">No label review rows returned from v4.</div> : null}
      </div>
    </section>
  </main>;
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
