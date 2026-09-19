// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { AdminQueueQuickReviewClient } from '@/components/AdminQueueQuickReviewClient';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MEDIA_QA_LIMIT = 500;

async function loadProducts(): Promise<{ rows: StorefrontProduct[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_CARD_SELECT)
    .limit(MEDIA_QA_LIMIT);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as StorefrontProduct[] };
}

function mediaIssues(product: StorefrontProduct) {
  const issues: string[] = [];
  const mediaCount = Number(product.media_count || 0);
  if (!product.primary_image_url) issues.push('Нет главного изображения');
  if (!product.secondary_image_url && !product.hover_image_url && !product.has_video && mediaCount < 2) issues.push('Нет второго изображения или видео');
  if (mediaCount > 0 && mediaCount < 4) issues.push('Мало изображений в галерее');
  if (product.primary_image_url && !product.primary_image_alt) issues.push('Нет ALT-текста');
  return issues;
}

function galleryDepth(product: StorefrontProduct) {
  const count = Number(product.media_count || 0);
  if (count >= 8) return 'Хорошо';
  if (count >= 4) return 'Нормально';
  if (count >= 2) return 'Мало';
  return 'Слабо';
}

function Chip({ children, tone = 'neutral' }) {
  const className = tone === 'danger'
    ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
      : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>;
}

