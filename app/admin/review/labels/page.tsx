// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Languages, Search, Tags } from 'lucide-react';
import { AdminQueueQuickReviewClient } from '@/components/AdminQueueQuickReviewClient';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontConfiguration, StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const LABEL_REVIEW_LIMIT = 500;

const REASON_LABELS: Record<string, string> = {
  'Product label review': 'Проверка названия товара',
  'Russian public label flag': 'Русская публичная подпись',
  'Configuration label review': 'Проверка названия опции',
  'Russian raw source label exists': 'Есть русский исходный текст',
  'No configurations returned': 'Опции не вернулись из storefront contract',
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

function labelText(config: StorefrontConfiguration) {
  return config.public_label || config.configuration_label || config.configuration_name || config.option_value || config.title || config.label || 'Опция';
}

function rawLabelText(config: StorefrontConfiguration) {
  return config.raw_option_text || config.raw_option_value || config.configuration_name || config.option_value || '—';
}

function reasonLabel(reason: string) {
  return REASON_LABELS[reason] || reason;
}

function reasonTone(reason: string) {
  return reason.includes('Russian') || reason.includes('No configurations') ? 'danger' : 'warning';
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
          <div className="eyebrow-gold mb-3">Админка · Проверка названий</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Проверка названий</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Очередь проверки публичных названий вариантов. Цель: не выпускать служебные подписи, внутренние русские тексты и непонятные варианты в SEO, публичную карточку товара, корзину и будущие фиды.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin" className="btn-ghost">Панель контроля <ArrowUpRight size={13} /></Link>
          <Link href="/admin/products" className="btn-ghost">Товары <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Metric icon={Tags} label="Товары в очереди" value={reviewRows.length} note="Товары с причинами для проверки названий в текущем storefront-candidate срезе." />
        <Metric icon={Languages} label="Строки опций" value={configReviewCount} note="Опции без публичной подписи или с причиной для проверки." />
        <Metric icon={Search} label="Русский исходник" value={russianRawCount} note="Исходный текст остаётся только внутри админки, не для покупателя." />
        <Metric icon={Tags} label="Загружено" value={rows.length} note="Товары, прочитанные из storefront contract." />
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
                <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{worldLabel(product)} · {product.category_label || product.product_type || 'Товар'} · {product.canonical_color_label || product.color || 'Цвет'}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {reasons.map((reason) => <Chip key={reason} tone={reasonTone(reason)}>{reasonLabel(reason)}</Chip>)}
                </div>
                <AdminQueueQuickReviewClient productSlug={productSlug(product)} canonicalProductId={product.canonical_product_id} sourceRoute="/admin/review/labels" approvedEventType="label_review_approved" subjectType="label" approvedLabel="Название проверено" />
              </div>
              <Link href={adminHref} className="btn-ghost px-4 py-3 text-[10px]">Проверить <ArrowUpRight size={12} /></Link>
            </div>

            <div className="mt-5 grid md:grid-cols-2 gap-3">
              {flaggedConfigs.map((config, index) => <div key={config.configuration_id || `${product.canonical_product_id}-${index}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
                <div className="eyebrow-dim mb-2">Опция</div>
                <div className="text-bone text-[14px] leading-snug">{labelText(config)}</div>
                <div className="mt-2 text-[11px] leading-relaxed text-[var(--bone-dim)]">Исходный текст: {rawLabelText(config)}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {!config.public_label ? <Chip tone="danger">Нет публичной подписи</Chip> : null}
                  {config.needs_label_review ? <Chip tone="warning">Нужна проверка</Chip> : null}
                  {config.has_russian_raw_label ? <Chip tone="danger">Русский исходник</Chip> : null}
                  {config.component_code ? <Chip>{config.component_code}</Chip> : null}
                </div>
              </div>)}
              {!flaggedConfigs.length ? <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 text-[13px] text-[var(--bone-dim)]">Есть только флаг на уровне товара. Строк опций для проверки в текущем payload нет.</div> : null}
            </div>
          </article>;
        })}

        {!reviewRows.length ? <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-6 text-[13px] text-[var(--bone-dim)]">Строк для проверки названий из storefront contract сейчас нет.</div> : null}
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
