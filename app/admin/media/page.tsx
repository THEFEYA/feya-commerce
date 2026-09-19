// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Film, ImageIcon, Images, Sparkles } from 'lucide-react';
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

function Metric({ label, value, note, icon: Icon }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
    <div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div>
    <div className="font-price text-gold-grad text-[38px] leading-none">{value}</div>
    <div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div>
  </div>;
}

export default async function AdminMediaQaPage() {
  const { rows, error } = await loadProducts();
  const qaRows = rows
    .map((product) => ({ product, issues: mediaIssues(product) }))
    .filter((row) => row.issues.length)
    .slice(0, 160);

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

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {qaRows.map(({ product, issues }) => {
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
