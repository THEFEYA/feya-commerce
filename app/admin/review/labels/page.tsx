// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { AdminQueueQuickReviewClient } from '@/components/AdminQueueQuickReviewClient';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
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
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

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

export default async function AdminLabelReviewPage({ searchParams }: { searchParams: Promise<{ q?: string; reason?: string; page?: string }> }) {
  const params = await searchParams;
  const { rows, error } = await loadProducts();
  const q = String(params.q || '').trim().toLowerCase();
  const reasonFilter = String(params.reason || 'all');
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 40;

  const allReviewRows = rows
    .map((product) => ({ product, configs: parseConfigurations(product.configurations), reasons: labelReviewReasons(product) }))
    .filter((row) => row.reasons.length);

  const reasonMap: Record<string, string> = {
    product: 'Product label review',
    russian: 'Russian raw source label exists',
    public_russian: 'Russian public label flag',
    config: 'Configuration label review',
    missing: 'No configurations returned',
  };

  const reviewRows = allReviewRows.filter(({ product, reasons }) => {
    const haystack = [productTitle(product), productSlug(product), worldLabel(product), product.category_label, product.product_type]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');
    const matchesQuery = !q || haystack.includes(q);
    const requiredReason = reasonMap[reasonFilter];
    const matchesReason = !requiredReason || reasons.includes(requiredReason);
    return matchesQuery && matchesReason;
  }).sort((a, b) => {
    const aDanger = a.reasons.some((reason) => reasonTone(reason) === 'danger') ? 0 : 1;
    const bDanger = b.reasons.some((reason) => reasonTone(reason) === 'danger') ? 0 : 1;
    return aDanger - bDanger || b.reasons.length - a.reasons.length || productTitle(a.product).localeCompare(productTitle(b.product), 'en');
  });

  const configReviewCount = allReviewRows.reduce((sum, row) => sum + row.configs.filter((config) => config.needs_label_review || config.has_russian_raw_label || !config.public_label).length, 0);
  const russianRawCount = allReviewRows.reduce((sum, row) => sum + row.configs.filter((config) => config.has_russian_raw_label).length, 0);

  const pageCount = Math.max(1, Math.ceil(reviewRows.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const visibleReviewRows = reviewRows.slice((page - 1) * pageSize, page * pageSize);

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (reasonFilter !== 'all') next.set('reason', reasonFilter);
    if (nextPage > 1) next.set('page', String(nextPage));
    const query = next.toString();
    return query ? `/admin/review/labels?${query}` : '/admin/review/labels';
  };

  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">Товары · названия</div>
          <h1>Проверка названий</h1>
          <p>Проверяем публичные названия вариантов, чтобы служебные подписи, внутренние исходники и непонятные значения не попадали на витрину и в SEO.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin" className="owner-button">Панель магазина <ArrowUpRight size={13} /></Link>
          <Link href="/admin/products" className="owner-button">Товары <ArrowUpRight size={13} /></Link>
        </div>
      </header>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
        <div className="owner-summary-cell"><strong>{allReviewRows.length}</strong><span>Товаров в очереди</span></div>
        <div className="owner-summary-cell"><strong>{configReviewCount}</strong><span>Опций требуют проверки</span></div>
        <div className="owner-summary-cell"><strong>{russianRawCount}</strong><span>Опций с русским исходником</span></div>
        <div className="owner-summary-cell"><strong>{rows.length}</strong><span>Товаров проверено в срезе</span></div>
      </section>

      <form action="/admin/review/labels" className="owner-card" style={{ marginBottom: '16px' }}>
        <div className="grid gap-3 md:grid-cols-[1fr_280px_auto] md:items-end">
          <label>
            <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск товара</div>
            <input name="q" defaultValue={q} className="field" placeholder="название, slug, категория" />
          </label>
          <label>
            <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Причина проверки</div>
            <select name="reason" defaultValue={reasonFilter} className="field">
              <option value="all">Все причины</option>
              <option value="russian">Русский исходный текст</option>
              <option value="public_russian">Русская публичная подпись</option>
              <option value="config">Проверка названия опции</option>
              <option value="product">Проверка названия товара</option>
              <option value="missing">Нет вариантов</option>
            </select>
          </label>
          <button type="submit" className="owner-button primary">Применить</button>
        </div>
        <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
          <span>После фильтра: {reviewRows.length}</span>
          <span>Показано: {visibleReviewRows.length}</span>
          <Link href="/admin/review/labels">Сбросить</Link>
        </div>
      </form>

      <div className="space-y-4">
        {visibleReviewRows.map(({ product, configs, reasons }) => {
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

            <details className="owner-disclosure owner-disclosure-section" style={{ marginTop: '14px' }}>
              <summary>
                <span><strong>Проблемные опции</strong><small>Показать исходные подписи и причины проверки</small></span>
                <span className="owner-section-kicker">{flaggedConfigs.length}</span>
              </summary>
              <div className="owner-disclosure-body grid md:grid-cols-2 gap-3">
              {flaggedConfigs.map((config, index) => <div key={config.configuration_id || `${product.canonical_product_id}-${index}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
                <div className="eyebrow-dim mb-2">Опция</div>
                <div className="text-bone text-[14px] leading-snug">{labelText(config)}</div>
                <div className="mt-2 text-[11px] leading-relaxed text-[var(--bone-dim)]">Исходный текст: {rawLabelText(config)}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {!config.public_label ? <Chip tone="danger">Нет публичной подписи</Chip> : null}
                  {config.needs_label_review ? <Chip tone="warning">Нужна проверка</Chip> : null}
                  {config.has_russian_raw_label ? <Chip tone="danger">Русский исходник</Chip> : null}
                  {config.component_code ? <span title={String(config.component_code)}><Chip>Компонент назначен</Chip></span> : null}
                </div>
              </div>)}
              {!flaggedConfigs.length ? <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 text-[13px] text-[var(--bone-dim)]">Есть только флаг на уровне товара. Строк опций для проверки в текущем payload нет.</div> : null}
              </div>
            </details>
          </article>;
        })}

        {!reviewRows.length ? <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-6 text-[13px] text-[var(--bone-dim)]">По текущему фильтру названий для проверки нет.</div> : null}
      </div>

      {reviewRows.length > pageSize ? (
        <div className="flex items-center justify-between gap-3" style={{ marginTop: '16px' }}>
          <div className="owner-section-kicker">Страница {page} из {pageCount}</div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            {page > 1 ? <Link href={pageHref(page - 1)} className="owner-button">Назад</Link> : <span className="owner-button" style={{ opacity: .4 }}>Назад</span>}
            {page < pageCount ? <Link href={pageHref(page + 1)} className="owner-button">Дальше</Link> : <span className="owner-button" style={{ opacity: .4 }}>Дальше</span>}
          </div>
        </div>
      ) : null}
    </div>
  </main>;
}

