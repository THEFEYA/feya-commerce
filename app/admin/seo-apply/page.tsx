// @ts-nocheck
import Link from 'next/link';
import { AdminSeoChangeSetCreateClient } from '@/components/AdminSeoChangeSetCreateClient';
import { getMissingSupabaseEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import { buildSeoApplyPreviews, summarizeSeoApplyPreviews } from '@/lib/seo-apply-preview';
import type { AdminReviewEvent } from '@/lib/admin-readiness';
import type { StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SEO_APPLY_PRODUCTS_LIMIT = 500;
const PRODUCT_SELECT = [
  'canonical_product_id',
  'product_slug',
  'card_title',
  'h1',
  'seo_title',
  'meta_description',
  'product_type',
  'material',
  'color',
  'primary_image_url',
  'primary_image_alt',
].join(',');

async function loadProducts() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };
  const { data, error } = await supabase.from(STOREFRONT_VIEW_V4).select(PRODUCT_SELECT).limit(SEO_APPLY_PRODUCTS_LIMIT);
  if (error) return { products: [], error: error.message };
  return { products: (data || []) as StorefrontProduct[], error: null };
}

async function loadReviewEvents(): Promise<AdminReviewEvent[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('feya_commerce_v_admin_review_events_v1').select('review_event_id,event_type,event_status,product_slug,canonical_product_id,created_at').limit(1000);
  if (error) return [];
  return (data || []) as AdminReviewEvent[];
}

function statusLabel(status: string) {
  if (status === 'Pending Approval') return 'Ждёт проверки';
  if (status === 'Ready for Change Set') return 'Можно создать черновик';
  if (status === 'Blocked') return 'Заблокировано';
  return status;
}

function fieldLabel(field: string) {
  if (field === 'seo_title') return 'SEO-заголовок';
  if (field === 'meta_description') return 'Meta description';
  if (field === 'h1') return 'H1';
  if (field === 'primary_image_alt') return 'ALT главного фото';
  if (field === 'collection_hint') return 'Коллекция';
  if (field === 'description_outline') return 'План описания';
  return field;
}

