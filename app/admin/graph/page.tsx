// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Blocks, CircleDot, Palette, Shirt, Sparkles } from 'lucide-react';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import { buildSeoCollectionCandidates, summarizeSeoGraph, type SeoCollectionCandidate } from '@/lib/seo-product-graph';
import { launchStageLabel } from '@/lib/adminDisplayRu';
import type { AdminReviewEvent } from '@/lib/admin-readiness';
import type { StorefrontProduct } from '@/lib/types';

export const revalidate = 300;

async function loadProducts() {
  const supabase = getAdminReadClient();
  if (!supabase) return { products: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_CARD_SELECT)
    .limit(250);

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

function axisLabel(axis: SeoCollectionCandidate['axis']) {
  if (axis === 'piece') return 'Тип товара';
  if (axis === 'occasion') return 'Событие / сценарий';
  if (axis === 'style') return 'Стиль';
  if (axis === 'color') return 'Цвет';
  return 'Материал';
}

function axisIcon(axis: SeoCollectionCandidate['axis']) {
  if (axis === 'piece') return Shirt;
  if (axis === 'occasion') return CircleDot;
  if (axis === 'style') return Sparkles;
  if (axis === 'color') return Palette;
  return Blocks;
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

export default async function SeoProductGraphPage({ searchParams }: { searchParams: Promise<{ q?: string; axis?: string; page?: string }> }) {
  const params = await searchParams;
  const [{ products, error }, reviewEvents] = await Promise.all([loadProducts(), loadReviewEvents()]);
  const candidates = buildSeoCollectionCandidates(products, reviewEvents);
  const summary = summarizeSeoGraph(candidates);
  const q = String(params.q || '').trim().toLowerCase();
  const axisFilter = String(params.axis || 'all');
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 24;

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesQuery = !q || [candidate.label, candidate.href].some((value) => String(value || '').toLowerCase().includes(q));
    const matchesAxis = axisFilter === 'all' || candidate.axis === axisFilter;
    return matchesQuery && matchesAxis;
  });

  const pageCount = Math.max(1, Math.ceil(filteredCandidates.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const visibleCandidates = filteredCandidates.slice((page - 1) * pageSize, page * pageSize);

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (axisFilter !== 'all') next.set('axis', axisFilter);
    if (nextPage > 1) next.set('page', String(nextPage));
    const query = next.toString();
    return query ? `/admin/graph?${query}` : '/admin/graph';
  };

  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">Рост · связи каталога</div>
          <h1>Товарные связи</h1>
          <p>Кандидаты для будущих коллекций по типу товара, событию, стилю, цвету и материалу. Это внутренняя карта каталога, а не автоматически созданные SEO-страницы.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin/collections" className="owner-button primary">Коллекции <ArrowUpRight size={13} /></Link>
          <Link href="/admin/launch" className="owner-button">Запуск <ArrowUpRight size={13} /></Link>
        </div>
      </header>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
        <div className="owner-summary-cell"><strong>{summary.total || 0}</strong><span>Кандидатов коллекций</span></div>
        <div className="owner-summary-cell"><strong>{summary.readyForFeed || 0}</strong><span>Имеют готовые товары</span></div>
        <div className="owner-summary-cell"><strong>{summary.blocked || 0}</strong><span>Имеют блокировки</span></div>
        <div className="owner-summary-cell"><strong>{(summary.piece || 0) + (summary.style || 0)}</strong><span>Групп по типу товара и стилю</span></div>
      </section>

      <form action="/admin/graph" className="owner-card" style={{ marginBottom: '16px' }}>
        <div className="grid gap-3 md:grid-cols-[1fr_240px_auto] md:items-end">
          <label>
            <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск связи</div>
            <input name="q" defaultValue={q} className="field" placeholder="например: Mirror Looks, Gold" />
          </label>
          <label>
            <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Ось</div>
            <select name="axis" defaultValue={axisFilter} className="field">
              <option value="all">Все оси</option>
              <option value="piece">Тип товара</option>
              <option value="occasion">Событие / сценарий</option>
              <option value="style">Стиль</option>
              <option value="color">Цвет</option>
              <option value="material">Материал</option>
            </select>
          </label>
          <button type="submit" className="owner-button primary">Применить</button>
        </div>
        <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
          <span>После фильтра: {filteredCandidates.length}</span>
          <span>Показано: {visibleCandidates.length}</span>
          <Link href="/admin/graph">Сбросить</Link>
        </div>
      </form>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleCandidates.map((candidate) => {
          const Icon = axisIcon(candidate.axis);
          return <article key={candidate.key} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 eyebrow-gold mb-2"><Icon size={14} /> {axisLabel(candidate.axis)}</div>
                <div className="text-bone text-[18px] leading-tight">{candidate.label}</div>
                <div className="mt-2 text-[11px] text-[var(--bone-dim)]">Будущий URL: {candidate.href}</div>
              </div>
              <Chip>{candidate.productCount} товаров</Chip>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="rounded-lg border border-[rgba(216,214,211,.10)] bg-black/15 p-2"><div className="eyebrow-dim mb-1">SEO</div><div className="font-price text-bone text-[18px]">{candidate.canPrepareSeoCount}</div></div>
              <div className="rounded-lg border border-[rgba(216,214,211,.10)] bg-black/15 p-2"><div className="eyebrow-dim mb-1">Фид</div><div className="font-price text-bone text-[18px]">{candidate.readyForFeedCount}</div></div>
              <div className="rounded-lg border border-[rgba(216,214,211,.10)] bg-black/15 p-2"><div className="eyebrow-dim mb-1">Заблокировано</div><div className="font-price text-bone text-[18px]">{candidate.blockedCount}</div></div>
            </div>

            <div className="space-y-2">
              {candidate.sampleProducts.map((product) => <Link key={`${candidate.key}-${product.slug}`} href={`/admin/products/${product.slug}`} className="grid grid-cols-[42px_1fr] gap-3 rounded-xl border border-[rgba(216,214,211,.09)] bg-black/15 p-2 hover:border-[rgba(212,178,106,.36)] transition-colors">
                <div className="relative h-12 w-10 rounded-md overflow-hidden bg-black/30">{product.imageUrl ? <img src={product.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div>
                <div>
                  <div className="text-bone text-[12px] leading-snug line-clamp-1">{product.title}</div>
                  <div className="mt-1 flex flex-wrap gap-1"><Chip tone={product.launchStage === 'Blocked' ? 'danger' : product.launchStage === 'Can Prepare Feed' ? 'success' : 'warning'}>{launchStageLabel(product.launchStage)}</Chip></div>
                </div>
              </Link>)}
            </div>
          </article>;
        })}
      </div>

      {filteredCandidates.length > pageSize ? (
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
