// @ts-nocheck
import Link from 'next/link';
import {
  AdminProductComponentAssertionClient,
  type ComponentFamilyOption,
  type FixedComponentAssertion,
} from '@/components/AdminProductComponentAssertionClient';
import { AdminQueueQuickReviewClient } from '@/components/AdminQueueQuickReviewClient';
import {
  ADMIN_COMPONENT_TRUTH_SELECT,
  CANONICAL_PRODUCT_TRUTH_VIEW,
  componentEvidenceLabel,
  getCanonicalComponentTruthDiagnostic,
} from '@/lib/adminComponentTruth';
import {
  ADMIN_PRODUCT_BUILDER_DETAIL_SELECT,
  ADMIN_PRODUCT_BUILDER_DETAIL_VIEW,
  toBuilderStorefrontProduct,
} from '@/lib/admin-product-builder-detail';
import {
  ADMIN_PRODUCT_CATALOG_FALLBACK_SELECT,
  ADMIN_PRODUCT_CATALOG_FALLBACK_VIEW,
  toCatalogFallbackStorefrontProduct,
} from '@/lib/admin-product-catalog-fallback';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient, getSupabaseServiceClient } from '@/lib/supabase';
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

async function loadProducts(canonicalProductId?: string): Promise<{ rows: StorefrontProduct[]; error?: string }> {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { rows: [], error: getMissingSupabaseEnvMessage() };

  if (canonicalProductId) {
    const builderResult = await supabase
      .from(ADMIN_PRODUCT_BUILDER_DETAIL_VIEW)
      .select(ADMIN_PRODUCT_BUILDER_DETAIL_SELECT)
      .eq('canonical_product_id', canonicalProductId)
      .maybeSingle();

    if (builderResult.data && !builderResult.error) {
      return { rows: [toBuilderStorefrontProduct(builderResult.data)] };
    }

    const fallbackResult = await supabase
      .from(ADMIN_PRODUCT_CATALOG_FALLBACK_VIEW)
      .select(ADMIN_PRODUCT_CATALOG_FALLBACK_SELECT)
      .eq('canonical_product_id', canonicalProductId)
      .maybeSingle();

    if (fallbackResult.error) {
      return {
        rows: [],
        error: [
          builderResult.error?.message,
          fallbackResult.error.message,
        ].filter(Boolean).join(' · '),
      };
    }

    return {
      rows: fallbackResult.data
        ? [toCatalogFallbackStorefrontProduct(fallbackResult.data)]
        : [],
      error: builderResult.error?.message,
    };
  }

  const query = supabase.from(STOREFRONT_VIEW_V4).select(STOREFRONT_V4_CARD_SELECT);
  const { data, error } = await query.limit(ROW_LIMIT);
  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as StorefrontProduct[] };
}

async function loadComponentTruth(canonicalProductId?: string) {
  const supabase = getSupabaseServiceClient() || getSupabaseReadClient();
  if (!supabase) return { rows: [], error: getMissingSupabaseEnvMessage() };
  let query = supabase
    .from(CANONICAL_PRODUCT_TRUTH_VIEW)
    .select(ADMIN_COMPONENT_TRUTH_SELECT);
  if (canonicalProductId) query = query.eq('canonical_product_id', canonicalProductId);
  const { data, error } = await query.limit(canonicalProductId ? 1 : ROW_LIMIT);
  if (error) return { rows: [], error: error.message };
  return { rows: data || [] };
}

async function loadAssertionEditor(canonicalProductId?: string) {
  if (!canonicalProductId) {
    return {
      componentFamilies: [] as ComponentFamilyOption[],
      approvedAssertions: [] as FixedComponentAssertion[],
    };
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return {
      componentFamilies: [] as ComponentFamilyOption[],
      approvedAssertions: [] as FixedComponentAssertion[],
      error: getMissingSupabaseEnvMessage(),
    };
  }

  const [familyResult, assertionResult] = await Promise.all([
    supabase
      .from('feya_commerce_component_families')
      .select('component_family_id,canonical_name')
      .eq('active_flag', true)
      .order('canonical_name'),
    supabase
      .from('feya_commerce_product_component_assertions_v1')
      .select('product_component_assertion_id,component_family_id')
      .eq('canonical_product_id', canonicalProductId)
      .eq('presence_scope', 'fixed_base')
      .eq('active_flag', true)
      .eq('review_status', 'approved'),
  ]);

  const error = familyResult.error?.message || assertionResult.error?.message;
  const componentFamilies = (familyResult.data || []) as ComponentFamilyOption[];
  const familyNames = new Map(
    componentFamilies.map((family) => [family.component_family_id, family.canonical_name]),
  );
  const approvedAssertions = (assertionResult.data || []).map((assertion) => ({
    ...assertion,
    component_family: familyNames.get(assertion.component_family_id) || 'Unknown component',
  })) as FixedComponentAssertion[];

  return { componentFamilies, approvedAssertions, error };
}