export default async function SeoApplyPreviewPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const params = await searchParams;
  const [{ products, error }, events] = await Promise.all([loadProducts(), loadReviewEvents()]);
  const previews = buildSeoApplyPreviews(products, events);
  const summary = summarizeSeoApplyPreviews(previews);
  const q = String(params.q || '').trim().toLowerCase();
  const statusFilter = String(params.status || 'Ready for Change Set');
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 30;

  const filteredPreviews = previews
    .filter((preview) => {
      const haystack = [preview.title, preview.productSlug]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      const matchesQuery = !q || haystack.includes(q);
      const matchesStatus = statusFilter === 'all' || preview.status === statusFilter;
      return matchesQuery && matchesStatus;
    })
    .sort((a, b) => {
      const rank = (value: string) => value === 'Ready for Change Set' ? 0 : value === 'Pending Approval' ? 1 : value === 'Blocked' ? 2 : 3;
      return rank(a.status) - rank(b.status) || String(a.title || '').localeCompare(String(b.title || ''), 'en');
    });

  const pageCount = Math.max(1, Math.ceil(filteredPreviews.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const visiblePreviews = filteredPreviews.slice((page - 1) * pageSize, page * pageSize);

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (statusFilter !== 'Ready for Change Set') next.set('status', statusFilter);
    if (nextPage > 1) next.set('page', String(nextPage));
    const query = next.toString();
    return query ? `/admin/seo-apply?${query}` : '/admin/seo-apply';
  };

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">SEO · создание правок</div>
            <h1>Создать SEO-правки</h1>
            <p>Предпросмотр изменений для уже подготовленных SEO-полей. Сохранённые строки сначала попадают в ручную очередь проверки и не публикуются автоматически.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/seo-change-sets" className="owner-button primary">Очередь SEO-правок</Link>
            <Link href="/admin/seo-approval" className="owner-button">Проверка SEO</Link>
            <Link href="/admin/seo-export" className="owner-button">SEO-экспорт</Link>
          </div>
        </header>

        {error ? <div className="mb-7 rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)]">{error}</div> : null}

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{summary['Ready for Change Set'] || 0}</strong><span>Товаров можно отправить в очередь правок</span></div>
          <div className="owner-summary-cell"><strong>{summary.Blocked || 0}</strong><span>Заблокировано</span></div>
          <div className="owner-summary-cell"><strong>{summary.changedFields || 0}</strong><span>SEO-полей отличаются</span></div>
          <div className="owner-summary-cell"><strong>{summary.total || 0}</strong><span>Товаров проверено в предпросмотре</span></div>
        </section>

        <form action="/admin/seo-apply" className="owner-card" style={{ marginBottom: '16px' }}>
          <div className="grid gap-3 md:grid-cols-[1fr_260px_auto] md:items-end">
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск товара</div>
              <input name="q" defaultValue={q} className="field" placeholder="название или slug" />
            </label>
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Готовность</div>
              <select name="status" defaultValue={statusFilter} className="field">
                <option value="Ready for Change Set">Можно создать правку</option>
                <option value="Pending Approval">Ждёт проверки</option>
                <option value="Blocked">Заблокировано</option>
                <option value="all">Все</option>
              </select>
            </label>
            <button type="submit" className="owner-button primary">Применить</button>
          </div>
          <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
            <span>После фильтра: {filteredPreviews.length}</span>
            <span>Показано: {visiblePreviews.length}</span>
            <Link href="/admin/seo-apply">Сбросить</Link>
          </div>
        </form>

        <div className="space-y-4">
          {visiblePreviews.map((preview) => (
            <article key={preview.productSlug} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full border border-[rgba(212,178,106,.30)] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--gold-warm)]">{statusLabel(preview.status)}</span>
                    <span className="inline-flex rounded-full border border-[rgba(212,178,106,.30)] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--gold-warm)]">{preview.fields.filter((field) => field.changed).length} полей изменятся</span>
                  </div>
                  <Link href={`/admin/seo-lab/${preview.productSlug}`} className="text-bone text-[18px] leading-snug hover:text-[var(--gold-warm)]">{preview.title}</Link>
                  <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">/{preview.productSlug}</div>
                </div>
                <Link href={`/admin/products/${preview.productSlug}`} className="btn-ghost px-4 py-2 text-[10px]">Товар</Link>
              </div>

              {preview.blockers.length ? <details className="owner-disclosure owner-disclosure-section" style={{ marginTop: '14px' }}>
                <summary><span><strong>Почему заблокировано</strong><small>{preview.blockers.length} причин</small></span><span className="owner-status is-warning">Проверить</span></summary>
                <div className="owner-disclosure-body text-[12px] leading-relaxed text-[var(--bone-dim)]">{preview.blockers.join(' ')}</div>
              </details> : null}

              <details className="owner-disclosure owner-disclosure-section" style={{ marginTop: '14px' }} open={preview.status === 'Ready for Change Set'}>
                <summary>
                  <span><strong>Изменения полей</strong><small>Сейчас → предлагается</small></span>
                  <span className="owner-section-kicker">{preview.fields.filter((field) => field.changed).length}</span>
                </summary>
                <div className="owner-disclosure-body space-y-2">
                {preview.fields.map((field) => (
                  <div key={field.field} className="grid gap-3 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3 lg:grid-cols-[170px_1fr_1fr_88px]">
                    <div className="eyebrow-dim">{fieldLabel(field.field)}</div>
                    <div className="text-[12px] leading-relaxed text-[var(--bone-dim)]">{field.currentValue || '—'}</div>
                    <div className="text-[12px] leading-relaxed text-bone">{field.proposedValue || '—'}</div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--gold-warm)]">{field.changed ? 'изменить' : 'без изменений'}</div>
                  </div>
                ))}
                </div>
              </details>

              <AdminSeoChangeSetCreateClient productSlug={preview.productSlug} fields={preview.fields} />
            </article>
          ))}
        </div>
        {filteredPreviews.length > pageSize ? (
          <div className="flex items-center justify-between gap-3" style={{ marginTop: '16px' }}>
            <div className="owner-section-kicker">Страница {page} из {pageCount}</div>
            <div className="owner-actions" style={{ marginTop: 0 }}>
              {page > 1 ? <Link href={pageHref(page - 1)} className="owner-button">Назад</Link> : <span className="owner-button" style={{ opacity: .4 }}>Назад</span>}
              {page < pageCount ? <Link href={pageHref(page + 1)} className="owner-button">Дальше</Link> : <span className="owner-button" style={{ opacity: .4 }}>Дальше</span>}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
