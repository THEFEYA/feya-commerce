// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { getContentStage, type ContentStageLabel } from '@/lib/admin-pipeline';
import { adminReadinessLabel, contentStageLabel } from '@/lib/adminDisplayRu';
import { getProductEvents, getProductFlags, getProductReadiness, type AdminReviewEvent } from '@/lib/admin-readiness';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CONTENT_PRODUCTS_LIMIT = 500;

async function loadProducts() {
  const supabase = getAdminReadClient();
  if (!supabase) return { products: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_CARD_SELECT)
    .limit(CONTENT_PRODUCTS_LIMIT);

  if (error) return { products: [], error: error.message };
  return { products: (data || []) as StorefrontProduct[], error: null };
}

async function loadReviewEvents(): Promise<AdminReviewEvent[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('feya_commerce_v_admin_review_events_v1')
    .select('review_event_id,event_type,event_status,product_slug,canonical_product_id,created_at')
    .limit(1000);

  if (error) return [];
  return (data || []) as AdminReviewEvent[];
}

function Chip({ children, tone = 'neutral' }) {
  const className = tone === 'danger'
    ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
      : tone === 'success'
        ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]'
        : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>;
}

export default async function ContentPreparationPage({ searchParams }: { searchParams: Promise<{ q?: string; stage?: string; page?: string }> }) {
  const params = await searchParams;
  const [{ products, error }, reviewEvents] = await Promise.all([loadProducts(), loadReviewEvents()]);
  const q = String(params.q || '').trim().toLowerCase();
  const stageFilter = String(params.stage || 'attention');
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 75;

  const rows = products.map((product) => {
    const readiness = getProductReadiness(product, getProductEvents(product, reviewEvents));
    const stage = getContentStage(product, readiness);
    const flags = getProductFlags(product);
    return { product, readiness, stage, flags };
  });

  const counts = rows.reduce((acc, row) => {
    acc[row.stage.label] = (acc[row.stage.label] || 0) + 1;
    return acc;
  }, {} as Record<ContentStageLabel, number>);

  const stageOrder: Record<ContentStageLabel, number> = { 'Blocked': 0, 'Data Not Ready': 1, 'Needs Content Inputs': 2, 'Can Draft Content': 3, 'Can Review Content': 4 };
  const attentionStages = new Set<ContentStageLabel>(['Blocked', 'Data Not Ready', 'Needs Content Inputs']);

  const filteredRows = rows
    .filter((row) => {
      const haystack = [productTitle(row.product), productSlug(row.product), worldLabel(row.product), row.product.category_label, row.product.product_type]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      const matchesQuery = !q || haystack.includes(q);
      const matchesStage =
        stageFilter === 'all' ||
        (stageFilter === 'attention' && attentionStages.has(row.stage.label)) ||
        row.stage.label === stageFilter;
      return matchesQuery && matchesStage;
    })
    .sort((a, b) => (stageOrder[a.stage.label] || 99) - (stageOrder[b.stage.label] || 99) || productTitle(a.product).localeCompare(productTitle(b.product), 'en'));

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (stageFilter !== 'attention') next.set('stage', stageFilter);
    if (nextPage > 1) next.set('page', String(nextPage));
    const query = next.toString();
    return query ? `/admin/content?${query}` : '/admin/content';
  };

  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">Товары · подготовка контента</div>
          <h1>Контент</h1>
          <p>Показываем, какие товары уже можно передавать в SEO-контент, а где сначала нужно закрыть факты, цены, компоненты или медиа. Автоматической публикации здесь нет.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin/seo-engine/studio" className="owner-button primary">SEO-студия <ArrowUpRight size={13} /></Link>
          <Link href="/admin/launch" className="owner-button">Запуск <ArrowUpRight size={13} /></Link>
        </div>
      </header>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
        <div className="owner-summary-cell"><strong>{counts.Blocked || 0}</strong><span>Контент заблокирован</span></div>
        <div className="owner-summary-cell"><strong>{(counts['Data Not Ready'] || 0) + (counts['Needs Content Inputs'] || 0)}</strong><span>Сначала нужны данные / медиа</span></div>
        <div className="owner-summary-cell"><strong>{counts['Can Draft Content'] || 0}</strong><span>Можно готовить черновик</span></div>
        <div className="owner-summary-cell"><strong>{counts['Can Review Content'] || 0}</strong><span>Можно проверять качество</span></div>
      </section>

      <form action="/admin/content" className="owner-card" style={{ marginBottom: '14px' }}>
        <div className="grid gap-3 md:grid-cols-[1fr_280px_auto] md:items-end">
          <label>
            <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск товара</div>
            <input name="q" defaultValue={q} className="field" placeholder="название, slug, категория" />
          </label>
          <label>
            <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Этап</div>
            <select name="stage" defaultValue={stageFilter} className="field">
              <option value="attention">Требует внимания</option>
              <option value="Blocked">Заблокировано</option>
              <option value="Data Not Ready">Данные не готовы</option>
              <option value="Needs Content Inputs">Не хватает входных данных</option>
              <option value="Can Draft Content">Можно готовить черновик</option>
              <option value="Can Review Content">Можно проверять</option>
              <option value="all">Все этапы</option>
            </select>
          </label>
          <button type="submit" className="owner-button primary">Применить</button>
        </div>
        <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
          <span>После фильтра: {filteredRows.length}</span>
          <span>Показано: {visibleRows.length}</span>
          <Link href="/admin/content">Сбросить</Link>
        </div>
      </form>

      <div className="rounded-xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
        <div className="sticky top-[64px] z-10 grid grid-cols-[76px_1.5fr_1fr_1fr_1.1fr] gap-4 px-5 py-3 border-b border-[rgba(216,214,211,.10)] bg-[#0f0f15]/95 backdrop-blur-xl text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">
          <div>Фото</div><div>Товар</div><div>Этап контента</div><div>Готовность</div><div>Входные данные</div>
        </div>
        <div className="divide-y divide-[rgba(216,214,211,.08)]">
          {visibleRows.map(({ product, readiness, stage, flags }) => {
            const slug = productSlug(product);
            return <Link key={product.canonical_product_id || slug} href={`/admin/products/${slug}`} className="grid grid-cols-[76px_1.5fr_1fr_1fr_1.1fr] gap-4 items-center px-5 py-4 hover:bg-[rgba(212,178,106,.04)] transition-colors">
              <div className="relative h-20 w-16 rounded-lg overflow-hidden bg-black/30 border border-[rgba(216,214,211,.10)]">{product.primary_image_url ? <img src={product.primary_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div>
              <div><div className="text-bone text-[15px] leading-snug line-clamp-2">{productTitle(product)}</div><div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{worldLabel(product)} · {product.category_label || product.product_type || 'Товар'} · {product.canonical_color_label || product.color || 'Цвет не указан'}</div></div>
              <div><Chip tone={stage.tone}>{contentStageLabel(stage.label)}</Chip><div className="mt-2 text-[11px] leading-relaxed text-[var(--bone-dim)]">{stage.note}</div></div>
              <div><Chip tone={readiness.tone}>{adminReadinessLabel(readiness.label)}</Chip></div>
              <div className="flex flex-wrap gap-1.5">
                {flags.configs.length ? <Chip>{flags.configs.length} вариантов</Chip> : <Chip tone="danger">Нет вариантов</Chip>}
                {product.primary_image_url ? <Chip>Есть фото</Chip> : <Chip tone="danger">Нет фото</Chip>}
                {product.primary_image_alt ? <Chip>Alt</Chip> : <Chip tone="warning">Нет ALT</Chip>}
              </div>
            </Link>;
          })}
        </div>
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