function Chip({ children, tone = 'neutral' }) {
  const toneClass = tone === 'danger' ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]' : tone === 'warning' ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]' : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${toneClass}`}>{children}</span>;
}

type PageProps = {
  searchParams: Promise<{ product_id?: string | string[] }>;
};

export default async function AdminComponentReviewPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const focusedProductId = Array.isArray(query.product_id) ? query.product_id[0] : query.product_id;
  const [productResult, truthResult, assertionEditor] = await Promise.all([
    loadProducts(focusedProductId),
    loadComponentTruth(focusedProductId),
    loadAssertionEditor(focusedProductId),
  ]);
  const { rows, error } = productResult;
  const truthByProductId = new Map(
    truthResult.rows.map((row) => [String(row.canonical_product_id || ''), row]),
  );
  const reviewRows = rows.map((product) => {
    const configs = parseConfigurations(product.configurations);
    const truthDiagnostic = getCanonicalComponentTruthDiagnostic(
      truthByProductId.get(String(product.canonical_product_id || '')),
    );
    return { product, configs, truthDiagnostic };
  }).filter((row) => {
    if (focusedProductId) return row.product.canonical_product_id === focusedProductId;
    return row.truthDiagnostic.blockers.length
      || row.configs.some((config) => config.is_full_set || config.is_bundle);
  }).slice(0, 120);

  const variantChecks = reviewRows.reduce((sum, row) => sum + row.truthDiagnostic.variantReviewFacts.length, 0);
  const sourceVariations = reviewRows.reduce((sum, row) => sum + row.truthDiagnostic.sourceVariations.length, 0);
  const fullSets = reviewRows.reduce((sum, row) => sum + row.configs.filter((config) => config.is_full_set).length, 0);
  const truthBlocked = reviewRows.filter((row) => row.truthDiagnostic.blockers.length).length;

  return <main className="min-h-screen bg-[#07070A]"><section className="container-feya pt-10 pb-16">
    <div className="mb-7 border-b border-[rgba(216,214,211,.12)] pb-7"><div className="eyebrow-gold mb-3">Admin Review · Components</div><h1 className="text-bone text-[28px] font-medium leading-tight">Component mapping</h1><p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-[var(--bone-dim)]">Data-quality queue for canonical Product Truth: confirmed composition, source options, price ownership, unresolved facts and review blockers. Review events are an audit trail and never repair canonical product data.</p><div className="mt-5 flex gap-3"><Link href="/admin" className="btn-ghost">Admin cockpit</Link><Link href="/admin/products" className="btn-ghost">Products</Link>{focusedProductId ? <Link href="/admin/review/components" className="btn-ghost">Show full queue</Link> : null}</div></div>
    {error || truthResult.error || assertionEditor.error ? <div className="mb-6 rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)]">{error || `Canonical Product Truth: ${truthResult.error || assertionEditor.error}`}</div> : null}
    <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4"><div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-2">Truth blocked</div><div className="text-bone text-[28px]">{truthBlocked}</div></div><div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-2">Variant checks</div><div className="text-bone text-[28px]">{variantChecks}</div></div><div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-2">Source variations</div><div className="text-bone text-[28px]">{sourceVariations}</div></div><div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-2">Full sets</div><div className="text-bone text-[28px]">{fullSets}</div></div></div>
    <div className="space-y-4">{reviewRows.map(({ product, configs, truthDiagnostic }) => {
      const slug = productSlug(product);
      const visibleConfigs = configs.filter((config) => config.is_full_set || config.is_bundle).slice(0, 6);
      const truthEvidence = [...truthDiagnostic.reviewBlockers, ...truthDiagnostic.unresolvedFacts].slice(0, 6);
      const approvalDisabled = truthDiagnostic.blockers.length > 0;
      const approvalDisabledReason = !truthDiagnostic.available
        ? 'Canonical Product Truth is unavailable.'
        : approvalDisabled
          ? 'Resolve canonical composition evidence first. Size and color checks remain auditable but do not define components.'
          : '';
      return <article key={product.canonical_product_id || slug} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href={`/admin/products/${slug}`} className="text-bone text-[17px] hover:text-[var(--gold-warm)]">{productTitle(product)}</Link>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {truthDiagnostic.blockers.map((blocker) => <Chip key={blocker} tone="danger">{blocker}</Chip>)}
              <Chip>{configs.length} storefront configurations</Chip>
              <Chip>{truthDiagnostic.includedComponents.length} confirmed components</Chip>
              {truthDiagnostic.variantReviewFacts.length ? <Chip tone="warning">{truthDiagnostic.variantReviewFacts.length} non-blocking variant checks</Chip> : null}
              <Chip>{truthDiagnostic.sourceVariations.length} source variations</Chip>
              <Chip>{truthDiagnostic.optionPriceRows.length} price rows</Chip>
            </div>
            <AdminQueueQuickReviewClient productSlug={slug} canonicalProductId={product.canonical_product_id} sourceRoute="/admin/review/components" approvedEventType="component_mapping_checked" subjectType="component" approvedLabel="Mark component checked" approvalDisabled={approvalDisabled} approvalDisabledReason={approvalDisabledReason} />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {!focusedProductId ? <Link href={`/admin/review/components?product_id=${product.canonical_product_id}`} className="btn-ghost px-4 py-2 text-[10px]">Resolve Product Truth</Link> : null}
            <Link href={`/admin/products/${slug}`} className="btn-ghost px-4 py-2 text-[10px]">Product details</Link>
          </div>
        </div>
        {focusedProductId && product.canonical_product_id ? <div className="mt-5">
          <AdminProductComponentAssertionClient
            canonicalProductId={product.canonical_product_id}
            componentFamilies={assertionEditor.componentFamilies}
            approvedAssertions={assertionEditor.approvedAssertions}
            sourceRoute={`/admin/review/components?product_id=${product.canonical_product_id}`}
          />
        </div> : null}
        {truthEvidence.length ? <div className="mt-5 rounded-xl border border-[rgba(196,64,88,.22)] bg-[rgba(160,32,56,.06)] p-4">
          <div className="eyebrow-dim mb-3">Canonical evidence requiring resolution</div>
          <div className="flex flex-wrap gap-1.5">{truthEvidence.map((item, index) => <Chip key={`${componentEvidenceLabel(item)}-${index}`} tone="danger">{componentEvidenceLabel(item)}</Chip>)}</div>
        </div> : null}
        {truthDiagnostic.variantReviewFacts.length ? <div className="mt-5 rounded-xl border border-[rgba(212,178,106,.24)] bg-[rgba(212,178,106,.05)] p-4">
          <div className="eyebrow-dim mb-2">Variant review · non-blocking for composition</div>
          <p className="text-[11px] leading-relaxed text-[var(--bone-dim)]">Size, color and non-product options remain in the audit trail. They are reviewed in their own queues and cannot become product components.</p>
        </div> : null}
        {visibleConfigs.length ? <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleConfigs.map((config, index) => {
          return <div key={config.configuration_id || `${slug}-${index}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4"><div className="eyebrow-dim mb-2">Storefront component configuration</div><div className="text-bone text-[14px] leading-snug">{labelText(config)}</div><div className="mt-2 text-[11px] text-[var(--bone-dim)]">Code: {config.component_code || '—'} · Family: {config.component_family || '—'}</div><div className="mt-3 flex flex-wrap gap-1.5">{config.is_full_set ? <Chip tone="warning">Full set</Chip> : null}{config.is_bundle ? <Chip tone="warning">Bundle</Chip> : null}</div></div>;
        })}</div> : null}
      </article>;
    })}{!reviewRows.length ? <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-6 text-[13px] text-[var(--bone-dim)]">No component review rows.</div> : null}</div>
  </section></main>;
}
