// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, FileSearch, ImageIcon, Link2, SearchCheck, Shapes } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontConfiguration, StorefrontProduct } from '@/lib/types';

export const revalidate = 300;

const SEO_LIMIT = 250;

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

async function loadProducts(): Promise<{ rows: StorefrontProduct[]; error?: string }> {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { rows: [], error: getMissingSupabaseEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_CARD_SELECT)
    .limit(SEO_LIMIT);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as StorefrontProduct[] };
}

function seoIssues(product: StorefrontProduct) {
  const issues: string[] = [];
  const title = productTitle(product);
  const slug = productSlug(product);
  const configs = parseConfigurations(product.configurations);

  if (!slug || slug === String(product.canonical_product_id || '')) issues.push('Weak slug');
  if (!title || title.length < 28) issues.push('Thin title/H1');
  if (title.length > 140) issues.push('Long title');
  if (!product.primary_image_url) issues.push('Missing primary image');
  if (!product.primary_image_alt) issues.push('Missing image alt');
  if (!product.category_label && !product.product_type) issues.push('Missing category signal');
  if (!product.canonical_color_label && !product.color) issues.push('Missing color signal');
  if (!worldLabel(product) || worldLabel(product) === 'Product') issues.push('Weak world/context');
  if (!configs.length) issues.push('No configurations');
  if (product.price_confidence_status === 'unverified') issues.push('Unverified price');
  if (product.needs_label_review) issues.push('Label review blocks SEO');

  return issues;
}

function readinessScore(product: StorefrontProduct) {
  const score = Math.max(0, 100 - seoIssues(product).length * 12);
  if (score >= 85) return { score, label: 'Ready', tone: 'ok' };
  if (score >= 65) return { score, label: 'Needs polish', tone: 'warning' };
  return { score, label: 'Blocked', tone: 'danger' };
}

function Chip({ children, tone = 'neutral' }) {
  const className = tone === 'danger'
    ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
      : tone === 'ok'
        ? 'border-[rgba(216,214,211,.18)] text-[var(--bone)] bg-[rgba(255,255,255,.04)]'
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

export default async function AdminSeoPage() {
  const { rows, error } = await loadProducts();
  const seoRows = rows
    .map((product) => ({ product, issues: seoIssues(product), readiness: readinessScore(product) }))
    .sort((a, b) => a.readiness.score - b.readiness.score)
    .slice(0, 160);

  const blocked = rows.filter((product) => readinessScore(product).tone === 'danger').length;
  const missingAlt = rows.filter((product) => !product.primary_image_alt).length;
  const weakSlug = rows.filter((product) => !productSlug(product) || productSlug(product) === String(product.canonical_product_id || '')).length;
  const ready = rows.filter((product) => readinessScore(product).tone === 'ok').length;

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.12),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Admin · SEO Readiness</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>SEO readiness</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Первый контрольный слой перед SEO collections, Google/OpenAI feeds и product graph: title/H1, slug, image alt, category/color/context signals, configurations and price confidence.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin" className="btn-ghost">Admin cockpit <ArrowUpRight size={13} /></Link>
          <Link href="/admin/products" className="btn-ghost">Products <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Metric icon={SearchCheck} label="SEO ready" value={ready} note="Products with strong first-pass readiness score." />
        <Metric icon={FileSearch} label="Blocked" value={blocked} note="Products blocked by data quality issues." />
        <Metric icon={ImageIcon} label="Missing alt" value={missingAlt} note="Primary image alt missing or empty." />
        <Metric icon={Link2} label="Weak slug" value={weakSlug} note="Slug missing or falling back to ID-like value." />
      </div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
        <div className="grid grid-cols-[76px_1.5fr_0.7fr_1.3fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.22em] text-[var(--smoke)]">
          <div>Image</div>
          <div>Product / signals</div>
          <div>Score</div>
          <div>SEO blockers</div>
        </div>
        <div className="divide-y divide-[rgba(216,214,211,.08)]">
          {seoRows.map(({ product, issues, readiness }) => <Link key={product.canonical_product_id} href={`/shop/${productSlug(product)}`} className="grid grid-cols-[76px_1.5fr_0.7fr_1.3fr] gap-4 items-center px-5 py-4 hover:bg-[rgba(212,178,106,.045)] transition-colors">
            <div className="relative h-20 w-16 rounded-lg overflow-hidden bg-black/30 border border-[rgba(216,214,211,.10)]">
              {product.primary_image_url ? <img src={product.primary_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
            </div>
            <div>
              <div className="text-bone text-[15px] leading-snug line-clamp-2">{productTitle(product)}</div>
              <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{worldLabel(product)} · {product.category_label || product.product_type || 'No category'} · {product.canonical_color_label || product.color || 'No color'}</div>
              <div className="mt-2 text-[11px] text-[var(--bone-dim)]">/{productSlug(product)}</div>
            </div>
            <div>
              <div className="font-price text-gold-grad text-[28px] leading-none">{readiness.score}</div>
              <div className="mt-2"><Chip tone={readiness.tone}>{readiness.label}</Chip></div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {issues.slice(0, 6).map((issue) => <Chip key={issue} tone={issue.includes('Missing') || issue.includes('Blocked') || issue.includes('Unverified') ? 'danger' : 'warning'}>{issue}</Chip>)}
              {!issues.length ? <Chip tone="ok">OK</Chip> : null}
            </div>
          </Link>)}
          {!seoRows.length ? <div className="p-6 text-[13px] text-[var(--bone-dim)]">No SEO rows returned from v4.</div> : null}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[rgba(212,178,106,.18)] bg-[rgba(212,178,106,.045)] p-5">
        <div className="flex items-center gap-2 eyebrow-gold mb-2"><Shapes size={14} /> Next SEO layer</div>
        <p className="text-[13px] leading-relaxed text-[var(--bone-dim)]">Следующий уровень после этого экрана: collection graph по Part / Color / Occasion / Style, OpenAI/Google merchant feeds и canonical product-schema. Пока это read-only readiness, без автогенерации SEO-текста.</p>
      </div>
    </section>
  </main>;
}
