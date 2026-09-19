// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { AdminQueueQuickReviewClient } from '@/components/AdminQueueQuickReviewClient';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontConfiguration, StorefrontProduct } from '@/lib/types';
import { seoIssueLabel, seoReadinessLabel } from '@/lib/adminDisplayRu';

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
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

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

function readinessState(issues: string[]) {
  if (issues.length <= 1) return { label: 'Ready', tone: 'ok', rank: 2 };
  if (issues.length <= 3) return { label: 'Needs polish', tone: 'warning', rank: 1 };
  return { label: 'Blocked', tone: 'danger', rank: 0 };
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

export default async function AdminSeoPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string; page?: string }> }) {
  const params = await searchParams;
  const { rows, error } = await loadProducts();
  const q = String(params.q || '').trim().toLowerCase();
  const stateFilter = String(params.state || 'attention');
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 75;

  const seoRows = rows
    .map((product) => {
      const issues = seoIssues(product);
      return { product, issues, readiness: readinessState(issues) };
    });

  const blocked = seoRows.filter((row) => row.readiness.tone === 'danger').length;
  const missingAlt = rows.filter((product) => !product.primary_image_alt).length;
  const weakSlug = rows.filter((product) => !productSlug(product) || productSlug(product) === String(product.canonical_product_id || '')).length;
  const ready = seoRows.filter((row) => row.readiness.tone === 'ok').length;

  const filteredRows = seoRows
    .filter((row) => {
      const haystack = [productTitle(row.product), productSlug(row.product), worldLabel(row.product), row.product.category_label, row.product.product_type]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      const matchesQuery = !q || haystack.includes(q);
      const state = row.readiness.label;
      const matchesState =
        stateFilter === 'all' ||
        (stateFilter === 'attention' && state !== 'Ready') ||
        state === stateFilter;
      return matchesQuery && matchesState;
    })
    .sort((a, b) => a.readiness.rank - b.readiness.rank || b.issues.length - a.issues.length || productTitle(a.product).localeCompare(productTitle(b.product), 'en'));

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (stateFilter !== 'attention') next.set('state', stateFilter);
    if (nextPage > 1) next.set('page', String(nextPage));
    const query = next.toString();
    return query ? `/admin/seo?${query}` : '/admin/seo';
  };

  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">SEO · базовая готовность товара</div>
          <h1>SEO-готовность</h1>
          <p>Детерминированная проверка обязательных товарных сигналов: заголовок, адрес страницы, ALT, категория, цвет, контекст, варианты и точность цены. Это не SEO-рейтинг и не прогноз позиции в Google.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin/seo-keywords" className="owner-button">SEO-ключи <ArrowUpRight size={13} /></Link>
          <Link href="/admin/products" className="owner-button">Товары <ArrowUpRight size={13} /></Link>
        </div>
      </header>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
        <div className="owner-summary-cell"><strong>{blocked}</strong><span>Товаров заблокированы базовыми проблемами</span></div>
        <div className="owner-summary-cell"><strong>{missingAlt}</strong><span>Нет ALT главного изображения</span></div>
        <div className="owner-summary-cell"><strong>{weakSlug}</strong><span>Слабый или технический адрес страницы</span></div>
        <div className="owner-summary-cell"><strong>{ready}</strong><span>Базовые проверки пройдены</span></div>
      </section>

      <form action="/admin/seo" className="owner-card" style={{ marginBottom: '14px' }}>
        <div className="grid gap-3 md:grid-cols-[1fr_280px_auto] md:items-end">
          <label>
            <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск товара</div>
            <input name="q" defaultValue={q} className="field" placeholder="название, slug, категория…" />
          </label>
          <label>
            <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Состояние</div>
            <select name="state" defaultValue={stateFilter} className="field">
              <option value="attention">Требует внимания</option>
              <option value="Blocked">Заблокировано</option>
              <option value="Needs polish">Нужно доработать</option>
              <option value="Ready">Базовые проверки пройдены</option>
              <option value="all">Все</option>
            </select>
          </label>
          <button type="submit" className="owner-button primary">Применить</button>
        </div>
        <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
          <span>После фильтра: {filteredRows.length}</span>
          <span>Показано: {visibleRows.length}</span>
          <Link href="/admin/seo">Сбросить</Link>
        </div>
      </form>

      <div className="rounded-xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
        <div className="grid grid-cols-[76px_1.5fr_0.7fr_1.3fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.22em] text-[var(--smoke)]">
          <div>Фото</div>
          <div>Товар / признаки</div>
          <div>Состояние</div>
          <div>SEO-проблемы</div>
        </div>
        <div className="divide-y divide-[rgba(216,214,211,.08)]">
          {visibleRows.map(({ product, issues, readiness }) => {
            const slug = productSlug(product);
            return <article key={product.canonical_product_id} className="px-5 py-4 hover:bg-[rgba(212,178,106,.035)] transition-colors">
              <Link href={`/admin/products/${slug}`} className="grid grid-cols-[76px_1.5fr_0.7fr_1.3fr] gap-4 items-center">
                <div className="relative h-20 w-16 rounded-lg overflow-hidden bg-black/30 border border-[rgba(216,214,211,.10)]">
                  {product.primary_image_url ? <img src={product.primary_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
                </div>
                <div>
                  <div className="text-bone text-[15px] leading-snug line-clamp-2">{productTitle(product)}</div>
                  <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{worldLabel(product)} · {product.category_label || product.product_type || 'Категория не указана'} · {product.canonical_color_label || product.color || 'Цвет не указан'}</div>
                  <div className="mt-2 text-[11px] text-[var(--bone-dim)]">/{slug}</div>
                </div>
                <div><Chip tone={readiness.tone}>{seoReadinessLabel(readiness.label)}</Chip><div className="mt-2 text-[11px] text-[var(--bone-dim)]">{issues.length} проверок требуют внимания</div></div>
                <div className="flex flex-wrap gap-1.5">
                  {issues.slice(0, 6).map((issue) => <Chip key={issue} tone={issue.includes('Missing') || issue.includes('Blocked') || issue.includes('Unverified') ? 'danger' : 'warning'}>{seoIssueLabel(issue)}</Chip>)}
                  {!issues.length ? <Chip tone="ok">OK</Chip> : null}
                </div>
              </Link>
              <AdminQueueQuickReviewClient productSlug={slug} canonicalProductId={product.canonical_product_id} sourceRoute="/admin/seo" approvedEventType="seo_ready_checked" subjectType="seo" approvedLabel="Отметить SEO готовым" />
            </article>;
          })}
          {!visibleRows.length ? <div className="p-6 text-[13px] text-[var(--bone-dim)]">По текущему фильтру товаров для проверки SEO нет.</div> : null}
        </div>
      </div>

      <div className="owner-card is-info" style={{ marginTop: '18px' }}>
        <div className="owner-status is-info">Следующий уровень</div>
        <p className="owner-card-copy">После базовой готовности товар переходит к ключевым запросам, смысловым группам, коллекциям и технической индексации. Никакая из этих проверок не публикует SEO автоматически.</p>
      </div>

      {filteredRows.length > pageSize ? (
        <div className="flex items-center justify-between gap-3" style={{ marginTop: '14px' }}>
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