export default async function AdminMediaQaPage({ searchParams }: { searchParams: Promise<{ q?: string; issue?: string; page?: string }> }) {
  const params = await searchParams;
  const { rows, error } = await loadProducts();
  const q = String(params.q || '').trim().toLowerCase();
  const issueFilter = String(params.issue || 'all');
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 36;

  const issueNeedle: Record<string, string> = {
    primary: 'Нет главного изображения',
    secondary: 'Нет второго изображения или видео',
    gallery: 'Мало изображений в галерее',
    alt: 'Нет ALT-текста',
  };

  const qaRows = rows
    .map((product) => ({ product, issues: mediaIssues(product) }))
    .filter((row) => row.issues.length)
    .filter(({ product, issues }) => {
      const haystack = [productTitle(product), productSlug(product), worldLabel(product)]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      const matchesQuery = !q || haystack.includes(q);
      const requiredIssue = issueNeedle[issueFilter];
      const matchesIssue = !requiredIssue || issues.includes(requiredIssue);
      return matchesQuery && matchesIssue;
    })
    .sort((a, b) => {
      const aPrimary = a.issues.includes('Нет главного изображения') ? 0 : 1;
      const bPrimary = b.issues.includes('Нет главного изображения') ? 0 : 1;
      return aPrimary - bPrimary || b.issues.length - a.issues.length || productTitle(a.product).localeCompare(productTitle(b.product), 'en');
    });

  const pageCount = Math.max(1, Math.ceil(qaRows.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const visibleQaRows = qaRows.slice((page - 1) * pageSize, page * pageSize);

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (issueFilter !== 'all') next.set('issue', issueFilter);
    if (nextPage > 1) next.set('page', String(nextPage));
    const query = next.toString();
    return query ? `/admin/media?${query}` : '/admin/media';
  };

  const missingPrimary = rows.filter((product) => !product.primary_image_url).length;
  const missingHover = rows.filter((product) => !product.secondary_image_url && !product.hover_image_url && !product.has_video && Number(product.media_count || 0) < 2).length;
  const thinGallery = rows.filter((product) => Number(product.media_count || 0) > 0 && Number(product.media_count || 0) < 4).length;
  const hasVideo = rows.filter((product) => product.has_video || product.video_url).length;

  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">Товары · медиа</div>
          <h1>Проверка медиа</h1>
          <p>Очередь визуальной готовности товара: главное изображение, второе медиа, глубина галереи, ALT и видео. Показываем только реальные проблемы текущего контракта.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin" className="owner-button">Панель магазина <ArrowUpRight size={13} /></Link>
          <Link href="/admin/products" className="owner-button">Товары <ArrowUpRight size={13} /></Link>
        </div>
      </header>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
        <div className="owner-summary-cell"><strong>{missingPrimary}</strong><span>Нет главного изображения</span></div>
        <div className="owner-summary-cell"><strong>{missingHover}</strong><span>Нет второго изображения / видео</span></div>
        <div className="owner-summary-cell"><strong>{thinGallery}</strong><span>Слишком мало медиа</span></div>
        <div className="owner-summary-cell"><strong>{hasVideo}</strong><span>Товаров уже имеют видео</span></div>
      </section>

      <form action="/admin/media" className="owner-card" style={{ marginBottom: '16px' }}>
        <div className="grid gap-3 md:grid-cols-[1fr_280px_auto] md:items-end">
          <label>
            <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск товара</div>
            <input name="q" defaultValue={q} className="field" placeholder="название, slug, категория" />
          </label>
          <label>
            <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Проблема</div>
            <select name="issue" defaultValue={issueFilter} className="field">
              <option value="all">Все проблемы</option>
              <option value="primary">Нет главного изображения</option>
              <option value="secondary">Нет второго изображения / видео</option>
              <option value="gallery">Мало изображений</option>
              <option value="alt">Нет ALT-текста</option>
            </select>
          </label>
          <button type="submit" className="owner-button primary">Применить</button>
        </div>
        <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
          <span>В очереди: {qaRows.length}</span>
          <span>Показано: {visibleQaRows.length}</span>
          <Link href="/admin/media">Сбросить</Link>
        </div>
      </form>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleQaRows.map(({ product, issues }) => {
          const slug = productSlug(product);
          return <article key={product.canonical_product_id} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
            <Link href={`/admin/products/${slug}`} className="group block">
              <div className="relative aspect-[4/5] bg-black/30 overflow-hidden">
                {product.primary_image_url ? <img src={product.primary_image_url} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" /> : <div className="h-full w-full grid place-items-center text-[var(--smoke)] text-sm">Нет изображения</div>}
                {product.secondary_image_url || product.hover_image_url ? <img src={product.hover_image_url || product.secondary_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" /> : null}
                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">{issues.slice(0,2).map((issue) => <Chip key={issue} tone={issue.includes('Нет ') ? 'danger' : 'warning'}>{issue}</Chip>)}</div>
              </div>
              <div className="p-5">
                <div className="text-bone text-[16px] leading-snug line-clamp-2">{productTitle(product)}</div>
                <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{worldLabel(product)} · {product.category_label || product.product_type || 'Товар'} · {product.canonical_color_label || product.color || 'Цвет'}</div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-[rgba(216,214,211,.10)] bg-black/15 p-2"><div className="eyebrow-dim mb-1">Медиа</div><div className="font-price text-bone text-[18px] leading-none">{Number(product.media_count || 0)}</div></div>
                  <div className="rounded-lg border border-[rgba(216,214,211,.10)] bg-black/15 p-2"><div className="eyebrow-dim mb-1">Глубина</div><div className="font-price text-bone text-[18px] leading-none">{galleryDepth(product)}</div></div>
                  <div className="rounded-lg border border-[rgba(216,214,211,.10)] bg-black/15 p-2"><div className="eyebrow-dim mb-1">Видео</div><div className="font-price text-bone text-[18px] leading-none">{product.has_video || product.video_url ? 'Есть' : 'Нет'}</div></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {issues.map((issue) => <Chip key={issue} tone={issue.includes('Нет ') ? 'danger' : 'warning'}>{issue}</Chip>)}
                </div>
              </div>
            </Link>
            <div className="px-5 pb-5">
              <AdminQueueQuickReviewClient productSlug={slug} canonicalProductId={product.canonical_product_id} sourceRoute="/admin/media" approvedEventType="media_checked" subjectType="media" approvedLabel="Медиа проверены" />
            </div>
          </article>;
        })}

        {!qaRows.length ? <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-6 text-[13px] text-[var(--bone-dim)]">Нет товаров, требующих проверки медиа.</div> : null}
      </div>
    </div>
  </main>;
}
