// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Boxes, GitBranch, Layers3, PackageCheck } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontConfiguration, StorefrontProduct } from '@/lib/types';

export const revalidate = 300;

const COMPONENT_REVIEW_LIMIT = 250;

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

function componentReason(config: StorefrontConfiguration) {
  if (!config.component_code) return 'Missing component_code';
  if (!config.component_family) return 'Missing component_family';
  if (config.is_bundle && !config.bundle_component_codes?.length) return 'Bundle without component list';
  return null;
}

async function loadProducts(): Promise<{ rows: StorefrontProduct[]; error?: string }> {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { rows: [], error: getMissingSupabaseEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_CARD_SELECT)
    .limit(COMPONENT_REVIEW_LIMIT);

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

export default async function AdminComponentReviewPage() {
  const { rows, error } = await loadProducts();
  const reviewRows = rows
    .map((product) => {
      const configs = parseConfigurations(product.configurations);
      const flaggedConfigs = configs.filter((config) => componentReason(config));
      return { product, configs, flaggedConfigs };
    })
    .filter((row) => row.flaggedConfigs.length || row.configs.some((config) => config.is_full_set || config.is_bundle))
    .slice(0, 120);

  const missingComponent = reviewRows.reduce((sum, row) => sum + row.configs.filter((config) => !config.component_code).length, 0);
  const missingFamily = reviewRows.reduce((sum, row) => sum + row.configs.filter((config) => config.component_code && !config.component_family).length, 0);
  const fullSets = reviewRows.reduce((sum, row) => sum + row.configs.filter((config) => config.is_full_set).length, 0);
  const bundles = reviewRows.reduce((sum, row) => sum + row.configs.filter((config) => config.is_bundle).length, 0);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.12),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Admin Review · Components</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Component mapping</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Очередь проверки товарной правды: что является отдельным компонентом, что является bundle, что является full set, и где отсутствует component_code/component_family.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin" className="btn-ghost">Admin cockpit <ArrowUpRight size={13} /></Link>
          <Link href="/admin/products" className="btn-ghost">Products <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Metric icon={Boxes} label="Missing code" value={missingComponent} note="Configurations without component_code." />
        <Metric icon={GitBranch} label="Missing family" value={missingFamily} note="Component code exists but family is empty." />
        <Metric icon={PackageCheck} label="Full sets" value={fullSets} note="Sellable full-set options detected in v4." />
        <Metric icon={Layers3} label="Bundles" value={bundles} note="Bundle options requiring component list clarity." />
      </div>

      <div className="space-y-4">
        {reviewRows.map(({ product, configs, flaggedConfigs }) => {
          const visibleConfigs = (flaggedConfigs.length ? flaggedConfigs : configs.filter((config) => config.is_full_set || config.is_bundle)).slice(0, 6);
          return <article key={product.canonical_product_id} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="grid grid-cols-[76px_1fr_auto] gap-4 items-start">
              <div className="relative h-24 w-[76px] rounded-lg overflow-hidden bg-black/30 border border-[rgba(216,214,211,.10)]">
                {product.primary_image_url ? <img src={product.primary_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
              </div>
              <div>
                <Link href={`/shop/${productSlug(product)}`} className="text-bone text-[17px] leading-snug hover:text-[var(--gold-warm)] transition-colors">{productTitle(product)}</Link>
                <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{worldLabel(product)} · {product.category_label || product.product_type || 'Product'} · {product.canonical_color_label || product.color || 'Color'}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {flaggedConfigs.length ? <Chip tone="danger">{flaggedConfigs.length} mapping issues</Chip> : <Chip tone="warning">Set/bundle review</Chip>}
                  <Chip>{configs.length} configurations</Chip>
                </div>
              </div>
              <Link href={`/shop/${productSlug(product)}`} className="btn-ghost px-4 py-3 text-[10px]">Open <ArrowUpRight size={12} /></Link>
            </div>

            <div className="mt-5 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {visibleConfigs.map((config, index) => {
                const reason = componentReason(config);
                return <div key={config.configuration_id || `${product.canonical_product_id}-${index}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
                  <div className="eyebrow-dim mb-2">Configuration</div>
                  <div className="text-bone text-[14px] leading-snug">{labelText(config)}</div>
                  <div className="mt-2 text-[11px] leading-relaxed text-[var(--bone-dim)]">Component: {config.component_code || '—'} · Family: {config.component_family || '—'}</div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {reason ? <Chip tone="danger">{reason}</Chip> : null}
                    {config.is_full_set ? <Chip tone="warning">Full set</Chip> : null}
                    {config.is_bundle ? <Chip tone="warning">Bundle</Chip> : null}
                    {config.bundle_component_codes?.length ? <Chip>{config.bundle_component_codes.length} parts</Chip> : null}
                  </div>
                </div>;
              })}
            </div>
          </article>;
        })}

        {!reviewRows.length ? <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-6 text-[13px] text-[var(--bone-dim)]">No component review rows returned from v4.</div> : null}
      </div>
    </section>
  </main>;
}
