// @ts-nocheck
import Link from 'next/link';
import { AdminQueueQuickReviewClient } from '@/components/AdminQueueQuickReviewClient';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4, productSlug, productTitle } from '@/lib/storefront';
import type { StorefrontConfiguration, StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ROW_LIMIT = 500;

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
  const { data, error } = await supabase.from(STOREFRONT_VIEW_V4).select(STOREFRONT_V4_CARD_SELECT).limit(ROW_LIMIT);
  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as StorefrontProduct[] };
}

function Chip({ children, tone = 'neutral' }) {
  const toneClass = tone === 'danger' ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]' : tone === 'warning' ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]' : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${toneClass}`}>{children}</span>;
}

export default async function AdminComponentReviewPage() {
  const { rows, error } = await loadProducts();
  const reviewRows = rows.map((product) => {
    const configs = parseConfigurations(product.configurations);
    const flaggedConfigs = configs.filter((config) => componentReason(config));
    return { product, configs, flaggedConfigs };
  }).filter((row) => row.flaggedConfigs.length || row.configs.some((config) => config.is_full_set || config.is_bundle)).slice(0, 120);

  const missingCode = reviewRows.reduce((sum, row) => sum + row.configs.filter((config) => !config.component_code).length, 0);
  const missingFamily = reviewRows.reduce((sum, row) => sum + row.configs.filter((config) => config.component_code && !config.component_family).length, 0);
  const fullSets = reviewRows.reduce((sum, row) => sum + row.configs.filter((config) => config.is_full_set).length, 0);
  const bundles = reviewRows.reduce((sum, row) => sum + row.configs.filter((config) => config.is_bundle).length, 0);

  return <main className="min-h-screen bg-[#07070A]"><section className="container-feya pt-10 pb-16">
    <div className="mb-7 border-b border-[rgba(216,214,211,.12)] pb-7"><div className="eyebrow-gold mb-3">Admin Review · Components</div><h1 className="text-bone text-[28px] font-medium leading-tight">Component mapping</h1><p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-[var(--bone-dim)]">Data-quality queue for component truth: code, family, bundle and full-set clarity.</p><div className="mt-5 flex gap-3"><Link href="/admin" className="btn-ghost">Admin cockpit</Link><Link href="/admin/products" className="btn-ghost">Products</Link></div></div>
    {error ? <div className="mb-6 rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)]">{error}</div> : null}
    <div className="mb-8 grid grid-cols-4 gap-4"><div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-2">Missing code</div><div className="text-bone text-[28px]">{missingCode}</div></div><div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-2">Missing family</div><div className="text-bone text-[28px]">{missingFamily}</div></div><div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-2">Full sets</div><div className="text-bone text-[28px]">{fullSets}</div></div><div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-2">Bundles</div><div className="text-bone text-[28px]">{bundles}</div></div></div>
    <div className="space-y-4">{reviewRows.map(({ product, configs, flaggedConfigs }) => { const slug = productSlug(product); const visibleConfigs = (flaggedConfigs.length ? flaggedConfigs : configs.filter((config) => config.is_full_set || config.is_bundle)).slice(0, 6); return <article key={product.canonical_product_id || slug} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="flex items-start justify-between gap-4"><div><Link href={`/admin/products/${slug}`} className="text-bone text-[17px] hover:text-[var(--gold-warm)]">{productTitle(product)}</Link><div className="mt-3 flex flex-wrap gap-1.5">{flaggedConfigs.length ? <Chip tone="danger">{flaggedConfigs.length} issues</Chip> : <Chip tone="warning">Set/bundle review</Chip>}<Chip>{configs.length} configurations</Chip></div><AdminQueueQuickReviewClient productSlug={slug} canonicalProductId={product.canonical_product_id} sourceRoute="/admin/review/components" approvedEventType="component_mapping_checked" subjectType="component" approvedLabel="Mark component checked" /></div><Link href={`/admin/products/${slug}`} className="btn-ghost px-4 py-2 text-[10px]">Review</Link></div><div className="mt-5 grid md:grid-cols-2 xl:grid-cols-3 gap-3">{visibleConfigs.map((config, index) => { const reason = componentReason(config); return <div key={config.configuration_id || `${slug}-${index}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4"><div className="eyebrow-dim mb-2">Configuration</div><div className="text-bone text-[14px] leading-snug">{labelText(config)}</div><div className="mt-2 text-[11px] text-[var(--bone-dim)]">Code: {config.component_code || '—'} · Family: {config.component_family || '—'}</div><div className="mt-3 flex flex-wrap gap-1.5">{reason ? <Chip tone="danger">{reason}</Chip> : null}{config.is_full_set ? <Chip tone="warning">Full set</Chip> : null}{config.is_bundle ? <Chip tone="warning">Bundle</Chip> : null}</div></div>; })}</div></article>; })}{!reviewRows.length ? <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-6 text-[13px] text-[var(--bone-dim)]">No component review rows.</div> : null}</div>
  </section></main>;
}
