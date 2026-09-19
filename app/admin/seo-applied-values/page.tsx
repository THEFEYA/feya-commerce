// @ts-nocheck
import Link from 'next/link';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ROW_LIMIT = 1000;

type Row = {
  change_set_id: string;
  product_slug: string;
  target_field: string;
  applied_value: string | null;
  status: string;
};

async function loadRows() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { rows: [] as Row[], error: 'Нет серверного доступа к базе для админки.' };
  const { data, error } = await supabase
    .from('feya_commerce_v_admin_seo_applied_values_v1')
    .select('change_set_id,product_slug,target_field,applied_value,status')
    .limit(ROW_LIMIT);
  if (error) return { rows: [] as Row[], error: error.message };
  return { rows: (data || []) as Row[], error: null };
}

function fieldLabel(field: string) {
  if (field === 'seo_title') return 'SEO-заголовок';
  if (field === 'meta_description') return 'Meta description';
  if (field === 'h1') return 'H1';
  if (field === 'primary_image_alt') return 'ALT главного изображения';
  if (field === 'collection_hint') return 'Коллекция';
  if (field === 'description_outline') return 'План описания';
  return 'SEO-поле';
}

function statusLabel(value: string) {
  if (value === 'applied') return 'Применено внутри SEO-процесса';
  if (value === 'approved') return 'Одобрено';
  if (value === 'pending') return 'Ждёт проверки';
  if (value === 'rejected') return 'Отклонено';
  return value || '—';
}

export default async function SeoAppliedValuesPage({ searchParams }: { searchParams: Promise<{ q?: string; field?: string; page?: string }> }) {
  const params = await searchParams;
  const { rows, error } = await loadRows();
  const q = String(params.q || '').trim().toLowerCase();
  const fieldFilter = String(params.field || 'all');
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 100;
  const products = new Set(rows.map((row) => row.product_slug));
  const fields = new Set(rows.map((row) => row.target_field));

  const filteredRows = rows
    .filter((row) => {
      const haystack = [row.product_slug, row.target_field, row.applied_value]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      const matchesQuery = !q || haystack.includes(q);
      const matchesField = fieldFilter === 'all' || row.target_field === fieldFilter;
      return matchesQuery && matchesField;
    })
    .sort((a, b) => String(a.product_slug).localeCompare(String(b.product_slug)) || String(a.target_field).localeCompare(String(b.target_field)));

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (fieldFilter !== 'all') next.set('field', fieldFilter);
    if (nextPage > 1) next.set('page', String(nextPage));
    const query = next.toString();
    return query ? `/admin/seo-applied-values?${query}` : '/admin/seo-applied-values';
  };

  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">Результаты · SEO-значения</div>
          <h1>Применённые SEO-значения</h1>
          <p>Показываем значения, уже отмеченные как применённые внутри SEO-процесса. Этот экран сам ничего не публикует на витрине.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin/seo-change-sets" className="owner-button">Очередь SEO-правок</Link>
          <Link href="/admin/seo-apply" className="owner-button">Создать SEO-правки</Link>
        </div>
      </header>
    {error ? <div className="mb-6 rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)] p-5 text-[var(--bone-dim)]">{error}</div> : null}
    <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
      <div className="owner-summary-cell"><strong>{products.size}</strong><span>Товаров имеют применённые SEO-значения</span></div>
      <div className="owner-summary-cell"><strong>{rows.length}</strong><span>Значений зафиксировано</span></div>
      <div className="owner-summary-cell"><strong>{fields.size}</strong><span>Типов SEO-полей</span></div>
    </section>
    <form action="/admin/seo-applied-values" className="owner-card" style={{ marginBottom: '14px' }}>
      <div className="grid gap-3 md:grid-cols-[1fr_260px_auto] md:items-end">
        <label>
          <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск</div>
          <input name="q" defaultValue={q} className="field" placeholder="товар или значение" />
        </label>
        <label>
          <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>SEO-поле</div>
          <select name="field" defaultValue={fieldFilter} className="field">
            <option value="all">Все поля</option>
            {Array.from(fields).sort().map((field) => <option key={field} value={field}>{fieldLabel(field)}</option>)}
          </select>
        </label>
        <button type="submit" className="owner-button primary">Применить</button>
      </div>
      <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
        <span>После фильтра: {filteredRows.length}</span>
        <span>Показано: {visibleRows.length}</span>
        <Link href="/admin/seo-applied-values">Сбросить</Link>
      </div>
    </form>

    <div className="rounded-xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
      <div className="sticky top-[64px] z-10 grid grid-cols-[1fr_.7fr_.8fr_1.4fr] gap-4 px-5 py-3 border-b border-[rgba(216,214,211,.10)] bg-[#0f0f15]/95 backdrop-blur-xl text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]"><div>Товар</div><div>Статус</div><div>Поле</div><div>Значение</div></div>
      <div className="divide-y divide-[rgba(216,214,211,.08)]">{visibleRows.length ? visibleRows.map((row) => <div key={`${row.change_set_id}-${row.target_field}`} className="grid grid-cols-[1fr_.7fr_.8fr_1.4fr] gap-4 px-5 py-4"><Link href={`/admin/products/${row.product_slug}`} className="text-bone text-[13px] hover:text-[var(--gold-warm)]">/{row.product_slug}</Link><div className="text-[12px] text-[var(--bone-dim)]">{statusLabel(row.status)}</div><div className="text-[12px] text-[var(--bone-dim)]" title={row.target_field}>{fieldLabel(row.target_field)}</div><div className="text-[12px] leading-relaxed text-bone line-clamp-4">{row.applied_value || '—'}</div></div>) : <div className="p-6 text-[13px] text-[var(--bone-dim)]">По текущему фильтру применённых значений нет.</div>}</div>
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
