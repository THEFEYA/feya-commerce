// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { AdminQueueQuickReviewClient } from '@/components/AdminQueueQuickReviewClient';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4, formatPrice, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontConfiguration, StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PRICE_REVIEW_LIMIT = 500;

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
  return config.public_label || config.configuration_label || config.configuration_name || config.option_value || config.title || config.label || 'Вариант';
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
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

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

export default async function AdminPriceReviewPage({ searchParams }: { searchParams: Promise<{ q?: string; issue?: string; page?: string }> }) {
  const params = await searchParams;
  const { rows, error } = await loadProducts();
  const q = String(params.q || '').trim().toLowerCase();
  const issueFilter = String(params.issue || 'all');
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 40;

  const allReviewRows = rows.filter(needsPriceReview);
  const reviewRows = allReviewRows.filter((product) => {
    const haystack = [productTitle(product), productSlug(product), worldLabel(product), product.category_label, product.product_type]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');
    const configs = parseConfigurations(product.configurations);
    const hasFallback = configs.some((config) => config.has_fallback_price);
    const hasMissing = configs.some((config) => configPrice(config) == null);
    const hasUnverified = product.price_confidence_status === 'unverified' || product.needs_price_review || configs.some((config) => config.price_confidence_status === 'unverified');
    const matchesIssue =
      issueFilter === 'all' ||
      (issueFilter === 'fallback' && hasFallback) ||
      (issueFilter === 'missing' && hasMissing) ||
      (issueFilter === 'unverified' && hasUnverified) ||
      (issueFilter === 'discount' && Boolean(product.has_unverified_discount));
    return (!q || haystack.includes(q)) && matchesIssue;
  }).sort((a, b) => {
    const score = (product: StorefrontProduct) => {
      const configs = parseConfigurations(product.configurations);
      if (configs.some((config) => configPrice(config) == null)) return 0;
      if (configs.some((config) => config.has_fallback_price)) return 1;
      if (product.has_unverified_discount) return 2;
      return 3;
    };
    return score(a) - score(b) || productTitle(a).localeCompare(productTitle(b), 'en');
  });

  const pageCount = Math.max(1, Math.ceil(reviewRows.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const visibleReviewRows = reviewRows.slice((page - 1) * pageSize, page * pageSize);

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (issueFilter !== 'all') next.set('issue', issueFilter);
    if (nextPage > 1) next.set('page', String(nextPage));
    const query = next.toString();
    return query ? `/admin/review/prices?${query}` : '/admin/review/prices';
  };

  const unverifiedProducts = rows.filter((product) => product.price_confidence_status === 'unverified' || product.needs_price_review).length;
  const fallbackConfigs = rows.reduce((sum, product) => sum + parseConfigurations(product.configurations).filter((config) => config.has_fallback_price).length, 0);
  const missingConfigPrices = rows.reduce((sum, product) => sum + parseConfigurations(product.configurations).filter((config) => configPrice(config) == null).length, 0);
  const unverifiedDiscounts = rows.filter((product) => product.has_unverified_discount).length;

  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">Товары · цены</div>
          <h1>Проверка цен</h1>
          <p>Очередь цен, которые требуют подтверждения перед публикацией, фидами и будущим оформлением заказа. Резервные и отсутствующие цены показываются отдельно.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin" className="owner-button">Панель магазина <ArrowUpRight size={13} /></Link>
          <Link href="/admin/products" className="owner-button">Товары <ArrowUpRight size={13} /></Link>
        </div>
      </header>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
        <div className="owner-summary-cell"><strong>{unverifiedProducts}</strong><span>Товаров нужно проверить</span></div>
        <div className="owner-summary-cell"><strong>{fallbackConfigs}</strong><span>Вариантов с резервной ценой</span></div>
        <div className="owner-summary-cell"><strong>{missingConfigPrices}</strong><span>Вариантов без цены</span></div>
        <div className="owner-summary-cell"><strong>{unverifiedDiscounts}</strong><span>Скидок требуют проверки</span></div>
      </section>

      <form action="/admin/review/prices" className="owner-card" style={{ marginBottom: '16px' }}>
        <div className="grid gap-3 md:grid-cols-[1fr_280px_auto] md:items-end">
          <label>
            <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск товара</div>
            <input name="q" defaultValue={q} className="field" placeholder="название, slug, категория" />
          </label>
          <label>
            <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Проблема</div>
            <select name="issue" defaultValue={issueFilter} className="field">
              <option value="all">Все проблемы</option>
              <option value="missing">Нет цены</option>
              <option value="fallback">Резервная цена</option>
              <option value="unverified">Цена не подтверждена</option>
              <option value="discount">Скидка не подтверждена</option>
            </select>
          </label>
          <button type="submit" className="owner-button primary">Применить</button>
        </div>
        <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
          <span>Всего в очереди: {allReviewRows.length}</span>
          <span>После фильтра: {reviewRows.length}</span>
          <span>Показано: {visibleReviewRows.length}</span>
          <Link href="/admin/review/prices">Сбросить</Link>
        </div>
      </form>

      <div className="space-y-4">
        {visibleReviewRows.map((product) => {
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
                <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{worldLabel(product)} · {product.category_label || product.product_type || 'Товар'} · {product.canonical_color_label || product.color || 'Цвет'}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Chip tone="warning">{product.price_confidence_status === 'verified' ? 'Цена подтверждена' : product.price_confidence_status === 'unverified' ? 'Нужно проверить цену' : product.price_confidence_status || 'Статус цены не определён'}</Chip>
                  {product.needs_price_review ? <Chip tone="danger">Нужно проверить цену</Chip> : null}
                  {product.has_unverified_discount ? <Chip tone="danger">Скидка не подтверждена</Chip> : null}
                </div>
                <AdminQueueQuickReviewClient productSlug={productSlug(product)} canonicalProductId={product.canonical_product_id} sourceRoute="/admin/review/prices" approvedEventType="price_review_approved" subjectType="price" approvedLabel="Цена проверена" />
              </div>
              <Link href={adminHref} className="btn-ghost px-4 py-3 text-[10px]">Проверить <ArrowUpRight size={12} /></Link>
            </div>

            <div className="mt-5 grid md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
                <div className="eyebrow-dim mb-2">Полный комплект</div>
                <div className="font-price text-bone text-[22px] leading-none">{money(fullSetPrice, currency)}</div>
              </div>
              <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
                <div className="eyebrow-dim mb-2">Сумма компонентов</div>
                <div className="font-price text-bone text-[22px] leading-none">{money(componentSum, currency)}</div>
              </div>
              <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
                <div className="eyebrow-dim mb-2">Экономия</div>
                <div className="font-price text-gold-grad text-[22px] leading-none">{money(savings, currency)}</div>
              </div>
            </div>

            <details className="owner-disclosure owner-disclosure-section" style={{ marginTop: '14px' }}>
              <summary>
                <span><strong>Проблемные варианты</strong><small>Резервные, отсутствующие или неподтверждённые цены</small></span>
                <span className="owner-section-kicker">{flaggedConfigs.length}</span>
              </summary>
              <div className="owner-disclosure-body grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {flaggedConfigs.map((config, index) => <div key={config.configuration_id || `${product.canonical_product_id}-${index}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
                <div className="eyebrow-dim mb-2">Цена варианта</div>
                <div className="text-bone text-[14px] leading-snug">{labelText(config)}</div>
                <div className="mt-2 font-price text-gold-grad text-[21px] leading-none">{money(configPrice(config), config.currency || currency)}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {config.price_confidence_status === 'unverified' ? <Chip tone="warning">Не подтверждено</Chip> : null}
                  {config.has_fallback_price ? <Chip tone="danger">Резервная цена</Chip> : null}
                  {configPrice(config) == null ? <Chip tone="danger">Нет цены</Chip> : null}
                </div>
              </div>)}
              {!flaggedConfigs.length ? <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 text-[13px] text-[var(--bone-dim)]">Проблема отмечена только на уровне товара. Отдельных проблемных вариантов сейчас нет.</div> : null}
              </div>
            </details>
          </article>;
        })}

        {!reviewRows.length ? <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-6 text-[13px] text-[var(--bone-dim)]">По текущему фильтру товаров для проверки цены нет.</div> : null}
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
